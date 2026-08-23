"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { getValidYoutubeAccessToken } from "@/lib/actions/youtube";
import { listRecentCommentThreads, postCommentReply } from "@/lib/youtube/client";
import { generateCommentReply } from "@/lib/ai/reply";

export interface SyncCommentsState {
  error?: string;
  needsApiKey?: string;
  newCount?: number;
}

/**
 * 모니터링 중인 영상들의 최신 댓글을 가져와 이미 저장된 것은 건너뛰고 신규 댓글만
 * ytreply_comments(status=pending_review)로 저장한 뒤, 각각 AI 답글 초안을 생성한다.
 * 여기서는 절대 실제로 게시하지 않는다 — 검토 화면에서 사람이 "게시"를 눌러야 올라간다
 * (유튜브 개발자 정책 III.I.2조가 요구하는 "사전의 명시적 동의"를 이 단계에서 충족한다).
 */
export async function syncCommentsAction(): Promise<SyncCommentsState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: account } = await supabase
    .from("ytreply_accounts")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!account) return { error: "유튜브 채널이 연결되어 있지 않습니다." };

  const clientId = await resolveApiKey(supabase, user.id, "google_client_id");
  const clientSecret = await resolveApiKey(supabase, user.id, "google_client_secret");
  if (!clientId || !clientSecret) return { error: "설정 페이지에서 Google OAuth Client ID/Secret을 먼저 등록해주세요." };
  const openaiKey = await resolveApiKey(supabase, user.id, "openai");
  if (!openaiKey) return { needsApiKey: "openai" };

  const { data: videos } = await supabase
    .from("ytreply_videos")
    .select("id, youtube_video_id, title, custom_link")
    .eq("user_id", user.id)
    .eq("is_monitored", true);
  if (!videos || videos.length === 0) return { error: "모니터링 중인 영상이 없습니다. 먼저 영상을 동기화해주세요." };

  const { data: settings } = await supabase
    .from("ytreply_settings")
    .select("default_link, ai_instructions")
    .eq("user_id", user.id)
    .maybeSingle();

  try {
    const accessToken = await getValidYoutubeAccessToken(supabase, user.id, account, clientId, clientSecret);

    let newCount = 0;
    // 한 번 클릭에 너무 많은 유튜브/OpenAI 호출이 몰리지 않도록 영상당 최근 댓글 20개까지만 본다.
    for (const video of videos) {
      const threads = await listRecentCommentThreads(accessToken, video.youtube_video_id, user.id, 20);
      if (threads.length === 0) continue;

      const { data: existing } = await supabase
        .from("ytreply_comments")
        .select("youtube_comment_id")
        .eq("user_id", user.id)
        .in(
          "youtube_comment_id",
          threads.map((t) => t.topLevelCommentId),
        );
      const existingIds = new Set((existing ?? []).map((e) => e.youtube_comment_id));
      const freshThreads = threads.filter((t) => !existingIds.has(t.topLevelCommentId));
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
            customInstructions: settings?.ai_instructions ?? null,
            apiKey: openaiKey,
          });
        } catch (err) {
          console.error(`답글 초안 생성 실패 (comment ${thread.topLevelCommentId}):`, err);
        }

        const { error } = await supabase.from("ytreply_comments").insert({
          user_id: user.id,
          video_id: video.id,
          youtube_comment_id: thread.topLevelCommentId,
          author_display_name: thread.authorDisplayName,
          comment_text: thread.textOriginal,
          generated_reply: generatedReply,
          status: "pending_review",
        });
        if (!error) newCount += 1;
      }
    }

    await logProgramUsage({ userId: user.id, action: "sync_comments", quantity: newCount });

    revalidatePath("/comments");
    return { newCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : "댓글 조회 중 오류가 발생했습니다.";
    if (message === "YOUTUBE_RECONNECT_REQUIRED") {
      return { error: "유튜브 채널 연결이 만료되었습니다. 설정 페이지에서 다시 연결해주세요." };
    }
    return { error: message };
  }
}

export interface PostReplyState {
  error?: string;
  success?: boolean;
}

/** 검토 화면에서 사람이 "게시"를 눌렀을 때만 실행된다 — 실제 유튜브 공개 댓글이 달리는 행동. */
export async function postReplyAction(commentId: string, finalText: string): Promise<PostReplyState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const text = finalText.trim();
  if (!text) return { error: "답글 내용을 입력해주세요." };

  const { data: comment } = await supabase
    .from("ytreply_comments")
    .select("id, youtube_comment_id, status")
    .eq("id", commentId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!comment) return { error: "댓글을 찾을 수 없습니다." };
  if (comment.status === "posted") return { error: "이미 게시된 답글입니다." };

  const { data: account } = await supabase
    .from("ytreply_accounts")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!account) return { error: "유튜브 채널이 연결되어 있지 않습니다." };

  const clientId = await resolveApiKey(supabase, user.id, "google_client_id");
  const clientSecret = await resolveApiKey(supabase, user.id, "google_client_secret");
  if (!clientId || !clientSecret) return { error: "설정 페이지에서 Google OAuth Client ID/Secret을 먼저 등록해주세요." };

  try {
    const accessToken = await getValidYoutubeAccessToken(supabase, user.id, account, clientId, clientSecret);
    const { replyId } = await postCommentReply(accessToken, comment.youtube_comment_id, text, user.id);

    await supabase
      .from("ytreply_comments")
      .update({ status: "posted", posted_reply_id: replyId, generated_reply: text, replied_at: new Date().toISOString() })
      .eq("id", commentId);

    await logProgramUsage({ userId: user.id, action: "post_reply" });

    revalidatePath("/comments");
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "답글 게시 중 오류가 발생했습니다.";
    await supabase.from("ytreply_comments").update({ status: "failed" }).eq("id", commentId);
    revalidatePath("/comments");
    if (message === "YOUTUBE_RECONNECT_REQUIRED") {
      return { error: "유튜브 채널 연결이 만료되었습니다. 설정 페이지에서 다시 연결해주세요." };
    }
    return { error: message };
  }
}

export async function skipReplyAction(commentId: string) {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  await supabase.from("ytreply_comments").update({ status: "skipped" }).eq("id", commentId).eq("user_id", user.id);
  revalidatePath("/comments");
}
