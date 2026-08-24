"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { deleteTelegramWebhook, findChatIdFromUpdates, sendTelegramMessage, setTelegramWebhook } from "@/lib/telegram/client";
import { computeWebhookSecret } from "@/lib/telegram/webhookSecret";

export interface TelegramActionState {
  error?: string;
  success?: string;
}

// user_telegram_links는 real_estate_sales가 만든 공용 테이블이다(프로그램 접두어 없음,
// docs/PLATFORM_PATTERNS.md §9). 프로그램마다 다른 봇을 연결할 수 있도록 (user_id,
// program_slug) 단위로 스코프된다(2026-08-23 변경) — 다른 프로그램에서 이미 텔레그램을
// 연결한 회원이라도, 이 프로그램에서는 별도로 연동해야 한다.
const THIS_PROGRAM_SLUG = "youtube-auto-reply";

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
        "아직 봇에게 보낸 메시지를 찾지 못했어요. 텔레그램에서 본인 봇을 열고 아무 메시지나 먼저 보낸 뒤 다시 시도해주세요.",
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
      text: "✅ 유튜브 댓글자동화 알림 연동이 완료됐어요. 유튜브 채널 연결이 끊어지면 여기로 알려드리고, 새 댓글이 오면 여기서 바로 답변승인/답변보류/답변제외를 선택할 수 있어요.",
    });
  } catch {
    // 저장은 이미 성공했으니, 테스트 메시지 발송 실패는 치명적이지 않음
  }

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://youtube-auto-reply.vercel.app";
    await setTelegramWebhook({
      botToken,
      url: `${siteUrl}/api/telegram/webhook/${user.id}`,
      secretToken: computeWebhookSecret(user.id),
    });
  } catch (err) {
    // 웹훅 등록 실패해도 알림 자체(끊김 알림 등)는 정상 동작하니 연동 자체를 실패시키지 않음 —
    // 다만 텔레그램에서 답변승인/답변보류/답변제외 버튼은 동작하지 않게 됨
    console.error("텔레그램 웹훅 등록 실패:", err);
  }

  revalidatePath("/settings");
  return { success: `@${chatInfo.botUsername ?? "봇"} 연동이 완료됐어요.` };
}

/**
 * 텔레그램 웹훅을 다시 등록한다. 연동 자체는 살아있는데(연결 표시는 됨) 어떤 이유로든 웹훅이
 * 빠져 있어(예: 연동 직후 일시적 오류) 승인 버튼이 응답하지 않는 경우를 위한 자가 복구 버튼.
 */
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
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://youtube-auto-reply.vercel.app";
    await setTelegramWebhook({
      botToken: link.bot_token,
      url: `${siteUrl}/api/telegram/webhook/${user.id}`,
      secretToken: computeWebhookSecret(user.id),
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "웹훅 재등록에 실패했습니다." };
  }

  revalidatePath("/settings");
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
  revalidatePath("/settings");
}
