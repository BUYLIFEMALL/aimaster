import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getValidThreadsAccessToken } from "@/lib/actions/threads";
import { sendTelegramMessage } from "@/lib/telegram/client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

const THIS_PROGRAM_SLUG = "threads-comment-reply";

// stepmail/real_estate_sales/threads/youtube-auto-reply의 CRON_SECRET Bearer 인증 패턴을
// 그대로 재사용. vercel.json에 매일 1회 스케줄로 등록한다.
function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

/**
 * 연결된 모든 쓰레드 계정에 대해 장기 토큰 갱신을 시도해서 실제로 살아있는지 점검한다.
 * 실패(재연결 필요)로 새로 감지된 계정만(중복 알림 방지) 텔레그램으로 안내한다.
 * 실제로 댓글을 읽거나 게시하지 않는, 순수 상태 점검용 cron이라 다른 자동 발송 cron보다
 * 리스크가 낮다.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: accounts, error } = await admin
    .from("th_accounts")
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
      await getValidThreadsAccessToken(admin, account.user_id, account);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message !== "THREADS_RECONNECT_REQUIRED") continue; // 일시적 오류는 다음 점검에서 재시도
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
            text: `⚠️ 쓰레드 계정(@${account.username}) 연결이 끊어졌어요. Threads 댓글자동화 설정 페이지에서 다시 연결해주세요.`,
          });
          notified += 1;
        } catch (sendErr) {
          console.error(`텔레그램 알림 발송 실패 (user ${account.user_id}):`, sendErr);
        }
      }

      await admin
        .from("th_accounts")
        .update({ reconnect_notified_at: new Date().toISOString() })
        .eq("user_id", account.user_id);
    }
  }

  return NextResponse.json({ checked, newlyBroken, notified });
}
