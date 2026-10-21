// 서버 보관함 보관 기간(v1.31, 회원 생성 데이터 30일 규칙): 「직접 삭제할 때까지(0)」·90일 선택지를 없애고 최대 30일.
// 옛 무기한(null)·90일 사진도 「만든 날 + 30일」에 지운다(effectiveExpiry·정리 작업의 created_at 조건).
export const RETENTION_DAYS = [7, 30] as const;
export const MAX_RETENTION_DAYS = 30;
const DAY_MS = 86_400_000;

export function normalizeRetention(v: unknown): number {
  return typeof v === "number" && (RETENTION_DAYS as readonly number[]).includes(v) ? v : MAX_RETENTION_DAYS;
}

export function expiresAtFor(days: number, now: Date = new Date()): string {
  const d = days > 0 && days <= MAX_RETENTION_DAYS ? days : MAX_RETENTION_DAYS;
  return new Date(now.getTime() + d * DAY_MS).toISOString();
}

/** 실제 만료 시각(ISO): 저장된 만료일과 「만든 날 + 30일」 중 빠른 쪽 */
export function effectiveExpiry(createdAt: string, expiresAt: string | null): string {
  const cap = new Date(createdAt).getTime() + MAX_RETENTION_DAYS * DAY_MS;
  const own = expiresAt ? new Date(expiresAt).getTime() : Number.POSITIVE_INFINITY;
  const t = Math.min(Number.isNaN(own) ? Number.POSITIVE_INFINITY : own, Number.isFinite(cap) ? cap : Number.POSITIVE_INFINITY);
  return Number.isFinite(t) ? new Date(t).toISOString() : new Date(Date.now() + MAX_RETENTION_DAYS * DAY_MS).toISOString();
}

/** 정리 기준: 만든 지 30일 지난 시각(ISO) */
export function createdCutoff(now: Date = new Date()): string {
  return new Date(now.getTime() - MAX_RETENTION_DAYS * DAY_MS).toISOString();
}
