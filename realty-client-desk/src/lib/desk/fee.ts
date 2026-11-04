// D5(2026-11-03, v1.06): 중개보수 상한 계산(순수 함수 — node --test로 시험).
// 근거: 공인중개사법 제32조, 시행규칙 제20조(제1항 별표 1 주택 / 제4항 별표 2 오피스텔·그 외), 국토교통부 마이홈 「중개수수료」 게시 요율(2026-11-03 확인).
// 주택 요율은 시·도 조례로 정하므로 지역에 따라 다를 수 있다 — 화면에 「조례 확인」 안내. 상한 안에서 의뢰인과 협의해 정한다. 부가세는 별도(일반과세자 10%).
export const FEE_KINDS = ["주택", "오피스텔", "그 외(상가·토지 등)"] as const;
export type FeeKind = (typeof FEE_KINDS)[number];
export type FeeDeal = "매매" | "전세" | "월세";

// 시·도 조례(주택만 해당 — 오피스텔·그 외는 시행규칙 별표 2로 전국 같음). 2021-10-19 개정 때 「조례로 ±0.1%p 가감」 조항이 빠져
// 시·도 조례는 별표 1 요율을 그대로 반영한다. checked = 공식 게시본과 직접 대조한 곳(2026-11-03), 나머지는 조례 원문 확인 안내.
export const REGIONS = ["서울특별시", "부산광역시", "대구광역시", "인천광역시", "광주광역시", "대전광역시", "울산광역시", "세종특별자치시", "경기도", "강원특별자치도", "충청북도", "충청남도", "전북특별자치도", "전라남도", "경상북도", "경상남도", "제주특별자치도"] as const;
export const REGION_CHECKED: Partial<Record<(typeof REGIONS)[number], string>> = {
  서울특별시: "서울시 부동산정보광장 게시 요율과 같음(서울특별시 주택중개보수 등에 관한 조례 별표 1, 2021-12-30 시행)",
  충청남도: "공주시청 게시 요율과 같음(충청남도 주택의 중개보수 등에 관한 조례 별표, 2021-10-19 시행)",
  충청북도: "충청북도 조례 개정(시행규칙 개정 반영, 구간 6단계) 공고와 같음",
};
export function regionNote(region: string): string {
  const checked = REGION_CHECKED[region as (typeof REGIONS)[number]];
  return checked ? `✅ ${checked}` : `${region} 조례도 시행규칙 별표 1 요율을 따릅니다. 원문은 국가법령정보센터 자치법규에서 「${region} 주택 중개보수 등에 관한 조례」로 확인하세요.`;
}

type Band = { under: number; rate: number; cap: number | null }; // under: 만 원(이 금액 미만), cap: 원
const HOUSE_SALE: Band[] = [
  { under: 5_000, rate: 0.006, cap: 250_000 },
  { under: 20_000, rate: 0.005, cap: 800_000 },
  { under: 90_000, rate: 0.004, cap: null },
  { under: 120_000, rate: 0.005, cap: null },
  { under: 150_000, rate: 0.006, cap: null },
  { under: Infinity, rate: 0.007, cap: null },
];
const HOUSE_LEASE: Band[] = [
  { under: 5_000, rate: 0.005, cap: 200_000 },
  { under: 10_000, rate: 0.004, cap: 300_000 },
  { under: 60_000, rate: 0.003, cap: null },
  { under: 120_000, rate: 0.004, cap: null },
  { under: 150_000, rate: 0.005, cap: null },
  { under: Infinity, rate: 0.006, cap: null },
];

/** 거래금액(만 원): 매매는 가격, 전세는 보증금, 월세는 보증금 + 월세×100(5천만 미만이면 ×70) */
export function dealBase(deal: FeeDeal, price: number, monthly = 0): number {
  if (deal !== "월세" || !monthly) return price;
  const b = price + monthly * 100;
  return b < 5_000 ? price + monthly * 70 : b;
}

// v1.09(2026-11-04 현장 피드백): 부가세는 사업자 과세 유형에 따라 다르다.
// 일반과세자 10%. 간이과세자는 공급대가 × 업종별 부가가치율 × 10% — 부동산중개업 부가가치율 40%(부가가치세법 시행령 제111조②) → 4%.
export const VAT_TYPES = [
  { key: "general", label: "일반과세자 (부가세 10%)", rate: 0.1 },
  { key: "simple", label: "간이과세자 (부가세 4%)", rate: 0.04 },
  { key: "none", label: "부가세 없이 보기", rate: 0 },
] as const;
export type VatType = (typeof VAT_TYPES)[number]["key"];
export const vatOf = (feeWon: number, type: VatType) => Math.floor(feeWon * (VAT_TYPES.find((v) => v.key === type)?.rate ?? 0));

/** 매물 유형 → 중개보수 계산 종류. 분양권은 주택 요율(거래금액 = 이미 낸 계약금·중도금 + 프리미엄) */
export function feeKindOf(propertyType: string): FeeKind {
  if (propertyType === "오피스텔") return "오피스텔";
  if (["아파트", "다세대/빌라", "다가구/주택", "분양권", "빌라·주택"].includes(propertyType)) return "주택";
  return "그 외(상가·토지 등)";
}

export type FeeResult ={ baseManwon: number; rate: number; capWon: number | null; feeWon: number; vatWon: number; note: string };

/** 상한 중개보수(원). 오피스텔은 전용 85㎡ 이하 + 부엌·화장실·목욕시설 요건을 갖춘 경우(아니면 「그 외」로). 「그 외」는 0.9% 안에서 협의 — agreedRate로 협의 요율을 넣을 수 있다 */
export function brokerFee(kind: FeeKind, deal: FeeDeal, price: number, monthly = 0, agreedRate?: number): FeeResult {
  const base = dealBase(deal, price, monthly);
  let rate: number;
  let cap: number | null = null;
  let note: string;
  if (kind === "주택") {
    const band = (deal === "매매" ? HOUSE_SALE : HOUSE_LEASE).find((x) => base < x.under)!;
    rate = band.rate;
    cap = band.cap;
    note = "주택 상한요율(시행규칙 별표 1). 시·도 조례 요율을 확인하세요.";
  } else if (kind === "오피스텔") {
    rate = deal === "매매" ? 0.005 : 0.004;
    note = "오피스텔(전용 85㎡ 이하, 전용 부엌·화장실·목욕시설) 요율(별표 2). 요건이 안 되면 「그 외」로 계산하세요.";
  } else {
    rate = 0.009;
    note = "주택·오피스텔 외 부동산은 0.9% 안에서 의뢰인과 협의해 정합니다(별표 2).";
  }
  if (agreedRate !== undefined && agreedRate >= 0 && agreedRate < rate) rate = agreedRate; // 상한보다 낮게 협의한 경우만
  const raw = Math.floor(base * 10_000 * rate);
  const feeWon = cap !== null ? Math.min(raw, cap) : raw;
  return { baseManwon: base, rate, capWon: cap, feeWon, vatWon: Math.floor(feeWon * 0.1), note };
}
