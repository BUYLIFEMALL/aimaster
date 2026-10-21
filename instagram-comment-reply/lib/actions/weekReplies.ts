"use server";

// v1.35 대시보드 「📊 최근 7일 응대」 막대를 눌렀을 때 그날 게시한 답글 목록(공용 기준 코드 `week-reply-panel`이 부름).
// 읽기 전용: 이용 권한 확인 → 회원 세션(RLS) + user_id 필터, 한국 시간 그날 범위(최근 7일 안만), 최근 50건.
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { previewText, weekDayRange } from "@/lib/weekChart/bucket";
import type { DayReplyResult } from "@/components/weekChart/WeekReplyPanel";

const LIMIT = 50;

export async function loadWeekDayRepliesAction(dayKey: string): Promise<DayReplyResult> {
  const user = await requireProgramAccess();
  const range = weekDayRange(String(dayKey));
  if (!range) return { items: [] };
  const supabase = await createClient();
  const [comments, dms] = await Promise.all([
    supabase
      .from("ig_comments")
      .select("id, author_username, comment_text, generated_reply, replied_at")
      .eq("user_id", user.id)
      .eq("status", "posted")
      .gte("replied_at", range.from)
      .lt("replied_at", range.to)
      .order("replied_at", { ascending: false })
      .limit(LIMIT),
    supabase
      .from("dm_messages")
      .select("id, conversation_id, message_text, generated_reply, replied_at")
      .eq("user_id", user.id)
      .eq("status", "posted")
      .gte("replied_at", range.from)
      .lt("replied_at", range.to)
      .order("replied_at", { ascending: false })
      .limit(LIMIT),
  ]);
  if (comments.error || dms.error) return { error: "그날 목록을 불러오지 못했습니다. 잠시 후 다시 눌러 주세요." };
  const convIds = Array.from(new Set((dms.data ?? []).map((r) => r.conversation_id)));
  const { data: convs } = convIds.length
    ? await supabase.from("dm_conversations").select("id, customer_username").eq("user_id", user.id).in("id", convIds)
    : { data: [] as { id: string; customer_username: string | null }[] };
  const names = new Map((convs ?? []).map((c) => [c.id, c.customer_username]));
  const items = [
    ...(comments.data ?? []).map((r) => ({
      key: `c-${r.id}`,
      tag: "📸 댓글",
      color: "#ec4899",
      author: r.author_username ? `@${r.author_username}` : "익명",
      at: r.replied_at as string,
      comment: previewText(r.comment_text),
      reply: previewText(r.generated_reply),
      href: "/history",
    })),
    ...(dms.data ?? []).map((r) => {
      const name = names.get(r.conversation_id);
      return {
        key: `d-${r.id}`,
        tag: "💌 DM",
        color: "#a855f7",
        author: name ? `@${name}` : "고객",
        at: r.replied_at as string,
        comment: previewText(r.message_text),
        reply: previewText(r.generated_reply),
        href: "/dm/history",
      };
    }),
  ];
  return { items: items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)) };
}
