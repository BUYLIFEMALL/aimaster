// 관심 지역 연계 3단계(2026-11-19, real_estate_sales/docs/PLAN_20261119_CROSS_WATCH.md) — 실거래·상가에 켜 둔 시군구를
// 매물 알림 「지역(시·구·동)으로 추가하기」에 제안만 한다. 매물 알림 지역 감시는 동(cortar_no 10자리) 단위라 자동 추가는 하지 않고,
// 누르면 시도·시군구만 미리 골라 두고 동은 회원이 고른다. 순수 함수만, 시험 tests/crossWatch.test.ts.
// 「실제로 감시 중」 판정은 각 프로그램 수집 조건과 같게: 실거래 real_estate_watch_districts.is_active, 상가 commercial_land_watch.is_active.

export type CrossSource = "실거래" | "상가";

export interface CrossSuggestion {
  sgg_cd: string; // 5자리 시군구(public/regions.json의 g.c와 같은 형식)
  sources: CrossSource[];
}

export interface WatchRow { sgg_cd: string | null; is_active: boolean | null }
export interface OwnTargetRow { target_type: string | null; cortar_no: string | null; enabled: boolean | null }

/** own = 이 회원의 매물 알림 감시 행. 켜진 지역 감시(동)가 하나라도 있는 시군구는 이미 감시 중으로 보고 제안하지 않는다. */
export function suggestRegionsFromOtherPrograms(input: {
  own: readonly OwnTargetRow[];
  sales: readonly WatchRow[];
  commercial: readonly WatchRow[];
}): CrossSuggestion[] {
  const covered = new Set(
    input.own
      .filter((t) => t.target_type === "region" && t.enabled === true && t.cortar_no && /^\d{10}$/.test(t.cortar_no))
      .map((t) => t.cortar_no!.slice(0, 5)),
  );
  const found = new Map<string, Set<CrossSource>>();
  const add = (rows: readonly WatchRow[], src: CrossSource) => {
    for (const r of rows) {
      if (r.is_active !== true || !r.sgg_cd || !/^\d{5}$/.test(r.sgg_cd) || covered.has(r.sgg_cd)) continue;
      found.set(r.sgg_cd, (found.get(r.sgg_cd) ?? new Set<CrossSource>()).add(src));
    }
  };
  add(input.sales, "실거래");
  add(input.commercial, "상가");
  return [...found.entries()]
    .map(([sgg_cd, s]) => ({ sgg_cd, sources: (["실거래", "상가"] as CrossSource[]).filter((x) => s.has(x)) }))
    .sort((a, b) => a.sgg_cd.localeCompare(b.sgg_cd));
}
