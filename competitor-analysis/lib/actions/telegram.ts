"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { findChatIdFromUpdates, sendTelegramMessage } from "@/lib/telegram/client";
import { LEGACY_PROGRAM_SLUG, THIS_PROGRAM_SLUG } from "@/lib/telegramLink";

export interface TelegramActionState {
  error?: string;
  success?: string;
}

// user_telegram_links는 프로그램 접두어 없는 공용 테이블이다(docs/PLATFORM_PATTERNS.md §9). (user_id, program_slug) 단위.
// 2026-10-23 병합 A: 롱테일에서 연결한 봇은 읽기만 이어서 쓰고(lib/telegramLink.ts), 새 연결은 이 앱 이름으로 저장한다.

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
      text: "✅ 키워드·경쟁사 분석 자동화 알림 연동이 완료됐어요. 앞으로 키워드를 확장하면 여기로 결과를 보내드릴게요.",
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
    .in("program_slug", [THIS_PROGRAM_SLUG, LEGACY_PROGRAM_SLUG]);
  revalidatePath("/settings");
}
