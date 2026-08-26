import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { getUserApiKey } from "@/lib/apiKeys";
import { getValidThreadsAccessToken } from "@/lib/actions/threads";
import { listRecentThreadsComments } from "@/lib/threads/client";
import { generateCommentReply } from "@/lib/ai/reply";
import { getReplyModelProvider } from "@/lib/ai/models";
import { getTonePresetInstruction } from "@/lib/tonePresets";
import { sendTelegramMessage, sendTelegramMessageWithButtons } from "@/lib/telegram/client";
import { postCommentReplyForUser } from "@/lib/comments/post";

const THIS_PROGRAM_SLUG = "threads-comment-reply";

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
 * 기본값은 youtube-auto-reply와 동일하게 사람이 텔레그램 버튼이나 웹 화면에서 직접 승인해야만
 * 게시되는 방식이다. (선택, 고급) 자동 게시(`th_settings.auto_approve`, 기본 false)를 사용자가
 * 설정 화면에서 위험 고지에 동의하고 명시적으로 켠 경우에만, 매번 새로 생성한 AI 답글을 검토
 * 없이 바로 게시한다 — 고정 템플릿을 반복 게시하는 기능은 없다(Meta Developer Policy §5.2.2(d)).
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
    .from("th_accounts")
    .select("access_token, token_expires_at, username")
    .eq("user_id", userId)
    .maybeSingle();
  if (!account) return { error: "쓰레드 계정이 연결되어 있지 않습니다." };

  const { data: media } = await supabase
    .from("th_posts")
    .select("id, threads_post_id, text, custom_link")
    .eq("user_id", userId)
    .eq("is_monitored", true);
  if (!media || media.length === 0) return { error: "모니터링 중인 게시물이 없습니다. 먼저 게시물을 동기화해주세요." };

  const { data: settings } = await supabase
    .from("th_settings")
    .select("default_link, ai_instructions, tone_preset, reply_model, auto_approve")
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
    const accessToken = await getValidThreadsAccessToken(supabase, userId, account);

    let newCount = 0;
    const cutoffMs = cutoffAt ? new Date(cutoffAt).getTime() : null;

    for (const m of media) {
      const rawThreads = await listRecentThreadsComments(accessToken, m.threads_post_id, 20);
      // /conversation은 대댓글까지 전부 반환하는데, 여기엔 우리 봇이 이미 단 답글 자신도
      // 포함된다. 이걸 걸러내지 않으면 "내가 방금 단 답글"을 새 댓글로 착각해 또 답글을 달고,
      // 그 답글이 다시 다음 동기화에 잡히는 무한 자기 답글 루프가 생긴다(2026-08-26 실제
      // 테스트에서 발견). 본인 계정 username이 작성자인 항목은 항상 제외한다.
      const threads = rawThreads.filter(
        (t) => (t.authorUsername ?? "").toLowerCase() !== account.username.toLowerCase(),
      );
      if (threads.length === 0) continue;

      const inWindow = cutoffMs
        ? threads.filter((t) => !t.publishedAt || new Date(t.publishedAt).getTime() >= cutoffMs)
        : threads;
      if (inWindow.length === 0) continue;

      const { data: existing } = await supabase
        .from("th_comments")
        .select("threads_reply_id")
        .eq("user_id", userId)
        .in(
          "threads_reply_id",
          inWindow.map((t) => t.replyId),
        );
      const existingIds = new Set((existing ?? []).map((e) => e.threads_reply_id));
      const freshThreads = inWindow.filter((t) => !existingIds.has(t.replyId));
      if (freshThreads.length === 0) continue;

      const link = m.custom_link ?? settings?.default_link ?? null;
      const mediaLabel = (m.text ?? "").slice(0, 40) || "(텍스트 없음)";

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
          console.error(`답글 초안 생성 실패 (comment ${thread.replyId}):`, err);
        }

        const { data: inserted, error } = await supabase
          .from("th_comments")
          .insert({
            user_id: userId,
            post_id: m.id,
            threads_reply_id: thread.replyId,
            author_username: thread.authorUsername,
            comment_text: thread.text,
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
                  `🧵 ${mediaLabel}`,
                  `💬 ${thread.authorUsername ?? "익명"}: ${thread.text}`,
                  "",
                  `✅ 게시된 답글:\n${generatedReply}`,
                ].join("\n")
              : `⚠️ 자동 게시 실패 (${mediaLabel}): ${postResult.error ?? "알 수 없는 오류"}`;
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
                `🧵 ${mediaLabel}`,
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
              .from("th_comments")
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
    if (message === "THREADS_RECONNECT_REQUIRED") {
      return { error: "쓰레드 계정 연결이 만료되었습니다. 설정 페이지에서 다시 연결해주세요." };
    }
    return { error: message };
  }
}
