import type { ScoredResult } from "./types";

// 같은 검사를 여러 번 했을 때의 변화 추이(순수 함수). 마음 상태 점검은 민감 정보라 호출 쪽에서 제외한다.

export interface TrendRow { test_id: string; result: ScoredResult; created_at: string }
export interface TrendPoint { at: string; scores: Record<string, number> }
export interface Trend {
  testId: string;
  series: { key: string; label: string }[];
  points: TrendPoint[];
}

const MAX_POINTS = 12;

/** 점수형 결과(축 비율·요인 점수)가 있는 검사 중 2회 이상 한 검사만 시간순으로 묶는다. */
export function buildTrends(rows: TrendRow[], exclude: (testId: string) => boolean = () => false): Trend[] {
  const byTest = new Map<string, TrendRow[]>();
  for (const r of rows) {
    if (exclude(r.test_id)) continue;
    if (!r.result?.axes && !r.result?.traits) continue;
    byTest.set(r.test_id, [...(byTest.get(r.test_id) ?? []), r]);
  }
  const out: Trend[] = [];
  for (const [testId, list] of byTest) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => a.created_at.localeCompare(b.created_at)).slice(-MAX_POINTS);
    const series: { key: string; label: string }[] = [];
    const first = sorted[sorted.length - 1].result;
    if (first.axes) for (const a of first.axes) series.push({ key: a.axis, label: `${a.poles[0]} 비율 (${a.poles[0]}/${a.poles[1]})` });
    else if (first.traits) for (const t of first.traits) series.push({ key: t.key, label: t.label });
    const points: TrendPoint[] = sorted.map((r) => {
      const scores: Record<string, number> = {};
      if (r.result.axes) for (const a of r.result.axes) scores[a.axis] = a.firstPct;
      if (r.result.traits) for (const t of r.result.traits) scores[t.key] = t.score;
      return { at: r.created_at, scores };
    });
    out.push({ testId, series, points });
  }
  // 최근에 한 검사가 먼저
  return out.sort((a, b) => b.points[b.points.length - 1].at.localeCompare(a.points[a.points.length - 1].at));
}
