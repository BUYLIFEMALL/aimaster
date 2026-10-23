"use server";

// 2026-10-22 대시보드 「📊 최근 7일 게시」 막대를 눌렀을 때 그날 게시한 글 목록(공용 기준 코드 `week-reply-panel`이 부름).
// 읽기 전용: 이용 권한 확인 → 회원 세션(RLS) + user_id 필터, 게시한 시각(published_at)이 한국 시간 그날 범위(최근 7일 안만), 묶음마다 최근 50건.
// v1.44: 피드·카드뉴스·AI 인플루언서·웹툰·네컷 게시를 함께(src/lib/instaWeek.ts).
import { requireProgramAccess } from "@/lib/access";
import { weekDayRange } from "@/lib/weekChart/bucket";
import { loadInstaDay } from "@/lib/instaWeek";
import type { DayReplyResult } from "@/components/weekChart/WeekReplyPanel";

export async function loadWeekDayPostsAction(dayKey: string): Promise<DayReplyResult> {
  const user = await requireProgramAccess();
  const range = weekDayRange(String(dayKey));
  if (!range) return { items: [] };
  return loadInstaDay(user.id, range);
}
