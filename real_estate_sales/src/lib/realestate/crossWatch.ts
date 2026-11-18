// 관심 지역 연계(2026-11-19, docs/PLAN_20261119_CROSS_WATCH.md) — 다른 부동산 프로그램에 등록한 지역을
// 이 프로그램에 「제안」만 한다(자동 등록 없음). 순수 함수만, 시험 tests/crossWatch.test.mjs.

export type CrossSource = "상가" | "매물 알림";

export interface CrossSuggestion {
  sgg_cd: string;
  sgg_nm: string;
  sources: CrossSource[];
}

/**
 * own = 이 프로그램에 이미 켠 시군구 코드, commercial = 상가 감시 시군구 코드,
 * listingCortars = 매물 알림 지역 감시의 네이버 지역 코드(10자리, 앞 5자리가 시군구),
 * known = 이 프로그램이 다룰 수 있는 시군구 목록(모르는 코드는 제안하지 않음).
 */
export function suggestFromOtherPrograms(input: {
  own: Iterable<string>;
  commercial: Iterable<string | null | undefined>;
  listingCortars: Iterable<string | null | undefined>;
  known: readonly { sgg_cd: string; sgg_nm: string }[];
}): CrossSuggestion[] {
  const own = new Set(input.own);
  const names = new Map(input.known.map((d) => [d.sgg_cd, d.sgg_nm]));
  const found = new Map<string, Set<CrossSource>>();
  const add = (code: string, src: CrossSource) => {
    if (!names.has(code) || own.has(code)) return;
    found.set(code, (found.get(code) ?? new Set<CrossSource>()).add(src));
  };
  for (const c of input.commercial) if (c && /^\d{5}$/.test(c)) add(c, "상가");
  for (const c of input.listingCortars) if (c && /^\d{10}$/.test(c)) add(c.slice(0, 5), "매물 알림");
  return [...found.entries()]
    .map(([sgg_cd, s]) => ({ sgg_cd, sgg_nm: names.get(sgg_cd)!, sources: (["상가", "매물 알림"] as CrossSource[]).filter((x) => s.has(x)) }))
    .sort((a, b) => a.sgg_cd.localeCompare(b.sgg_cd));
}
