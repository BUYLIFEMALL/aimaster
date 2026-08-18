"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { findChatIdFromUpdates, sendTelegramMessage } from "@/lib/telegram/client";

export interface TelegramActionState {
  error?: string;
  success?: string;
}

// user_telegram_links는 real_estate_sales가 만든 공용 테이블이다(프로그램 접두어 없음,
// docs/PLATFORM_PATTERNS.md §9) — 다른 프로그램에서 이미 텔레그램을 연결한 회원은 여기서
// 다시 연결할 필요 없이 그대로 재사용된다.
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
      bot_token: botToken,
      chat_id: chatInfo.chatId,
      bot_username: chatInfo.botUsername ?? null,
      linked_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return { error: `저장에 실패했습니다: ${error.message}` };
  }

  try {
    await sendTelegramMessage({
      botToken,
      chatId: chatInfo.chatId,
      text: "✅ 구글폼 CRM 자동화 알림 연동이 완료됐어요. 앞으로 새 신청이 접수되면 여기로 알려드릴게요.",
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
  await supabase.from("user_telegram_links").delete().eq("user_id", user.id);
  revalidatePath("/settings");
}
