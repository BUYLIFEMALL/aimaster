// RQ-B5 주소 리포트 2차(2026-11-05, 플랜 docs/PLAN_20261105_RQ_B5_NONRES_REPORT_MAP.md): 상가·건물·토지 거래 요약. 순수 함수만(시험 대상).
// 다른 파일을 불러오지 않는다(node 시험이 확장자 없는 import를 못 읽음). 응답 칸 읽기 규칙은 상가 프로그램
// `commercial-land-trade-alert/src/lib/trades/parse.ts`와 같다(상업업무용·공장창고: buildingAr·buildingUse·buildingType·plottageAr, 토지: dealArea·jimok).
// 사전 검증(0단계): 집합 상가는 지번 공개라 같은 지번 거래를 묶고, 통건물·토지는 지번이 가려져 같은 동(토지는 시군구까지) 비교만 한다.

type Raw = Record<string, unknown>;
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());
const num = (v: unknown): number | null => {
  const s = str(v).replace(/,/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const SQM_PER_PYEONG = 3.3058;

export const NONRES_BUILDING_MONTHS = 12;
export const NONRES_LAND_MONTHS = 6; // 토지 자료는 하루 호출 한도가 1,000건이라 리포트는 6달만
export const NONRES_MIN_SAMPLES = 5;

export interface NonResDeal {
  day: string; // yyyymmdd
  dong: string;
  jibun: string;
  category: string; // 건물 용도 또는 토지 지목
  buildingType: string | null; // 집합·일반(건물만)
  amount: number; // 만 원
  area: number | null; // 건물면적 또는 거래면적 ㎡
  perPyeong: number | null; // 만 원
  floor: string;
}

export interface UseGroup {
  label: string; // 「집합 · 제1종근린생활」 또는 지목
  count: number;
  median: number | null; // 평당가 중간값(만 원), 표본 5건 미만이면 null
  min: number | null;
  max: number | null;
  scope: "동" | "시군구";
}

export interface NonResReport {
  dong: string;
  jibun: string;
  buildingMonths: number;
  landMonths: number;
  sameLot: NonResDeal[]; // 같은 지번 거래(집합 상가 위주), 최신순 최대 20
  buildingGroups: UseGroup[]; // 같은 동, 건수 많은 순
  landGroups: UseGroup[]; // 같은 동에 5건 이상인 지목은 동, 아니면 시군구
}

/** 필지 번호(19자리) → 「143-16」 「산 12」 같은 지번 */
export function jibunFromPnu(pnu: string): string {
  if (!/^\d{19}$/.test(pnu)) return "";
  const bun = Number(pnu.slice(11, 15));
  const ji = Number(pnu.slice(15, 19));
  return `${pnu[10] === "2" ? "산" : ""}${bun}${ji ? `-${ji}` : ""}`;
}

/** 법정동 코드 표(동 이름 → 뒤 5자리)에서 필지 번호의 동 이름 찾기 */
export function dongFromPnu(table: Record<string, string> | undefined, pnu: string): string {
  if (!table || !/^\d{19}$/.test(pnu)) return "";
  const code = pnu.slice(5, 10);
  return Object.entries(table).find(([, c]) => c === code)?.[0] ?? "";
}

/** 국토부 한 줄 → 거래. 해제(취소)·지분 거래·금액 없는 줄은 null(통계를 왜곡) */
export function nonResDeal(raw: Raw, kind: "building" | "land"): NonResDeal | null {
  if (str(raw.cdealType) || str(raw.shareDealingType).includes("지분")) return null;
  const amount = num(raw.dealAmount);
  const y = str(raw.dealYear);
  if (!amount || y.length !== 4) return null;
  const area = kind === "building" ? num(raw.buildingAr) : num(raw.dealArea);
  return {
    day: `${y}${str(raw.dealMonth).padStart(2, "0")}${str(raw.dealDay).padStart(2, "0")}`,
    dong: str(raw.umdNm),
    jibun: str(raw.jibun),
    category: str(kind === "building" ? raw.buildingUse : raw.jimok) || "기타",
    buildingType: kind === "building" ? str(raw.buildingType) || null : null,
    amount,
    area,
    perPyeong: area && area > 0 ? Math.round((amount / (area / SQM_PER_PYEONG)) * 10) / 10 : null,
    floor: str(raw.floor),
  };
}

function median(values: number[]): number | null {
  if (values.length < NONRES_MIN_SAMPLES) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function group(deals: NonResDeal[], keyOf: (d: NonResDeal) => string, scope: UseGroup["scope"]): UseGroup[] {
  const m = new Map<string, number[]>();
  const counts = new Map<string, number>();
  for (const d of deals) {
    const k = keyOf(d);
    counts.set(k, (counts.get(k) ?? 0) + 1);
    if (d.perPyeong !== null) m.set(k, [...(m.get(k) ?? []), d.perPyeong]);
  }
  return [...counts.entries()]
    .map(([label, count]) => {
      const v = m.get(label) ?? [];
      return { label, count, median: median(v), min: v.length ? Math.min(...v) : null, max: v.length ? Math.max(...v) : null, scope };
    })
    .sort((a, b) => b.count - a.count);
}

export function summarizeNonRes(buildingRaw: Raw[], landRaw: Raw[], dong: string, jibun: string): NonResReport {
  const bld = buildingRaw.map((r) => nonResDeal(r, "building")).filter((d): d is NonResDeal => !!d);
  const land = landRaw.map((r) => nonResDeal(r, "land")).filter((d): d is NonResDeal => !!d);
  const sameLot = jibun && !jibun.includes("*") ? bld.filter((d) => d.dong === dong && d.jibun === jibun).sort((a, b) => b.day.localeCompare(a.day)).slice(0, 20) : [];
  const buildingGroups = group(bld.filter((d) => d.dong === dong), (d) => `${d.buildingType ?? "-"} · ${d.category}`, "동");
  // 토지는 동 표본이 적어(검증 5곳 모두 5건 미만) 지목별로 동에 5건 이상이면 동, 아니면 시군구 값을 쓴다
  const dongLand = group(land.filter((d) => d.dong === dong), (d) => d.category, "동");
  const sggLand = group(land, (d) => d.category, "시군구");
  const landGroups = sggLand.map((g) => dongLand.find((x) => x.label === g.label && x.count >= NONRES_MIN_SAMPLES) ?? g);
  return { dong, jibun, buildingMonths: NONRES_BUILDING_MONTHS, landMonths: NONRES_LAND_MONTHS, sameLot, buildingGroups, landGroups };
}
