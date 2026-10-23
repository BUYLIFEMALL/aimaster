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

// v1.34 추세 기록: 저장된 점검 지점이 있을 때 새로 생성할 때마다 평균 차이를 남긴다(최근 20회)
export interface TrendPoint { at: string; avg: number; n: number; /** v1.35: 그 회차에 쓴 프롬프트 원문(최대 2,000자 — 편집 칸으로 다시 불러올 수 있게) */ prompt?: string }
export const MAX_TREND_PROMPT = 2000;
/** 화면에 보여 줄 프롬프트 길이 */
export const TREND_PROMPT_PREVIEW = 120;
export const MAX_TREND = 20;

/** 밖에서 온 값을 검사해 올바른 점만, 최근 20개 남긴다 */
export function cleanTrend(raw: unknown): TrendPoint[] {
  if (!Array.isArray(raw)) return [];
  const out: TrendPoint[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const avg = clampPct(o.avg);
    const n = typeof o.n === "number" && Number.isInteger(o.n) && o.n > 0 && o.n <= MAX_CHECK_SPOTS ? o.n : null;
    if (avg === null || n === null || typeof o.at !== "string" || Number.isNaN(Date.parse(o.at))) continue;
    const prompt = typeof o.prompt === "string" ? o.prompt.trim().slice(0, MAX_TREND_PROMPT) : "";
    out.push(prompt ? { at: new Date(o.at).toISOString(), avg, n, prompt } : { at: new Date(o.at).toISOString(), avg, n });
  }
  return out.slice(-MAX_TREND);
}

/** 새 점을 붙이고 최근 20개만 남긴다 */
export function appendTrend(list: unknown, point: unknown): TrendPoint[] {
  return cleanTrend([...cleanTrend(list), point]);
}

/** 작은 꺾은선 그래프 좌표(SVG polyline points). 차이가 클수록 아래, 줄어들수록 위 — 원본에 가까워지면 선이 올라간다 */
export function sparklinePoints(values: number[], width: number, height: number, pad = 3): string {
  return sparklineXY(values, width, height, pad).map(([x, y]) => `${x},${y}`).join(" ");
}

/** v1.35: 그래프 점 좌표 — 점을 눌러 그 회차를 고를 때 쓴다 */
export function sparklineXY(values: number[], width: number, height: number, pad = 3): [number, number][] {
  if (!values.length) return [];
  const max = Math.max(...values), min = Math.min(...values);
  const span = max - min || 1;
  const step = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
  return values.map((v, i) => {
    const x = values.length > 1 ? pad + i * step : width / 2;
    const y = pad + ((v - min) / span) * (height - pad * 2);
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  });
}

/** v1.35: 화면용 프롬프트 미리보기(공백 정리, 120자 + …) */
export function promptPreview(prompt: string): string {
  const one = prompt.replace(/\s+/g, " ").trim();
  return one.length > TREND_PROMPT_PREVIEW ? `${one.slice(0, TREND_PROMPT_PREVIEW)}…` : one;
}

/** v1.35: 평균 차이가 가장 낮은(원본에 가장 가까운) 회차 — 같으면 최근 회차. 없으면 -1 */
export function bestTrendIndex(values: number[]): number {
  let best = -1;
  values.forEach((v, i) => { if (best < 0 || v <= values[best]) best = i; });
  return best;
}
