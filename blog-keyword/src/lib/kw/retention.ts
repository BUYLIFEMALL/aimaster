// v1.07 (BC-05, 2026-10-22): 분석 기록 보관 규칙 — 만든 지 30일이 지나면 삭제(DB 예약 작업 매시간), 즐겨찾기는 계속 보관(주인님 결정).
// 순수 함수(서버·화면·시험 공용). 예약 작업이 돌기 전에도 목록·열기에서 바로 숨기도록 같은 기준을 쓴다.
export const RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export function retentionCutoff(now: Date = new Date()): string {
  return new Date(now.getTime() - RETENTION_DAYS * DAY_MS).toISOString();
}

/** 보관 중이면 true — 즐겨찾기이거나 만든 지 30일 안 */
export function isRetained(row: { favorite: boolean; created_at: string }, now: Date = new Date()): boolean {
  if (row.favorite) return true;
  const created = new Date(row.created_at).getTime();
  return Number.isFinite(created) && now.getTime() - created < RETENTION_DAYS * DAY_MS;
}

/** 삭제까지 남은 날(올림). 즐겨찾기는 null(삭제 안 함) */
export function daysLeft(row: { favorite: boolean; created_at: string }, now: Date = new Date()): number | null {
  if (row.favorite) return null;
  const left = new Date(row.created_at).getTime() + RETENTION_DAYS * DAY_MS - now.getTime();
  return Math.max(0, Math.ceil(left / DAY_MS));
}
