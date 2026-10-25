"use server";

// 기준: booking-reminder/lib/actions/telegram.ts(공용 user_telegram_links, program_slug 단위). 봇 토큰은 회원 본인 것.

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { findChatIdFromUpdates, sendTelegramMessage } from "@/lib/telegram/client";
import { ALERT_PREFIX, REAL_ESTATE_SALES_SLUG } from "@/lib/delivery";

export interface TelegramActionState {
  error?: string;
  success?: string;
}

// user_telegram_links는 real_estate_sales가 만든 공용 테이블이다(프로그램 접두어 없음,
// docs/PLATFORM_PATTERNS.md §9). 프로그램마다 다른 봇을 연결할 수 있도록 (user_id,
// program_slug) 단위로 스코프된다(2026-08-23 변경) — 다른 프로그램에서 이미 텔레그램을
// 연결한 회원이라도, 이 프로그램에서는 별도로 연동해야 한다.
const THIS_PROGRAM_SLUG = "realty-listing-alert";

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
      text: "✅ AI 부동산 실시간 매물 알림 자동화 연결이 완료됐어요. 새 매물·가격 변동 알림을 여기로 보내 드릴게요.",
    });
  } catch {
    // 저장은 이미 성공했으니, 테스트 메시지 발송 실패는 치명적이지 않음
  }

  revalidatePath("/delivery");
  revalidatePath("/dashboard");
  return { success: `@${chatInfo.botUsername ?? "봇"} 연동이 완료됐어요.` };
}

// 기존 「부동산 실거래 투자분석 자동화」(real-estate-sales)에 연결해 둔 회원 본인 봇을 그대로 가져온다(2026-10-25 주인님 결정).
// 두 프로그램 모두 웹훅 없이 보내기만 하므로 같은 봇을 써도 충돌하지 않는다(docs/SHARED_FEATURE_MAP.md 텔레그램 표).
// 본인 행만 읽고 쓴다(RLS + user_id 조건). 이 프로그램 알림에는 「🏠 [매물 알림]」 머리말을 붙여 구분한다.

export async function importRealEstateBotAction(): Promise<TelegramActionState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { data: source } = await supabase
    .from("user_telegram_links")
    .select("bot_token, chat_id, bot_username")
    .eq("user_id", user.id)
    .eq("program_slug", REAL_ESTATE_SALES_SLUG)
    .maybeSingle();
  if (!source?.bot_token || !source.chat_id) {
    return { error: "부동산 실거래 투자분석 자동화에 연결된 봇을 찾지 못했어요. 아래에서 새로 연결해 주세요." };
  }

  const { error } = await supabase.from("user_telegram_links").upsert(
    {
      user_id: user.id,
      program_slug: THIS_PROGRAM_SLUG,
      bot_token: source.bot_token,
      chat_id: source.chat_id,
      bot_username: source.bot_username ?? null,
      linked_at: new Date().toISOString(),
    },
    { onConflict: "user_id,program_slug" },
  );
  if (error) return { error: `저장에 실패했습니다: ${error.message}` };

  try {
    await sendTelegramMessage({
      botToken: source.bot_token,
      chatId: source.chat_id,
      text: `${ALERT_PREFIX} 부동산 실거래 프로그램과 같은 봇으로 연결됐어요. 매물 알림은 앞에 「🏠 [매물 알림]」이 붙어서 와요.`,
    });
  } catch {
    // 저장은 이미 성공 — 확인 메시지 실패는 치명적이지 않음(봇을 차단했거나 토큰이 바뀐 경우 화면에서 다시 연결)
  }
  revalidatePath("/delivery");
  revalidatePath("/dashboard");
  return { success: `@${source.bot_username ?? "봇"} (부동산 실거래 프로그램과 같은 봇)으로 연결했어요.` };
}

export async function disconnectTelegramAction() {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  await supabase
    .from("user_telegram_links")
    .delete()
    .eq("user_id", user.id)
    .eq("program_slug", THIS_PROGRAM_SLUG);
  revalidatePath("/delivery");
  revalidatePath("/dashboard");
}
