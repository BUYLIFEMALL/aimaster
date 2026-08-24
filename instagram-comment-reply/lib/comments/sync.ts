import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { getUserApiKey } from "@/lib/apiKeys";
import { getValidInstagramAccessToken } from "@/lib/actions/instagram";
import { listRecentInstagramComments } from "@/lib/instagram/client";
import { generateCommentReply } from "@/lib/ai/reply";
import { getReplyModelProvider } from "@/lib/ai/models";
import { getTonePresetInstruction } from "@/lib/tonePresets";
import { sendTelegramMessageWithButtons } from "@/lib/telegram/client";

const THIS_PROGRAM_SLUG = "instagram-comment-reply";

export interface RunCommentSyncResult {
  error?: string;
  needsApiKey?: string;
  newCount?: number;
}

/**
 * 모니터링 중인 게시물들의 최신 댓글을 가져와 신규 댓글만 저장(status=pending_review) + AI 답글
 * 초안 생성까지 하는 핵심 로직. "지금 새 댓글 확인하기" 버튼(lib/actions/comments.ts)과 예약
 * 모니터링 cron(app/api/cron/sync-comments/route.ts) 양쪽에서 공유한다.
 *
 * youtube-auto-reply와 달리 (선택) 자동 게시 기능은 만들지 않는다 — Meta Developer Policy
 * §5.2.2(d)가 "정형화되지 않은, 사용자가 사전 승인한" 메시지만 허용한다고 더 엄격하게 명시하고
 * 있어, 항상 사람이 텔레그램 버튼이나 웹 화면에서 승인해야만 게시된다.
 *
 * cutoffAt을 주면 그 시점 이후에 달린 댓글만 대상으로 삼는다 — 예약 모니터링을 처음 켰을 때
 * 그동안 밀린 과거 댓글이 한꺼번에 몰려서 처리되는 것을 막기 위함이다(수동 버튼 클릭 시에는
 * cutoffAt 없이 최근 댓글 전부를 본다).
 */
export async function runCommentSync(
  supabase: SupabaseClient<Database>,
  userId: string,
  cutoffAt?: string | null,
): Promise<RunCommentSyncResult> {
  const { data: account } = await supabase
    .from("ig_accounts")
    .select("access_token, token_expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!account) return { error: "인스타그램 계정이 연결되어 있지 않습니다." };

  const { data: media } = await supabase
    .from("ig_media")
    .select("id, ig_media_id, caption, custom_link")
    .eq("user_id", userId)
    .eq("is_monitored", true);
  if (!media || media.length === 0) return { error: "모니터링 중인 게시물이 없습니다. 먼저 게시물을 동기화해주세요." };

  const { data: settings } = await supabase
    .from("ig_settings")
    .select("default_link, ai_instructions, tone_preset, reply_model")
    .eq("user_id", userId)
    .maybeSingle();

  // 답글 초안 생성에 어떤 AI를 쓸지(OpenAI/Anthropic/Gemini)는 reply_model 선택에 따라
  // 달라지고, 그에 맞는 provider의 키가 등록되어 있어야 한다.
  const aiProvider = getReplyModelProvider(settings?.reply_model);
  const aiApiKey = await getUserApiKey(supabase, userId, aiProvider);
  if (!aiApiKey) return { needsApiKey: aiProvider };

  const toneInstruction = getTonePresetInstruction(settings?.tone_preset ?? null);
  const combinedInstructions = [toneInstruction, settings?.ai_instructions].filter(Boolean).join(" ") || null;

  const { data: telegramLink } = await supabase
    .from("user_telegram_links")
    .select("bot_token, chat_id")
    .eq("user_id", userId)
    .eq("program_slug", THIS_PROGRAM_SLUG)
    .maybeSingle();

  try {
    const accessToken = await getValidInstagramAccessToken(supabase, userId, account);

    let newCount = 0;
    const cutoffMs = cutoffAt ? new Date(cutoffAt).getTime() : null;

    for (const m of media) {
      const threads = await listRecentInstagramComments(accessToken, m.ig_media_id, 20);
      if (threads.length === 0) continue;

      const inWindow = cutoffMs
        ? threads.filter((t) => !t.publishedAt || new Date(t.publishedAt).getTime() >= cutoffMs)
        : threads;
      if (inWindow.length === 0) continue;

      const { data: existing } = await supabase
        .from("ig_comments")
        .select("ig_comment_id")
        .eq("user_id", userId)
        .in(
          "ig_comment_id",
          inWindow.map((t) => t.commentId),
        );
      const existingIds = new Set((existing ?? []).map((e) => e.ig_comment_id));
      const freshThreads = inWindow.filter((t) => !existingIds.has(t.commentId));
      if (freshThreads.length === 0) continue;

      const link = m.custom_link ?? settings?.default_link ?? null;
      const mediaLabel = (m.caption ?? "").slice(0, 40) || "(캡션 없음)";

      for (const thread of freshThreads) {
        let generatedReply: string | null = null;
        try {
          generatedReply = await generateCommentReply({
            videoTitle: mediaLabel,
            commentAuthor: thread.authorUsername,
            commentText: thread.text,
            link,
            customInstructions: combinedInstructions,
            model: settings?.reply_model,
            apiKey: aiApiKey,
          });
        } catch (err) {
          console.error(`답글 초안 생성 실패 (comment ${thread.commentId}):`, err);
        }

        const { data: inserted, error } = await supabase
          .from("ig_comments")
          .insert({
            user_id: userId,
            media_id: m.id,
            ig_comment_id: thread.commentId,
            author_username: thread.authorUsername,
            comment_text: thread.text,
            generated_reply: generatedReply,
            status: "pending_review",
          })
          .select("id")
          .single();
        if (error || !inserted) continue;
        newCount += 1;

        if (telegramLink && generatedReply) {
          try {
            const { messageId } = await sendTelegramMessageWithButtons({
              botToken: telegramLink.bot_token,
              chatId: telegramLink.chat_id,
              text: [
                `📸 ${mediaLabel}`,
                `💬 ${thread.authorUsername ?? "익명"}: ${thread.text}`,
                "",
                `✍️ AI 답글 초안:\n${generatedReply}`,
              ].join("\n"),
              buttons: [
                { text: "✅ 답변승인", callbackData: `post:${inserted.id}` },
                { text: "⏸ 답변보류", callbackData: `hold:${inserted.id}` },
                { text: "❌ 답변제외", callbackData: `skip:${inserted.id}` },
              ],
            });
            await supabase
              .from("ig_comments")
              .update({ telegram_chat_id: telegramLink.chat_id, telegram_message_id: messageId })
              .eq("id", inserted.id);
          } catch (sendErr) {
            console.error(`텔레그램 승인 메시지 발송 실패 (comment ${inserted.id}):`, sendErr);
          }
        }
      }
    }

    return { newCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : "댓글 조회 중 오류가 발생했습니다.";
    if (message === "INSTAGRAM_RECONNECT_REQUIRED") {
      return { error: "인스타그램 계정 연결이 만료되었습니다. 설정 페이지에서 다시 연결해주세요." };
    }
    return { error: message };
  }
}
