/**
 * YouTube 하루 할당량 날짜 계산 — 초기화 기준(미국 태평양 자정)으로 「오늘」을 정하고 다음 초기화 시각을 구한다.
 *
 * 출처: boks-youtube-finder (https://github.com/boksajang/boks-youtube-finder, 커밋 3aacecf) services/usage.js — quotaDay, nextResetMs
 *       MIT License © 2026 복사장 (Boksajang) — 전문은 youtube-viral-studio/NOTICE.md
 * 이식: 2026-11-16 영상 담당. 원본은 PC 파일에 쌓지만 여기서는 회원별 DB 표(yvs_youtube_usage)에 쌓는다(search.ts).
 */

/** 검색(search.list) 기본 하루 한도 = 10,000유닛 ÷ 100유닛 */
export const SEARCH_LIMIT = 100;
/** 조회(그 밖의 list 호출) 기본 하루 한도(유닛) */
export const UNIT_LIMIT = 10000;

/** 태평양 시간 기준 오늘 날짜 'YYYY-MM-DD' */
export function quotaDay(now: Date = new Date()): string {
  // en-CA → YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** 다음 초기화 시각(태평양 시간 자정, ms). 서머타임 전환일도 맞도록 1분 단위로 날짜가 바뀌는 시점을 찾는다. */
export function nextResetMs(now: Date = new Date()): number {
  const today = quotaDay(now);
  let lo = now.getTime();
  let hi = lo + 26 * 3600 * 1000;
  while (hi - lo > 60000) {
    const mid = Math.floor((lo + hi) / 2);
    if (quotaDay(new Date(mid)) === today) lo = mid; else hi = mid;
  }
  return hi;
}

export interface UsageSnapshot {
  day: string;
  search: number;
  searchLimit: number;
  units: number;
  unitLimit: number;
  resetAt: number;
}

/** 오늘 남은 검색 횟수(0 미만이면 0) */
export function remainingSearch(snapshot: Pick<UsageSnapshot, "search" | "searchLimit">): number {
  return Math.max(0, snapshot.searchLimit - snapshot.search);
}
