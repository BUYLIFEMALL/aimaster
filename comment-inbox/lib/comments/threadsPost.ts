import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { getReplyAccount } from "@/lib/threads/memberAccount";
import { getValidThreadsAccessToken } from "@/lib/threads/token";
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

  // v1.13: 공용 연결 계정(댓글 권한 있는 것) → 없으면 th_accounts
  const account = await getReplyAccount(supabase, userId);
  if (!account) return { error: "쓰레드 계정이 연결되어 있지 않습니다." };

  // 2026-10-21 이중 게시 방지: 실제 게시 직전에 replied_at을 「처리 중 표시」로 조건부 선점한다.
  // 웹 화면·텔레그램·자동 게시·통합 받은편지함(comment-inbox)이 같은 항목을 동시에 승인해도 선점에 성공한 한 요청만 게시한다.
  // 성공하면 status=posted·replied_at=게시 시각, 실패하면 표시를 지워 다시 시도할 수 있다. 2분 넘은 표시는 멈춘 요청으로 보고 다시 선점을 허용한다.
  const claimCutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data: claimed } = await supabase
    .from("th_comments")
    .update({ replied_at: new Date().toISOString() })
    .eq("id", commentId)
    .eq("user_id", userId)
    .neq("status", "posted")
    .or(`replied_at.is.null,replied_at.lt.${claimCutoff}`)
    .select("id");
  if (!claimed?.length) return { error: "다른 화면에서 이미 처리 중이거나 처리된 답글입니다. 잠시 후 새로고침해주세요." };

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
    await supabase.from("th_comments").update({ status: "failed", replied_at: null }).eq("id", commentId);
    if (message === "THREADS_RECONNECT_REQUIRED") {
      return { error: "쓰레드 계정 연결이 만료되었습니다. 설정 페이지에서 다시 연결해주세요." };
    }
    return { error: message };
  }
}
