"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/dmApp/access";
import { createClient } from "@/lib/supabase/server";
import { deleteTelegramWebhook, findChatIdFromUpdates, sendTelegramMessage, setTelegramWebhook } from "@/lib/dmApp/telegram/client";
import { computeWebhookSecret } from "@/lib/telegram/webhookSecret";
import { SITE_ORIGIN } from "@/lib/dmApp/oauthRedirect";

export interface TelegramActionState {
  error?: string;
  success?: string;
}

// user_telegram_links는 real_estate_sales가 만든 공용 테이블이다(프로그램 접두어 없음,
// docs/PLATFORM_PATTERNS.md §9). 프로그램마다 다른 봇을 연결할 수 있도록 (user_id,
// program_slug) 단위로 스코프된다 — 다른 프로그램에서 이미 텔레그램을 연결한 회원이라도,
// 이 프로그램에서는 별도로 연동해야 한다.
const THIS_PROGRAM_SLUG = "instagram-dm-reply";

export async function connectTelegramAction(
  _prevState: TelegramActionState,
  formData: FormData,
): Promise<TelegramActionState> {
  const user = await requireProgramAccess();
  const botToken = String(formData.get("botToken") ?? "").trim();

  if (!botToken) {
    return { error: "봇 토큰을 입력해주세요." };
  }

  let chatInfo;
  try {
    chatInfo = await findChatIdFromUpdates(botToken);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "연동 확인에 실패했습니다." };
  }

  if (!chatInfo) {
    return {
      error:
        // 2026-10-20 v1.19: 어느 봇의 토큰인지 함께 알려 준다(봇이 여러 개일 때 다른 봇에 메시지를 보내는 실수 방지)
        `아직 봇에게 보낸 메시지를 찾지 못했어요. ${await botNameHint(botToken)}텔레그램에서 그 봇 대화창을 열고 아무 메시지나 보낸 뒤 바로 다시 「연동 확인하기」를 눌러 주세요.${await telegramDiagnosis(botToken)}`,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("user_telegram_links").upsert(
    {
      user_id: user.id,
      program_slug: THIS_PROGRAM_SLUG,
      bot_token: botToken,
      chat_id: chatInfo.chatId,
      bot_username: chatInfo.botUsername ?? null,
      linked_at: new Date().toISOString(),
    },
    { onConflict: "user_id,program_slug" },
  );

  if (error) {
    return { error: `저장에 실패했습니다: ${error.message}` };
  }

  try {
    await sendTelegramMessage({
      botToken,
      chatId: chatInfo.chatId,
      text: "✅ INSTA 댓글·DM 자동화 알림 연동이 완료됐어요. 인스타그램 계정 연결이 끊어지면 여기로 알려드리고, 새 DM이 오면 여기서 바로 답변승인/답변보류/답변제외를 선택할 수 있어요.",
    });
  } catch {
    // 저장은 이미 성공했으니, 테스트 메시지 발송 실패는 치명적이지 않음
  }

  try {
    const siteUrl = SITE_ORIGIN; // 옛 주소 환경변수 대신 새 주소(옛 주소 삭제 후에도 웹훅 유지)
    await setTelegramWebhook({
      botToken,
      url: `${siteUrl}/api/dm/telegram/webhook/${user.id}`,
      secretToken: computeWebhookSecret(user.id),
    });
  } catch (err) {
    // 웹훅 등록 실패해도 알림 자체(끊김 알림 등)는 정상 동작하니 연동 자체를 실패시키지 않음 —
    // 다만 텔레그램에서 답변승인/답변보류/답변제외 버튼은 동작하지 않게 됨
    console.error("텔레그램 웹훅 등록 실패:", err);
  }

  revalidatePath("/dm/settings");
  return { success: `@${chatInfo.botUsername ?? "봇"} 연동이 완료됐어요.` };
}

export async function reregisterTelegramWebhookAction(): Promise<TelegramActionState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: link } = await supabase
    .from("user_telegram_links")
    .select("bot_token")
    .eq("user_id", user.id)
    .eq("program_slug", THIS_PROGRAM_SLUG)
    .maybeSingle();
  if (!link) return { error: "먼저 텔레그램을 연동해주세요." };

  try {
    const siteUrl = SITE_ORIGIN; // 옛 주소 환경변수 대신 새 주소(옛 주소 삭제 후에도 웹훅 유지)
    await setTelegramWebhook({
      botToken: link.bot_token,
      url: `${siteUrl}/api/dm/telegram/webhook/${user.id}`,
      secretToken: computeWebhookSecret(user.id),
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "웹훅 재등록에 실패했습니다." };
  }

  revalidatePath("/dm/settings");
  return { success: "웹훅을 다시 등록했어요." };
}

export async function disconnectTelegramAction() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("user_telegram_links")
    .select("bot_token")
    .eq("user_id", user.id)
    .eq("program_slug", THIS_PROGRAM_SLUG)
    .maybeSingle();
  if (existing) {
    await deleteTelegramWebhook(existing.bot_token);
  }

  await supabase
    .from("user_telegram_links")
    .delete()
    .eq("user_id", user.id)
    .eq("program_slug", THIS_PROGRAM_SLUG);
  revalidatePath("/dm/settings");
}

/** 입력한 토큰의 봇 아이디 안내(표시용, 실패해도 무시) */
async function botNameHint(botToken: string): Promise<string> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, { cache: "no-store" });
    const me = (await res.json()) as { result?: { username?: string } };
    return me?.result?.username ? `입력한 토큰의 봇은 @${me.result.username} 입니다. ` : "";
  } catch {
    return "";
  }
}

// 2026-10-20 v1.22: 연동 확인 실패 원인을 찾기 위한 진단(메시지 내용은 보여 주지 않고 개수·종류·웹훅 상태만).
async function telegramDiagnosis(botToken: string): Promise<string> {
  try {
    const base = `https://api.telegram.org/bot${botToken}`;
    const info = (await (await fetch(`${base}/getWebhookInfo`, { cache: "no-store" })).json()) as {
      result?: { url?: string; pending_update_count?: number; last_error_message?: string };
    };
    // allowed_updates=[] → 모든 종류를 받도록 다시 지정하고, 어떤 종류의 알림이 쌓였는지 본다.
    const upd = (await (
      await fetch(`${base}/getUpdates?limit=20&allowed_updates=${encodeURIComponent("[]")}`, { cache: "no-store" })
    ).json()) as { ok?: boolean; description?: string; result?: Record<string, { chat?: { type?: string } }>[] };
    const kinds = (upd.result ?? []).map((u) => {
      const k = Object.keys(u).find((key) => key !== "update_id") ?? "?";
      const chatType = u[k]?.chat?.type;
      return chatType ? `${k}(${chatType})` : k;
    });
    const hook = info.result?.url ? `웹훅 걸림(${new URL(info.result.url).host})` : "웹훅 없음";
    const err = info.result?.last_error_message ? `, 웹훅 오류: ${info.result.last_error_message}` : "";
    const got = upd.ok === false ? `조회 실패: ${upd.description ?? "알 수 없음"}` : `받은 알림 ${kinds.length}개${kinds.length ? ` [${kinds.join(", ")}]` : ""}`;
    return ` [진단: ${hook}, 대기 ${info.result?.pending_update_count ?? 0}개${err}, ${got}]`;
  } catch {
    return "";
  }
}
