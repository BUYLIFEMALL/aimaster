"use server";

// 2026-10-22 대시보드 「📊 최근 7일 게시」 막대를 눌렀을 때 그날 게시한 글 목록(공용 기준 코드 `week-reply-panel`이 부름).
// 읽기 전용: 이용 권한 확인 → 회원 세션(RLS) + user_id 필터, 게시한 시각(published_at)이 한국 시간 그날 범위(최근 7일 안만), 최근 50건.
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { previewText, weekDayRange } from "@/lib/weekChart/bucket";
import type { DayReplyResult } from "@/components/weekChart/WeekReplyPanel";

const LIMIT = 50;

export async function loadWeekDayPostsAction(dayKey: string): Promise<DayReplyResult> {
  const user = await requireProgramAccess();
  const range = weekDayRange(String(dayKey));
  if (!range) return { items: [] };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("insta_posts")
    .select("id, caption, ig_permalink, published_at")
    .eq("user_id", user.id)
    .eq("status", "published")
    .gte("published_at", range.from)
    .lt("published_at", range.to)
    .order("published_at", { ascending: false })
    .limit(LIMIT);
  if (error) return { error: "그날 목록을 불러오지 못했습니다. 잠시 후 다시 눌러 주세요." };
  return {
    items: (data ?? []).map((r) => ({
      key: r.id,
      tag: "📸 피드",
      at: r.published_at as string,
      reply: previewText(r.caption),
      href: r.ig_permalink ?? "/posts",
    })),
  };
}
