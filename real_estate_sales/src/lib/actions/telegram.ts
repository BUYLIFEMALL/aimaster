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
// 공유했다). 이 프로그램(real-estate-sales)이 원래 이 테이블을 만든 곳이라, 기존 연결 2건은
// 전부 이 slug로 귀속되도록 마이그레이션했다.
const THIS_PROGRAM_SLUG = "real-estate-sales";

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
      text: "✅ 부동산 실거래 투자분석 알림 연동이 완료됐어요. 앞으로 관심 지역에 새 실거래가 신고되면 여기로 알려드릴게요.",
    });
  } catch {
    // 저장은 이미 성공했으니, 테스트 메시지 발송 실패는 치명적이지 않음
  }

  revalidatePath("/settings");
  return { success: `@${chatInfo.botUsername ?? "봇"} 연동이 완료됐어요.` };
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
