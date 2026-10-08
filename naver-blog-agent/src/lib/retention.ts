// 네이버 블로그 에이전트 생성 콘텐츠(글감, 본문 원고, 이미지) 30일 보관 정책 유틸리티
// 2026-10-08 주인님 지시: "항목은 글감, 본문, 이미지 등 생성된 콘텐츠 자동 삭제 기능 및 관련 공지 (30일 보관)"
// ai-auto-blog(2026-10-01)의 30일 보관 표준 패턴과 100% 동일한 규칙 적용.

export const RETENTION_DAYS = 30;

// 정책 시작일 (이 시점 이전 생성 데이터도 최소 30일의 유예 기간을 부여하여 회원 데이터 보호)
export const RETENTION_POLICY_START = "2026-10-08T00:00:00+09:00";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 특정 콘텐츠(글감, 원고, 이미지)가 자동 삭제되는 시각 반환
 */
export function retentionDeleteAt(createdAt: string | Date): Date {
  const created = new Date(createdAt).getTime();
  const start = new Date(RETENTION_POLICY_START).getTime();
  // 작성일과 정책 시작일 중 늦은 시각 기준 + 30일
  return new Date(Math.max(created, start) + RETENTION_DAYS * DAY_MS);
}

/**
 * 자동 삭제까지 남은 일수 계산 (오늘 삭제 예정이면 0)
 */
export function retentionDaysLeft(createdAt: string | Date, now = Date.now()): number {
  const target = retentionDeleteAt(createdAt).getTime();
  return Math.max(0, Math.ceil((target - now) / DAY_MS));
}

/**
 * 30일 보관 기간이 만료되어 삭제 대상인지 판정
 */
export function isRetentionExpired(createdAt: string | Date, now = Date.now()): boolean {
  return retentionDaysLeft(createdAt, now) === 0;
}

/**
 * 서버 정리 작업 커트오프 시각 반환
 * 정책 시작 후 30일이 지나기 전에는 아무것도 지우지 않음(회원 유예 보장)
 */
export function retentionCutoff(now = Date.now()): Date | null {
  const cutoff = now - RETENTION_DAYS * DAY_MS;
  const start = new Date(RETENTION_POLICY_START).getTime();
  return cutoff < start ? null : new Date(cutoff);
}
