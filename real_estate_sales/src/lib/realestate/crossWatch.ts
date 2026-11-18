// 관심 지역 연계(2026-11-19, docs/PLAN_20261119_CROSS_WATCH.md) — 다른 부동산 프로그램에 등록한 지역을
// 이 프로그램에 「제안」만 한다(자동 등록 없음). 순수 함수만, 시험 tests/crossWatch.test.mjs.
// 「실제로 감시 중」 판정은 각 프로그램이 수집할 때 쓰는 조건과 같게 맞춘다(2026-11-19 보완, Master msg_812736bb6257):
//   상가 commercial_land_watch → is_active = true (상가 api/collect/dispatch와 같음)
//   매물 알림 realty_alert_targets → target_type = 'region' 그리고 enabled = true (매물 알림 api/extension/settings와 같음)

export type CrossSource = "상가" | "매물 알림";

export interface CrossSuggestion {
  sgg_cd: string;
  sgg_nm: string;
  sources: CrossSource[];
}

export interface CommercialWatchRow { sgg_cd: string | null; is_active: boolean | null }
export interface ListingTargetRow { cortar_no: string | null; target_type: string | null; enabled: boolean | null }

/**
 * own = 이 프로그램에 이미 켠 시군구 코드, commercial = 상가 감시 행, listing = 매물 알림 감시 행,
 * known = 이 프로그램이 다룰 수 있는 시군구 목록(모르는 코드는 제안하지 않음). 꺼진 감시는 제안하지 않는다.
 */
export function suggestFromOtherPrograms(input: {
  own: Iterable<string>;
  commercial: readonly CommercialWatchRow[];
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
  for (const r of input.commercial) if (r.is_active === true && r.sgg_cd && /^\d{5}$/.test(r.sgg_cd)) add(r.sgg_cd, "상가");
  for (const r of input.listing) if (r.target_type === "region" && r.enabled === true && r.cortar_no && /^\d{10}$/.test(r.cortar_no)) add(r.cortar_no.slice(0, 5), "매물 알림");
  return [...found.entries()]
    .map(([sgg_cd, s]) => ({ sgg_cd, sgg_nm: names.get(sgg_cd)!, sources: (["상가", "매물 알림"] as CrossSource[]).filter((x) => s.has(x)) }))
    .sort((a, b) => a.sgg_cd.localeCompare(b.sgg_cd));
}
