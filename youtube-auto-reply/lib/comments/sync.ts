import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { getUserApiKey } from "@/lib/apiKeys";
import { getValidYoutubeAccessToken } from "@/lib/actions/youtube";
import { listRecentCommentThreads } from "@/lib/youtube/client";
import { generateCommentReply } from "@/lib/ai/reply";
import { getTonePresetInstruction } from "@/lib/tonePresets";
import { sendTelegramMessage, sendTelegramMessageWithButtons } from "@/lib/telegram/client";
import { postCommentReplyForUser } from "@/lib/comments/post";

const THIS_PROGRAM_SLUG = "youtube-auto-reply";

export interface RunCommentSyncResult {
  error?: string;
  needsApiKey?: string;
  newCount?: number;
}

/**
 * 모니터링 중인 영상들의 최신 댓글을 가져와 신규 댓글만 저장(status=pending_review) + AI 답글
 * 초안 생성까지 하는 핵심 로직. "지금 새 댓글 확인하기" 버튼(lib/actions/comments.ts)과 예약
 * 모니터링 cron(app/api/cron/sync-comments/route.ts) 양쪽에서 공유한다.
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
    .from("ytreply_accounts")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!account) return { error: "유튜브 채널이 연결되어 있지 않습니다." };

  const clientId = await getUserApiKey(supabase, userId, "google_client_id");
  const clientSecret = await getUserApiKey(supabase, userId, "google_client_secret");
  if (!clientId || !clientSecret) return { error: "설정 페이지에서 Google OAuth Client ID/Secret을 먼저 등록해주세요." };
  const openaiKey = await getUserApiKey(supabase, userId, "openai");
  if (!openaiKey) return { needsApiKey: "openai" };

  const { data: videos } = await supabase
    .from("ytreply_videos")
    .select("id, youtube_video_id, title, custom_link")
    .eq("user_id", userId)
    .eq("is_monitored", true);
  if (!videos || videos.length === 0) return { error: "모니터링 중인 영상이 없습니다. 먼저 영상을 동기화해주세요." };

  const { data: settings } = await supabase
    .from("ytreply_settings")
    .select("default_link, ai_instructions, tone_preset, reply_model, auto_approve")
    .eq("user_id", userId)
    .maybeSingle();

  const toneInstruction = getTonePresetInstruction(settings?.tone_preset ?? null);
  const combinedInstructions = [toneInstruction, settings?.ai_instructions].filter(Boolean).join(" ") || null;

  const { data: telegramLink } = await supabase
    .from("user_telegram_links")
    .select("bot_token, chat_id")
    .eq("user_id", userId)
    .eq("program_slug", THIS_PROGRAM_SLUG)
    .maybeSingle();

  try {
    const accessToken = await getValidYoutubeAccessToken(supabase, userId, account, clientId, clientSecret);

    let newCount = 0;
    const cutoffMs = cutoffAt ? new Date(cutoffAt).getTime() : null;

    for (const video of videos) {
      const threads = await listRecentCommentThreads(accessToken, video.youtube_video_id, userId, 20);
      if (threads.length === 0) continue;

      const inWindow = cutoffMs
        ? threads.filter((t) => !t.publishedAt || new Date(t.publishedAt).getTime() >= cutoffMs)
        : threads;
      if (inWindow.length === 0) continue;

      const { data: existing } = await supabase
        .from("ytreply_comments")
        .select("youtube_comment_id")
        .eq("user_id", userId)
        .in(
          "youtube_comment_id",
          inWindow.map((t) => t.topLevelCommentId),
        );
      const existingIds = new Set((existing ?? []).map((e) => e.youtube_comment_id));
      const freshThreads = inWindow.filter((t) => !existingIds.has(t.topLevelCommentId));
      if (freshThreads.length === 0) continue;

      const link = video.custom_link ?? settings?.default_link ?? null;

      for (const thread of freshThreads) {
        let generatedReply: string | null = null;
        try {
          generatedReply = await generateCommentReply({
            videoTitle: video.title,
            commentAuthor: thread.authorDisplayName,
            commentText: thread.textOriginal,
            link,
            customInstructions: combinedInstructions,
            model: settings?.reply_model,
            apiKey: openaiKey,
          });
        } catch (err) {
          console.error(`답글 초안 생성 실패 (comment ${thread.topLevelCommentId}):`, err);
        }

        const { data: inserted, error } = await supabase
          .from("ytreply_comments")
          .insert({
            user_id: userId,
            video_id: video.id,
            youtube_comment_id: thread.topLevelCommentId,
            author_display_name: thread.authorDisplayName,
            comment_text: thread.textOriginal,
            generated_reply: generatedReply,
            status: "pending_review",
          })
          .select("id")
          .single();
        if (error || !inserted) continue;
        newCount += 1;

        // 자동 게시(선택 기능, 기본 off)가 켜져 있으면 사람 검토 없이 바로 게시하고, 텔레그램에는
        // 버튼 없는 결과 알림만 보낸다. 꺼져 있으면(기본값) 기존처럼 승인 버튼 메시지를 보낸다.
        if (settings?.auto_approve && generatedReply) {
          const postResult = await postCommentReplyForUser(supabase, userId, inserted.id, generatedReply);
          if (telegramLink) {
            const text = postResult.success
              ? [
                  `🤖 자동 게시 완료`,
                  `🎬 ${video.title}`,
                  `💬 ${thread.authorDisplayName ?? "익명"}: ${thread.textOriginal}`,
                  "",
                  `✅ 게시된 답글:\n${generatedReply}`,
                ].join("\n")
              : `⚠️ 자동 게시 실패 (${video.title}): ${postResult.error ?? "알 수 없는 오류"}`;
            await sendTelegramMessage({ botToken: telegramLink.bot_token, chatId: telegramLink.chat_id, text }).catch(
              (sendErr) => console.error(`텔레그램 자동 게시 알림 발송 실패 (comment ${inserted.id}):`, sendErr),
            );
          }
        } else if (telegramLink && generatedReply) {
          try {
            const { messageId } = await sendTelegramMessageWithButtons({
              botToken: telegramLink.bot_token,
              chatId: telegramLink.chat_id,
              text: [
                `🎬 ${video.title}`,
                `💬 ${thread.authorDisplayName ?? "익명"}: ${thread.textOriginal}`,
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
              .from("ytreply_comments")
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
    if (message === "YOUTUBE_RECONNECT_REQUIRED") {
      return { error: "유튜브 채널 연결이 만료되었습니다. 설정 페이지에서 다시 연결해주세요." };
    }
    return { error: message };
  }
}
