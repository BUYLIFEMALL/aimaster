// 관심 지역 연계 2단계(2026-11-19, real_estate_sales/docs/PLAN_20261119_CROSS_WATCH.md) — 실거래·매물 알림에 등록한 지역을
// 상가 실거래 지역에 「제안」만 한다(자동 등록 없음). 순수 함수만, 시험 tests/crossWatch.test.mjs.
// 「실제로 감시 중」 판정은 각 프로그램이 수집할 때 쓰는 조건과 같게 맞춘다:
//   실거래 real_estate_watch_districts → is_active = true (실거래 api/collect/dispatch와 같음)
//   매물 알림 realty_alert_targets → target_type = 'region' 그리고 enabled = true (매물 알림 api/extension/settings와 같음)

export type CrossSource = "실거래" | "매물 알림";

export interface CrossSuggestion {
  sgg_cd: string;
  sgg_nm: string;
  sources: CrossSource[];
}

export interface SalesWatchRow { sgg_cd: string | null; is_active: boolean | null }
export interface ListingTargetRow { cortar_no: string | null; target_type: string | null; enabled: boolean | null }

export function suggestFromOtherPrograms(input: {
  own: Iterable<string>;
  sales: readonly SalesWatchRow[];
  listing: readonly ListingTargetRow[];
  known: readonly { sgg_cd: string; sgg_nm: string }[];
}): CrossSuggestion[] {
  const own = new Set(input.own);
  const names = new Map(input.known.map((d) => [d.sgg_cd, d.sgg_nm]));
  const found = new Map<string, Set<CrossSource>>();
  const add = (code: string, src: CrossSource) => {
    if (!names.has(code) || own.has(code)) return;
    found.set(code, (found.get(code) ?? new Set<CrossSource>()).add(src));
  };
  for (const r of input.sales) if (r.is_active === true && r.sgg_cd && /^\d{5}$/.test(r.sgg_cd)) add(r.sgg_cd, "실거래");
  for (const r of input.listing) if (r.target_type === "region" && r.enabled === true && r.cortar_no && /^\d{10}$/.test(r.cortar_no)) add(r.cortar_no.slice(0, 5), "매물 알림");
  return [...found.entries()]
    .map(([sgg_cd, s]) => ({ sgg_cd, sgg_nm: names.get(sgg_cd)!, sources: (["실거래", "매물 알림"] as CrossSource[]).filter((x) => s.has(x)) }))
    .sort((a, b) => a.sgg_cd.localeCompare(b.sgg_cd));
}
