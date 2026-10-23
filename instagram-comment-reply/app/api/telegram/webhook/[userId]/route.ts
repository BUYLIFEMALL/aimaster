import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeWebhookSecret } from "@/lib/telegram/webhookSecret";
import { answerTelegramCallbackQuery, editTelegramMessageStatus } from "@/lib/telegram/client";
import { postCommentReplyForUser } from "@/lib/comments/post";

export const dynamic = "force-dynamic";

const THIS_PROGRAM_SLUG = "instagram-comment-reply";

/**
 * 텔레그램 "✅ 답변승인 / ⏸ 답변보류 / ❌ 답변제외" 인라인 버튼 클릭을 받는 웹훅. 사용자마다
 * 자기 봇을 쓰므로 URL 경로의 userId로 어느 사용자인지 구분하고, setWebhook 때 등록해둔
 * secret_token(computeWebhookSecret)을 X-Telegram-Bot-Api-Secret-Token 헤더로 검증해
 * URL만 알아낸 제3자가 가짜 승인 요청을 보낼 수 없게 막는다(youtube-auto-reply와 동일 패턴).
 */
export async function POST(request: NextRequest, { params }: { params: { userId: string } }) {
  const userId = params.userId;

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

  const [action, commentId] = String(callback.data).split(":");
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

  const { data: comment } = await admin
    .from("ig_comments")
    .select("id, status, generated_reply")
    .eq("id", commentId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!comment) {
    await answerTelegramCallbackQuery({ botToken: telegramLink.bot_token, callbackQueryId: callback.id, text: "댓글을 찾을 수 없습니다." });
    return NextResponse.json({ ok: true });
  }

  if (comment.status !== "pending_review") {
    await answerTelegramCallbackQuery({
      botToken: telegramLink.bot_token,
      callbackQueryId: callback.id,
      text: "이미 처리된 댓글이에요.",
    });
    return NextResponse.json({ ok: true });
  }

  let toastText = "";
  let statusLine = "";

  if (action === "post") {
    const result = await postCommentReplyForUser(admin, userId, commentId, comment.generated_reply ?? "");
    if (result.error) {
      toastText = result.error;
      statusLine = `\n\n⚠️ 답변승인 실패: ${result.error}`;
    } else {
      toastText = "답변승인했습니다.";
      statusLine = "\n\n✅ 답변승인 완료";
    }
  } else if (action === "hold") {
    toastText = "답변보류했습니다. 웹 화면에서 나중에 처리해주세요.";
    statusLine = "\n\n⏸ 답변보류됨 — 웹의 \"댓글 검토/게시\" 화면에서 나중에 처리해주세요.";
  } else if (action === "skip") {
    await admin.from("ig_comments").update({ status: "skipped" }).eq("id", commentId);
    toastText = "답변제외했습니다.";
    statusLine = "\n\n❌ 답변제외";
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
