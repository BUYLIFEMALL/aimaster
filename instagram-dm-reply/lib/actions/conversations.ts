"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { postDmReplyForUser } from "@/lib/dm/post";

export interface PostReplyState {
  error?: string;
  success?: boolean;
}

/** 검토 화면에서 사람이 "답변승인"을 눌렀을 때만 실행된다 — 실제 인스타그램 DM이 발송되는 행동. */
export async function postReplyAction(messageId: string, finalText: string): Promise<PostReplyState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const result = await postDmReplyForUser(supabase, user.id, messageId, finalText);
  if (result.success) {
    await logProgramUsage({ userId: user.id, action: "post_dm_reply" });
  }
  revalidatePath("/conversations");
  return result;
}

export async function skipReplyAction(messageId: string) {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  await supabase.from("dm_messages").update({ status: "skipped" }).eq("id", messageId).eq("user_id", user.id);
  revalidatePath("/conversations");
}
