// Threads 콘텐츠 운영 자동화 — 생성 콘텐츠(글감·보관함 글·이미지) 30일 보관 정책 (v1.76)
// naver-blog-agent(src/lib/retention.ts)와 같은 규칙: 정책 시작일 이전 데이터도 시작일부터 최소 30일 유예를 준다.
// 이 파일은 화면(클라이언트)과 서버 정리 작업이 함께 쓰므로 server-only를 붙이지 않는다.

export const RETENTION_DAYS = 30;

/** 정책 시작일(KST). 이 시각 이전에 만든 콘텐츠도 시작일 + 30일까지는 지우지 않는다. */
export const RETENTION_POLICY_START = "2026-10-08T00:00:00+09:00";

const DAY_MS = 24 * 60 * 60 * 1000;

/** 콘텐츠가 자동 삭제되는 시각 = max(작성일, 정책 시작일) + 30일 */
export function retentionDeleteAt(createdAt: string | Date): Date {
  const created = new Date(createdAt).getTime();
  const start = new Date(RETENTION_POLICY_START).getTime();
  return new Date(Math.max(created, start) + RETENTION_DAYS * DAY_MS);
}

/** 자동 삭제까지 남은 일수(오늘 삭제 예정이면 0) */
export function retentionDaysLeft(createdAt: string | Date, now = Date.now()): number {
  return Math.max(0, Math.ceil((retentionDeleteAt(createdAt).getTime() - now) / DAY_MS));
}

/** 서버 정리 작업의 기준 시각. 정책 시작 후 30일이 지나기 전에는 null(아무것도 지우지 않음). */
export function retentionCutoff(now = Date.now()): Date | null {
  const cutoff = now - RETENTION_DAYS * DAY_MS;
  return cutoff < new Date(RETENTION_POLICY_START).getTime() ? null : new Date(cutoff);
}
