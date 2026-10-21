// 옷장·룩 30일 보관(v1.11, 회원 생성 데이터 30일 규칙 — D-57-01). 기준 시각은 처음 저장한 때이며, 고쳐 저장해도 늘어나지 않는다.
export const RETENTION_DAYS = 30;
export const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

/** 처음 저장한 시각(ts)으로부터 30일이 지났는가. 시각이 없거나 잘못된 옛 자료는 만료로 보지 않고 지금부터 다시 센다. */
export function isExpired(ts: number | undefined, now: number = Date.now()): boolean {
  return typeof ts === "number" && Number.isFinite(ts) && now - ts > RETENTION_MS;
}

/** 다시 저장할 때 쓸 처음 저장 시각: 이미 있으면 그대로, 없으면 지금 */
export function keepFirstSavedAt(existing: number | undefined, now: number = Date.now()): number {
  return typeof existing === "number" && Number.isFinite(existing) ? existing : now;
}
