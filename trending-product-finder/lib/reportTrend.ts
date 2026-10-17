// v1.09: 이미 저장된 리포트들로 "키워드별 기회점수 추이"를 만든다(새 API 호출 없음).
// 같은 키워드라도 카테고리(관심 목록)가 다르면 따로 본다.

export interface TrendReportRow {
  generated_at: string;
  watchlist_id: string;
  items: unknown;
}

export interface TrendPoint { at: string; score: number }
export interface KeywordTrend {
  key: string;
  keyword: string;
  watchlistId: string;
  points: TrendPoint[];
  latest: number;
  first: number;
  delta: number;
}

/** 추이에 쓰는 최대 점 개수(키워드마다 최근 것부터) */
export const TREND_MAX_POINTS = 30;
/** 추이 계산에 쓰는 기간(일) */
export const TREND_DAYS = 90;

function itemsOf(raw: unknown): { keyword: string; opportunityScore: number }[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (i): i is { keyword: string; opportunityScore: number } =>
      !!i && typeof i === "object" && typeof (i as { keyword?: unknown }).keyword === "string" &&
      Number.isFinite((i as { opportunityScore?: unknown }).opportunityScore as number),
  );
}

/**
 * 리포트(생성 시각 순서 무관) → 키워드별 점수 추이. 같은 날 여러 번 만든 리포트는 그날의 마지막 값만 쓴다.
 * 결과는 최신 점수가 높은 순.
 */
export function buildKeywordTrends(reports: TrendReportRow[]): KeywordTrend[] {
  const byKey = new Map<string, { keyword: string; watchlistId: string; byDay: Map<string, TrendPoint> }>();
  const sorted = [...reports].sort((a, b) => a.generated_at.localeCompare(b.generated_at));
  for (const r of sorted) {
    const day = r.generated_at.slice(0, 10);
    for (const item of itemsOf(r.items)) {
      const key = `${r.watchlist_id}::${item.keyword}`;
      let entry = byKey.get(key);
      if (!entry) { entry = { keyword: item.keyword, watchlistId: r.watchlist_id, byDay: new Map() }; byKey.set(key, entry); }
      entry.byDay.set(day, { at: r.generated_at, score: Math.round(item.opportunityScore) });
    }
  }
  const out: KeywordTrend[] = [];
  for (const [key, e] of byKey) {
    const points = [...e.byDay.values()].slice(-TREND_MAX_POINTS);
    const first = points[0].score;
    const latest = points[points.length - 1].score;
    out.push({ key, keyword: e.keyword, watchlistId: e.watchlistId, points, first, latest, delta: latest - first });
  }
  return out.sort((a, b) => b.latest - a.latest || b.delta - a.delta || a.keyword.localeCompare(b.keyword, "ko"));
}

/** 페이지 번호 정리: 숫자가 아니거나 범위를 벗어나면 1~마지막 페이지 안으로 */
export function clampPage(raw: string | string[] | undefined, totalPages: number): number {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(Math.floor(n), Math.max(1, totalPages));
}
