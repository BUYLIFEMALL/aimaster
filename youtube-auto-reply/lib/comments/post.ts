import "server-only";
import { getYtReplyAccount } from "@/lib/youtube/memberAccount";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { getUserApiKey } from "@/lib/apiKeys";
import { getValidYoutubeAccessToken } from "@/lib/actions/youtube";
import { postCommentReply } from "@/lib/youtube/client";

export interface PostCommentReplyResult {
  error?: string;
  success?: boolean;
}

/**
 * 실제로 유튜브에 답글을 게시하는 핵심 로직. 검토 화면의 "답변승인" 버튼(lib/actions/comments.ts)과
 * 텔레그램 승인 버튼(app/api/telegram/webhook/[userId]/route.ts) 양쪽에서 공유한다 — 어느
 * 경로로 오든 "사람이 명시적으로 승인한 뒤에만 게시"라는 원칙은 동일하게 지킨다.
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
    .from("ytreply_comments")
    .select("id, youtube_comment_id, status")
    .eq("id", commentId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!comment) return { error: "댓글을 찾을 수 없습니다." };
  if (comment.status === "posted") return { error: "이미 게시된 답글입니다." };

  // v1.14: 공용 연결 계정(채널 관리 권한·같은 Google 앱) → 없으면 ytreply_accounts
  const account = await getYtReplyAccount(supabase, userId);
  if (!account) return { error: "유튜브 채널이 연결되어 있지 않습니다." };

  const clientId = await getUserApiKey(supabase, userId, "google_client_id");
  const clientSecret = await getUserApiKey(supabase, userId, "google_client_secret");
  if (!clientId || !clientSecret) {
    return { error: "설정 페이지에서 Google OAuth Client ID/Secret을 먼저 등록해주세요." };
  }

  try {
    const accessToken = await getValidYoutubeAccessToken(supabase, userId, account, clientId, clientSecret);
    const { replyId } = await postCommentReply(accessToken, comment.youtube_comment_id, text, userId);

    await supabase
      .from("ytreply_comments")
      .update({ status: "posted", posted_reply_id: replyId, generated_reply: text, replied_at: new Date().toISOString() })
      .eq("id", commentId);

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "답글 게시 중 오류가 발생했습니다.";
    await supabase.from("ytreply_comments").update({ status: "failed" }).eq("id", commentId);
    if (message === "YOUTUBE_RECONNECT_REQUIRED") {
      return { error: "유튜브 채널 연결이 만료되었습니다. 설정 페이지에서 다시 연결해주세요." };
    }
    return { error: message };
  }
}
