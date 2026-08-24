"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { getValidYoutubeAccessToken } from "@/lib/actions/youtube";
import { postCommentReply } from "@/lib/youtube/client";
import { runCommentSync, type RunCommentSyncResult } from "@/lib/comments/sync";

export type SyncCommentsState = RunCommentSyncResult;

/**
 * "지금 새 댓글 확인하기" 버튼. 실제 로직은 lib/comments/sync.ts의 runCommentSync()를
 * 예약 모니터링 cron과 공유한다 — 여기서는 cutoffAt 없이 최근 댓글 전부를 본다.
 */
export async function syncCommentsAction(): Promise<SyncCommentsState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const result = await runCommentSync(supabase, user.id);

  if (result.newCount !== undefined) {
    await logProgramUsage({ userId: user.id, action: "sync_comments", quantity: result.newCount });
    revalidatePath("/comments");
  }
  return result;
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
