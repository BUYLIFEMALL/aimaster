import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeWebhookSecret } from "@/lib/telegram/webhookSecret";
import { answerTelegramCallbackQuery, editTelegramMessageStatus } from "@/lib/telegram/client";
import { sendReportToKakaoCore } from "@/lib/kakaoSend";

export const dynamic = "force-dynamic";

const THIS_PROGRAM_SLUG = "kakao-auto-posting";

/**
 * 텔레그램 "✅ 카카오로 발행 / ❌ 발행 안 함" 인라인 버튼 클릭을 받는 웹훅. 사용자마다 자기
 * 봇을 쓰므로 URL 경로의 userId로 어느 사용자인지 구분하고, setWebhook 때 등록해둔
 * secret_token(computeWebhookSecret)을 X-Telegram-Bot-Api-Secret-Token 헤더로 검증해
 * URL만 알아낸 제3자가 가짜 발행 요청을 보낼 수 없게 막는다 (youtube-auto-reply와 동일 패턴).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;

  let expectedSecret: string;
  try {
    expectedSecret = computeWebhookSecret(userId);
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  if (request.headers.get("x-telegram-bot-api-secret-token") !== expectedSecret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = await request.json().catch(() => null);
  const callback = update?.callback_query;
  if (!callback?.data || !callback?.id) {
    return NextResponse.json({ ok: true }); // 콜백 버튼이 아닌 업데이트는 조용히 무시
  }

  const [action, reportId] = String(callback.data).split(":");
  const chatId = String(callback.message?.chat?.id ?? "");
  const messageId = callback.message?.message_id as number | undefined;
  const originalText = String(callback.message?.text ?? "");

  const admin = createAdminClient();

  const { data: telegramLink } = await admin
    .from("user_telegram_links")
    .select("bot_token, chat_id")
    .eq("user_id", userId)
    .eq("program_slug", THIS_PROGRAM_SLUG)
    .maybeSingle();

  if (!telegramLink || telegramLink.chat_id !== chatId) {
    return NextResponse.json({ ok: true }); // 연동이 끊겼거나 chat_id 불일치 — 무시
  }

  const { data: report } = await admin
    .from("kakao_reports")
    .select("id, telegram_review_status")
    .eq("id", reportId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!report) {
    await answerTelegramCallbackQuery({ botToken: telegramLink.bot_token, callbackQueryId: callback.id, text: "리포트를 찾을 수 없습니다." });
    return NextResponse.json({ ok: true });
  }

  if (report.telegram_review_status !== "pending") {
    await answerTelegramCallbackQuery({
      botToken: telegramLink.bot_token,
      callbackQueryId: callback.id,
      text: "이미 처리된 리포트예요.",
    });
    return NextResponse.json({ ok: true });
  }

  let toastText = "";
  let statusLine = "";

  if (action === "kakao_send") {
    const result = await sendReportToKakaoCore(admin, userId, reportId);
    if (result.error) {
      await admin.from("kakao_reports").update({ telegram_review_status: "approved" }).eq("id", reportId);
      toastText = result.error;
      statusLine = `\n\n⚠️ 카카오 발송 실패: ${result.error}`;
    } else {
      await admin.from("kakao_reports").update({ telegram_review_status: "approved" }).eq("id", reportId);
      toastText = "카카오로 발행했습니다.";
      statusLine = "\n\n✅ 카카오로 발행 완료";
    }
  } else if (action === "kakao_skip") {
    await admin.from("kakao_reports").update({ telegram_review_status: "rejected" }).eq("id", reportId);
    toastText = "발행 안 함으로 처리했습니다.";
    statusLine = "\n\n❌ 발행 안 함";
  } else {
    return NextResponse.json({ ok: true });
  }

  await answerTelegramCallbackQuery({ botToken: telegramLink.bot_token, callbackQueryId: callback.id, text: toastText });

  if (messageId) {
    await editTelegramMessageStatus({
      botToken: telegramLink.bot_token,
      chatId,
      messageId,
      text: `${originalText}${statusLine}`,
    });
  }

  return NextResponse.json({ ok: true });
}
