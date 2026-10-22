// v1.32 점검 지점 보관 — 저장 값 검증·이전/지금 비교. 순수 함수(시험 대상)

export interface CheckSpot { x: number; y: number; diff: number | null; at: string }
export const MAX_CHECK_SPOTS = 8;

const clampPct = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(Math.min(100, Math.max(0, v)) * 10) / 10 : null);

/** 밖에서 온 값(요청 본문·DB)을 검사해 올바른 지점만 최대 8곳 남긴다 */
export function cleanCheckSpots(raw: unknown, now: Date = new Date()): CheckSpot[] {
  if (!Array.isArray(raw)) return [];
  const out: CheckSpot[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const x = clampPct(o.x);
    const y = clampPct(o.y);
    if (x === null || y === null) continue;
    const diff = clampPct(o.diff);
    const at = typeof o.at === "string" && !Number.isNaN(Date.parse(o.at)) ? new Date(o.at).toISOString() : now.toISOString();
    out.push({ x, y, diff, at });
    if (out.length >= MAX_CHECK_SPOTS) break;
  }
  return out;
}

/** 이전 차이 → 지금 차이 변화. 둘 중 하나라도 없으면 null. 0.5%p 안쪽은 같음 */
export function spotChange(prev: number | null, now: number | null): { delta: number; trend: "better" | "worse" | "same" } | null {
  if (prev === null || now === null) return null;
  const delta = Math.round((now - prev) * 10) / 10;
  return { delta, trend: Math.abs(delta) < 0.5 ? "same" : delta < 0 ? "better" : "worse" };
}
