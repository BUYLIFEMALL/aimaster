"use server";

// v1.29 대시보드 「📊 최근 7일 응대」 막대를 눌렀을 때 그날 게시한 답글 목록(공용 기준 코드 `week-reply-panel`이 부름).
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
  const { data, error } = await supabase
    .from("ytreply_comments")
    .select("id, video_id, author_display_name, comment_text, generated_reply, replied_at")
    .eq("user_id", user.id)
    .eq("status", "posted")
    .gte("replied_at", range.from)
    .lt("replied_at", range.to)
    .order("replied_at", { ascending: false })
    .limit(LIMIT);
  if (error) return { error: "그날 목록을 불러오지 못했습니다. 잠시 후 다시 눌러 주세요." };
  return {
    items: (data ?? []).map((r) => ({
      key: r.id,
      author: r.author_display_name ?? "익명",
      at: r.replied_at as string,
      comment: previewText(r.comment_text),
      reply: previewText(r.generated_reply),
      href: "/history",
    })),
  };
}
