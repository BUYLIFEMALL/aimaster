"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { findChatIdFromUpdates, sendTelegramMessage } from "@/lib/telegram/client";

export interface TelegramActionState {
  error?: string;
  success?: string;
}

// user_telegram_links는 프로그램별로 각자 다른 봇을 연결할 수 있도록 (user_id, program_slug)
// 단위로 스코프된다(2026-08-23 변경 — 이전엔 user_id 하나로만 묶여서 프로그램마다 같은 봇을
// 공유했다). 이 프로그램(commercial-land-trade-alert)이 원래 이 테이블을 만든 곳이라, 기존 연결 2건은
// 전부 이 slug로 귀속되도록 마이그레이션했다.
const THIS_PROGRAM_SLUG = "commercial-land-trade-alert";

async function botNameOf(botToken: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, { cache: "no-store" });
    const me = await res.json();
    return me?.result?.username ?? null;
  } catch {
    return null;
  }
}

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
    const name = await botNameOf(botToken);
    return {
      error: `${name ? `@${name} 봇의 토큰입니다. ` : ""}이 봇에게 보낸 메시지를 찾지 못했어요. 이 봇의 대화방에서 메시지를 새로 보낸 뒤 바로 다시 눌러 주세요. 채널·그룹에 쓴 글은 찾지 못해요.`,
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
      text: "✅ 상가·건물·토지 실거래 알림 연동이 완료됐어요. 앞으로 실거래 지역에 새 실거래가 신고되면 여기로 알려드릴게요.",
    });
  } catch {
    // 저장은 이미 성공했으니, 테스트 메시지 발송 실패는 치명적이지 않음
  }

  revalidatePath("/settings");
  return { success: `@${chatInfo.botUsername ?? "봇"} 연동이 완료됐어요.` };
}

/** 다른 프로그램에 연결해 둔 본인 봇을 이 프로그램 전용으로 고른다. 확인 메시지가 도착한 경우에만 저장한다 */
export async function chooseTelegramBotAction(
  _prevState: TelegramActionState,
  formData: FormData,
): Promise<TelegramActionState> {
  const user = await requireProgramAccess();
  const source = String(formData.get("source") ?? "");
  if (!source || source === THIS_PROGRAM_SLUG) return { error: "받을 봇을 골라 주세요." };

  const supabase = await createClient();
  const { data: link } = await supabase
    .from("user_telegram_links")
    .select("bot_token, chat_id, bot_username")
    .eq("user_id", user.id)
    .eq("program_slug", source)
    .maybeSingle();
  if (!link?.bot_token) return { error: "고른 봇의 연결 정보를 찾지 못했어요. 토큰으로 연결해 주세요." };

  try {
    await sendTelegramMessage({
      botToken: link.bot_token,
      chatId: link.chat_id,
      text: "✅ 상가·건물·토지 매물 알림을 앞으로 이 봇으로 보내드릴게요.",
    });
  } catch (err) {
    return { error: `확인 메시지를 보내지 못해 바꾸지 않았어요: ${err instanceof Error ? err.message : "전송 실패"}` };
  }

  const { error } = await supabase.from("user_telegram_links").upsert(
    {
      user_id: user.id,
      program_slug: THIS_PROGRAM_SLUG,
      bot_token: link.bot_token,
      chat_id: link.chat_id,
      bot_username: link.bot_username,
      linked_at: new Date().toISOString(),
    },
    { onConflict: "user_id,program_slug" },
  );
  if (error) return { error: `저장에 실패했습니다: ${error.message}` };

  revalidatePath("/settings");
  return { success: `앞으로 @${link.bot_username ?? "봇"}으로 받아요. 확인 메시지를 보냈어요.` };
}

export async function disconnectTelegramAction() {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  await supabase
    .from("user_telegram_links")
    .delete()
    .eq("user_id", user.id)
    .eq("program_slug", THIS_PROGRAM_SLUG);
  revalidatePath("/settings");
}
