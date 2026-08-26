import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { getValidThreadsAccessToken } from "@/lib/actions/threads";
import { postThreadsCommentReply } from "@/lib/threads/client";

export interface PostCommentReplyResult {
  error?: string;
  success?: boolean;
}

/**
 * 실제로 쓰레드에 답글을 게시하는 핵심 로직. 검토 화면의 "답변승인" 버튼
 * (lib/actions/comments.ts)과 텔레그램 승인 버튼(app/api/telegram/webhook/[userId]/route.ts)
 * 양쪽에서 공유한다 — 어느 경로로 오든 "사람이 명시적으로 승인한 뒤에만 게시"라는 원칙은
 * 동일하게 지킨다(Meta Developer Policy §1.7).
 */
export async function postCommentReplyForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  commentId: string,
  finalText: string,
): Promise<PostCommentReplyResult> {
  const text = finalText.trim();
  if (!text) return { error: "답글 내용이 없습니다." };

  const { data: comment } = await supabase
    .from("th_comments")
    .select("id, threads_reply_id, status")
    .eq("id", commentId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!comment) return { error: "댓글을 찾을 수 없습니다." };
  if (comment.status === "posted") return { error: "이미 게시된 답글입니다." };

  const { data: account } = await supabase
    .from("th_accounts")
    .select("access_token, token_expires_at, threads_user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!account) return { error: "쓰레드 계정이 연결되어 있지 않습니다." };

  try {
    const accessToken = await getValidThreadsAccessToken(supabase, userId, account);
    const { replyId } = await postThreadsCommentReply(accessToken, account.threads_user_id, comment.threads_reply_id, text);

    await supabase
      .from("th_comments")
      .update({ status: "posted", posted_reply_id: replyId, generated_reply: text, replied_at: new Date().toISOString() })
      .eq("id", commentId);

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "답글 게시 중 오류가 발생했습니다.";
    await supabase.from("th_comments").update({ status: "failed" }).eq("id", commentId);
    if (message === "THREADS_RECONNECT_REQUIRED") {
      return { error: "쓰레드 계정 연결이 만료되었습니다. 설정 페이지에서 다시 연결해주세요." };
    }
    return { error: message };
  }
}
