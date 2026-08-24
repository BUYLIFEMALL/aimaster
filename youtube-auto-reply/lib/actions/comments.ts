"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { runCommentSync, type RunCommentSyncResult } from "@/lib/comments/sync";
import { postCommentReplyForUser } from "@/lib/comments/post";

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

/** 검토 화면에서 사람이 "답변승인"을 눌렀을 때만 실행된다 — 실제 유튜브 공개 댓글이 달리는 행동. */
export async function postReplyAction(commentId: string, finalText: string): Promise<PostReplyState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const result = await postCommentReplyForUser(supabase, user.id, commentId, finalText);
  if (result.success) {
    await logProgramUsage({ userId: user.id, action: "post_reply" });
  }
  revalidatePath("/comments");
  return result;
}

export async function skipReplyAction(commentId: string) {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  await supabase.from("ytreply_comments").update({ status: "skipped" }).eq("id", commentId).eq("user_id", user.id);
  revalidatePath("/comments");
}
