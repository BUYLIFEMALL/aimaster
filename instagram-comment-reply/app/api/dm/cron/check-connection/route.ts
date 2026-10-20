import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getValidInstagramAccessToken } from "@/lib/dmApp/actions/instagram";
import { sendTelegramMessage } from "@/lib/dmApp/telegram/client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

const THIS_PROGRAM_SLUG = "instagram-dm-reply";

// stepmail/real_estate_sales/threads/youtube-auto-reply/instagram-comment-reply의 CRON_SECRET
// Bearer 인증 패턴을 그대로 재사용. vercel.json에 매일 1회 스케줄로 등록한다.
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // v1.15: 비밀값이 비어 있으면 「Bearer undefined」로 통과하던 빈틈을 막는다
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * 연결된 모든 인스타그램 계정에 대해 장기 토큰 갱신을 시도해서 실제로 살아있는지 점검한다.
 * 실패(재연결 필요)로 새로 감지된 계정만(중복 알림 방지) 텔레그램으로 안내한다. DM 수신 자체는
 * 웹훅이 실시간으로 처리하므로, 이 cron은 순수 상태 점검용이라 다른 자동 발송 cron보다
 * 리스크가 낮다.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: accounts, error } = await admin
    .from("dm_accounts")
    .select("user_id, username, access_token, token_expires_at, reconnect_notified_at");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let checked = 0;
  let newlyBroken = 0;
  let notified = 0;

  for (const account of accounts ?? []) {
    checked += 1;
    try {
      await getValidInstagramAccessToken(admin, account.user_id, account);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message !== "INSTAGRAM_RECONNECT_REQUIRED") continue; // 일시적 오류는 다음 점검에서 재시도
      newlyBroken += 1;

      // 이미 이번 끊김에 대해 알림을 보냈으면 또 보내지 않는다.
      if (account.reconnect_notified_at) continue;

      const { data: telegramLink } = await admin
        .from("user_telegram_links")
        .select("bot_token, chat_id")
        .eq("user_id", account.user_id)
        .eq("program_slug", THIS_PROGRAM_SLUG)
        .maybeSingle();

      if (telegramLink) {
        try {
          await sendTelegramMessage({
            botToken: telegramLink.bot_token,
            chatId: telegramLink.chat_id,
            text: `⚠️ 인스타그램 계정(@${account.username}) 연결이 끊어졌어요. INSTA DM답변 자동화 설정 페이지에서 다시 연결해주세요.`,
          });
          notified += 1;
        } catch (sendErr) {
          console.error(`텔레그램 알림 발송 실패 (user ${account.user_id}):`, sendErr);
        }
      }

        await admin
          .from("dm_accounts")
          .update({ reconnect_notified_at: new Date().toISOString() })
          .eq("user_id", account.user_id);
      }
    }

  // 2. 24시간 응답 기한 임박(4시간 이내) 미응답 DM 점검 및 텔레그램 긴급 알림
  let urgentNotified = 0;
  const { data: pendingMessages } = await admin
    .from("dm_messages")
    .select("id, user_id, conversation_id, message_text, created_at")
    .eq("direction", "in")
    .eq("status", "pending_review");

  if (pendingMessages && pendingMessages.length > 0) {
    const convIds = Array.from(new Set(pendingMessages.map((m) => m.conversation_id)));
    const { data: convs } = await admin
      .from("dm_conversations")
      .select("id, user_id, customer_username, last_inbound_at")
      .in("id", convIds);

    const convMap = new Map((convs ?? []).map((c) => [c.id, c]));
    const urgentByUser = new Map<string, Array<{ username: string; remainingMins: number }>>();

    const now = Date.now();
    for (const msg of pendingMessages) {
      const conv = convMap.get(msg.conversation_id);
      if (!conv?.last_inbound_at) continue;

      const inboundTime = new Date(conv.last_inbound_at).getTime();
      const elapsedHours = (now - inboundTime) / (1000 * 60 * 60);
      const remainingHours = 24 - elapsedHours;

      // 4시간 이내로 남았고 만료되지 않은 대화
      if (remainingHours > 0 && remainingHours <= 4) {
        const remainingMins = Math.max(1, Math.floor(remainingHours * 60));
        const userList = urgentByUser.get(conv.user_id) ?? [];
        userList.push({
          username: conv.customer_username || "고객",
          remainingMins,
        });
        urgentByUser.set(conv.user_id, userList);
      }
    }

    for (const [userId, urgentItems] of Array.from(urgentByUser.entries())) {
      const { data: telegramLink } = await admin
        .from("user_telegram_links")
        .select("bot_token, chat_id")
        .eq("user_id", userId)
        .eq("program_slug", THIS_PROGRAM_SLUG)
        .maybeSingle();

      if (telegramLink && urgentItems.length > 0) {
        try {
          const detailLines = urgentItems
            .slice(0, 3)
            .map((item) => `• @${item.username}: 약 ${Math.floor(item.remainingMins / 60)}시간 ${item.remainingMins % 60}분 남음`)
            .join("\n");
          const extraCount = urgentItems.length > 3 ? ` 외 ${urgentItems.length - 3}건` : "";

          await sendTelegramMessage({
            botToken: telegramLink.bot_token,
            chatId: telegramLink.chat_id,
            text: `⚠️ [DM 기한 임박 알림]\n24시간 응답 기한이 4시간 이내로 남은 미답변 DM이 ${urgentItems.length}건 있어요!\n\n${detailLines}${extraCount}\n\n기한이 만료되면 메타 정책상 답변이 불가능하니 지금 바로 승인해 주세요.\n👉 https://instagram-dm-reply.buylife.xyz/conversations`,
          });
          urgentNotified += 1;
        } catch (tgErr) {
          console.error(`텔레그램 기한 임박 알림 발송 실패 (user ${userId}):`, tgErr);
        }
      }
    }
  }

  return NextResponse.json({ checked, newlyBroken, notified, urgentNotified });
}

