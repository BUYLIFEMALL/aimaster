"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { loadDayReplied, loadSourceAccess, PLATFORM_SOURCE, SOURCE_PROGRAMS, type InboxPlatform, type RepliedItem } from "@/lib/inbox/load";
import { postCommentReplyForUser as postInstagramComment } from "@/lib/comments/instagramPost";
import { postCommentReplyForUser as postThreadsComment } from "@/lib/comments/threadsPost";
import { postCommentReplyForUser as postYoutubeComment } from "@/lib/comments/youtubePost";
import { postDmReplyForUser } from "@/lib/dmApp/dm/post";

export interface InboxActionState {
  success?: boolean;
  error?: string;
}

const PLATFORMS: InboxPlatform[] = ["ig_comment", "ig_dm", "threads", "youtube"];

const TABLE: Record<InboxPlatform, "ig_comments" | "dm_messages" | "th_comments" | "ytreply_comments"> = {
  ig_comment: "ig_comments",
  ig_dm: "dm_messages",
  threads: "th_comments",
  youtube: "ytreply_comments",
};

/**
 * 받은편지함 권한 + 그 플랫폼의 원래 댓글 프로그램 권한을 둘 다 확인한다.
 * 원래 프로그램 권한이 없으면 받은편지함으로 우회해 게시할 수 없다.
 */
async function guard(platform: InboxPlatform) {
  if (!PLATFORMS.includes(platform)) return { error: "알 수 없는 항목입니다." } as const;
  const user = await requireProgramAccess();
  const access = await loadSourceAccess(user.id);
  const source = SOURCE_PROGRAMS[PLATFORM_SOURCE[platform]];
  if (!access[PLATFORM_SOURCE[platform]]) {
    return { error: `${source.name} 이용 권한이 있어야 이 항목을 처리할 수 있습니다.` } as const;
  }
  return { user } as const;
}

/**
 * 「답변승인」 — 원래 댓글 프로그램과 같은 게시 함수(공용 기준 코드 사본)로 실제 공개 답글·DM을 보낸다.
 * 게시 함수가 「이미 게시됨」을 거부하고, 원래 프로그램·텔레그램도 같은 행 상태를 보므로 이중 게시되지 않는다.
 */
export async function approveInboxItemAction(platform: InboxPlatform, id: string, finalText: string): Promise<InboxActionState> {
  const g = await guard(platform);
  if ("error" in g) return { error: g.error };
  const text = finalText.trim();
  if (!text) return { error: "보낼 내용을 입력해주세요." };

  const supabase = await createClient();
  const result =
    platform === "ig_comment"
      ? await postInstagramComment(supabase, g.user.id, id, text)
      : platform === "ig_dm"
        ? await postDmReplyForUser(supabase, g.user.id, id, text)
        : platform === "threads"
          ? await postThreadsComment(supabase, g.user.id, id, text)
          : await postYoutubeComment(supabase, g.user.id, id, text);

  if ("error" in result && result.error) return { error: result.error };
  await logProgramUsage({ userId: g.user.id, action: `approve_${platform}` });
  revalidatePath("/inbox");
  return { success: true };
}

/** 「건너뛰기」 — 원래 프로그램의 건너뛰기와 같다(검토 대기인 본인 항목만 skipped로). */
export async function skipInboxItemAction(platform: InboxPlatform, id: string): Promise<InboxActionState> {
  const g = await guard(platform);
  if ("error" in g) return { error: g.error };
  const supabase = await createClient();
  const { error } = await supabase
    .from(TABLE[platform])
    .update({ status: "skipped" })
    .eq("id", id)
    .eq("user_id", g.user.id)
    .eq("status", "pending_review");
  if (error) return { error: "건너뛰지 못했습니다. 잠시 후 다시 시도해주세요." };
  revalidatePath("/inbox");
  return { success: true };
}

/** v1.04 「되돌리기」 — 방금 건너뛴 본인 항목(skipped)만 다시 검토 대기로. 게시된 항목은 건드리지 않는다. */
export async function unskipInboxItemAction(platform: InboxPlatform, id: string): Promise<InboxActionState> {
  const g = await guard(platform);
  if ("error" in g) return { error: g.error };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE[platform])
    .update({ status: "pending_review" })
    .eq("id", id)
    .eq("user_id", g.user.id)
    .eq("status", "skipped")
    .select("id");
  if (error || !data?.length) return { error: "되돌리지 못했습니다. 이미 다른 화면에서 처리됐을 수 있어요." };
  revalidatePath("/inbox");
  return { success: true };
}

/** v1.07 그래프 막대를 눌렀을 때 그날 답한 목록 — 읽기 전용, 받은편지함 권한 + 원래 프로그램 권한 있는 플랫폼만. */
export async function loadDayRepliedAction(dayKey: string): Promise<{ items?: RepliedItem[]; error?: string }> {
  const user = await requireProgramAccess();
  const access = await loadSourceAccess(user.id);
  try {
    return { items: await loadDayReplied(user.id, access, String(dayKey)) };
  } catch {
    return { error: "그날 목록을 불러오지 못했습니다. 잠시 후 다시 눌러 주세요." };
  }
}
