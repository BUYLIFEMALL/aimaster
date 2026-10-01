// BLOG 보관 기간 — 글(제목·본문)과 이미지 모두 만든 날부터 30일만 보관한다(2026-10-01 주인님 지시: 데이터 누적 방지).
// 서버 정리 작업(app/api/cron/cleanup-images)과 회원 안내 문구·삭제 예정일 표시가 모두 이 파일의 값을 쓴다.
export const RETENTION_DAYS = 30
/** @deprecated RETENTION_DAYS와 같은 값(이미지 전용 이름이 쓰이던 때의 별칭) */
export const IMAGE_RETENTION_DAYS = RETENTION_DAYS

// 정책 시작일. 이미 30일이 지난 기존 글도 이 날부터 30일 유예를 준다(주인님 선택 — 안내를 보고 옮길 시간을 주기 위해).
// 즉 실제 삭제 기준일 = max(글 작성일, 정책 시작일) + 30일.
export const RETENTION_POLICY_START = '2026-10-01T00:00:00+09:00'

const DAY_MS = 24 * 60 * 60 * 1000

/** 이 글(또는 이미지)이 삭제되는 시각 */
export function retentionDeleteAt(createdAt: string | Date): Date {
  const created = new Date(createdAt).getTime()
  const start = new Date(RETENTION_POLICY_START).getTime()
  return new Date(Math.max(created, start) + RETENTION_DAYS * DAY_MS)
}

/** 삭제까지 남은 날 수(오늘 삭제 예정이면 0) */
export function retentionDaysLeft(createdAt: string | Date, now = Date.now()): number {
  return Math.max(0, Math.ceil((retentionDeleteAt(createdAt).getTime() - now) / DAY_MS))
}

/** 이 시각보다 먼저 만들어진 글·이미지는 지금 지운다(정책 시작 후 30일이 지나기 전에는 아무것도 지우지 않음). */
export function retentionCutoff(now = Date.now()): Date | null {
  const cutoff = now - RETENTION_DAYS * DAY_MS
  const start = new Date(RETENTION_POLICY_START).getTime()
  return cutoff < start ? null : new Date(cutoff)
}
