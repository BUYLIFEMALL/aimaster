import "server-only";
import { sendTelegramMessageWithButtons } from "@/lib/telegram/client";

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kakao-auto-poster.vercel.app";
const THIS_PROGRAM_SLUG = "kakao-auto-posting";

type SupabaseLike = {
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

/**
 * 리포트가 새로 생성될 때마다("지금 생성" 수동 클릭이든, Phase 3 예약 자동 생성이든) 호출한다.
 * 텔레그램이 연동돼 있으면 "✅ 카카오로 발행 / ❌ 발행 안 함" 버튼과 함께 리포트 요약을 보내서,
 * 카카오톡으로 실제 발송되기 전에 사람이 한 번 검토하고 발행 여부를 결정할 수 있게 한다.
 * 텔레그램이 연동돼 있지 않으면 아무것도 하지 않는다(기존처럼 웹 화면에서 수동 발송만 가능 —
 * 실패로 취급하지 않는다).
 */
export async function requestTelegramReviewForReport(
  supabase: SupabaseLike,
  userId: string,
  report: { id: string; title: string; summary: string },
): Promise<void> {
  const { data: link } = await supabase
    .from("user_telegram_links")
    .select("bot_token, chat_id")
    .eq("user_id", userId)
    .eq("program_slug", THIS_PROGRAM_SLUG)
    .maybeSingle();

  if (!link) return; // 텔레그램 미연동 — 웹 화면에서 수동으로 검토/발송

  const text = [
    "🆕 새 리포트가 생성됐어요. 카카오톡으로 발행할까요?",
    "",
    `📨 ${report.title}`,
    "",
    report.summary,
    "",
    `전체 보기: ${APP_URL}/reports/${report.id}`,
  ].join("\n");

  try {
    const { messageId } = await sendTelegramMessageWithButtons({
      botToken: link.bot_token,
      chatId: link.chat_id,
      text,
      buttons: [
        { text: "✅ 카카오로 발행", callbackData: `kakao_send:${report.id}` },
        { text: "❌ 발행 안 함", callbackData: `kakao_skip:${report.id}` },
      ],
    });

    await supabase
      .from("kakao_reports")
      .update({ telegram_review_status: "pending", telegram_chat_id: link.chat_id, telegram_message_id: messageId })
      .eq("id", report.id);
  } catch (err) {
    // 텔레그램 발송 실패는 리포트 생성 자체를 막지 않는다 — 웹 화면에서 여전히 수동 발송 가능
    console.error("텔레그램 검토 요청 발송 실패:", err);
  }
}
