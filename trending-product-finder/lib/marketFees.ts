// 공용 기준 코드 `market-fees` — 기준: shop-order-report/src/lib/marketFees.ts (여기만 고치고 `node scripts/check-shared-modules.mjs --sync`).
// 사본: trending-product-finder/lib/marketFees.ts. 사본이 다른 앱에서도 돌도록 이 파일은 아무것도 import하지 않는다.
// 값은 원본 프로그램 표를 옮기지 않고 마켓 공식 안내로 확인한 것만 「확인됨」으로 둔다(쇼핑몰 묶음 D2).
// 카테고리마다 다르므로 대표값은 회원이 바꿀 수 있어야 하고, 정산액 열이 있으면 그 값을 먼저 쓴다.

export type MarketId = "smartstore" | "coupang" | "11st" | "gmarket" | "auction" | "other";

export const MARKET_LABELS: Record<MarketId, string> = {
  smartstore: "스마트스토어",
  coupang: "쿠팡",
  "11st": "11번가",
  gmarket: "G마켓",
  auction: "옥션",
  other: "직접 입력",
};

export interface MarketFee {
  /** 판매가에 곱하는 대표 수수료율(%) */
  ratePct: number;
  /** 선결제 배송비에 붙는 수수료율(%) */
  shippingRatePct: number;
  verified: boolean;
  note: string;
  checkedAt: string;
}

export const MARKET_FEES: Record<MarketId, MarketFee> = {
  gmarket: { ratePct: 13, shippingRatePct: 3.3, verified: true, note: "ESM PLUS 공식 표 — 대부분 카테고리 13%(디지털·가전 9%, 노트북·TV 7%, 도서 15%)", checkedAt: "2026-10-25" },
  auction: { ratePct: 13, shippingRatePct: 3.3, verified: true, note: "ESM PLUS 공식 표 — 대부분 카테고리 13%(카테고리별 예외 있음)", checkedAt: "2026-10-25" },
  coupang: { ratePct: 10.8, shippingRatePct: 3.3, verified: false, note: "공식 표는 WING 로그인 뒤에만 보임 — 카테고리별 4~10.8% 중 높은 값(보수적 추정)", checkedAt: "2026-10-25" },
  "11st": { ratePct: 13, shippingRatePct: 3.3, verified: false, note: "공식 표는 셀러오피스 로그인 뒤에만 보임 — 7~13% 중 높은 값(보수적 추정)", checkedAt: "2026-10-25" },
  smartstore: { ratePct: 6.36, shippingRatePct: 3.63, verified: false, note: "주문관리 수수료(일반 약 3.63%) + 판매수수료 2.73%(네이버 쇼핑 유입 기준) — 등급·유입 경로마다 다름", checkedAt: "2026-10-25" },
  other: { ratePct: 10, shippingRatePct: 0, verified: false, note: "마켓을 알 수 없어 10%로 가정 — 설정에서 바꾸세요", checkedAt: "2026-10-25" },
};

/** 정산액이 없을 때 마켓 수수료로 추정한 정산액. */
export function estimateSettlement(amount: number, shippingFee: number, ratePct: number, shippingRatePct: number): number {
  return Math.round(amount * (1 - ratePct / 100) + shippingFee * (1 - shippingRatePct / 100));
}

// ── 카테고리 요율표 ──

export interface CategoryFee {
  label: string;
  ratePct: number;
  /** 같은 대분류 안 다른 요율(예시) */
  exception?: string;
}

export interface CategoryTable {
  verified: boolean;
  source: string;
  checkedAt: string;
  rows: CategoryFee[];
}

// ESM PLUS 공식 「서비스 이용료 안내」 대분류 값(2026-10-25 E0 확인). G마켓·옥션은 일부 대분류만 다르다.
const ESM_ROWS: [string, number, number, string?][] = [
  ["여성의류·남성의류·브랜드 의류", 13, 13],
  ["가방/잡화 · 신발", 13, 13],
  ["화장품/향수", 13, 13],
  ["바디/헤어", 11, 11],
  ["생활용품 · 주방용품", 13, 13],
  ["생필품", 11, 11, "화장지/물티슈·생리대 9%"],
  ["가구/DIY · 조명/인테리어 · 침구/커튼", 13, 13],
  ["가공식품 · 건강식품 · 커피/음료", 13, 13, "옥션 수산가공식품 12%"],
  ["신선식품", 12, 12, "쌀·잡곡/혼합곡 7%"],
  ["출산/육아 · 장난감/완구", 13, 13, "기저귀·분유 7%"],
  ["반려동물용품 · 문구/사무용품", 13, 13],
  ["스포츠의류 · 등산/아웃도어 · 캠핑/낚시", 13, 13],
  ["자동차용품", 13, 13, "블랙박스 등 9%"],
  ["생활/미용가전 · 계절가전 · 영상가전", 9, 9, "TV·에어컨 7%, 사무가전·재봉틀 12%"],
  ["PC주변기기 · 저장장치 · 음향기기 · 카메라", 9, 9, "디지털카메라 7%"],
  ["모바일/태블릿", 9, 9, "태블릿 7%"],
  ["노트북/데스크탑", 7, 7, "노트북용품 9%"],
  ["모니터/프린터", 9, 7, "G마켓 모니터·프린터 7%"],
  ["쥬얼리/시계", 13, 13, "순금/돌반지 7%"],
  ["도서·음반·교육", 15, 15],
];

const ESM_SOURCE = "ESM PLUS 공식 「서비스 이용료 안내」 대분류 「전체」 값(중분류는 다를 수 있음)";

export const CATEGORY_FEES: Partial<Record<MarketId, CategoryTable>> = {
  gmarket: { verified: true, source: ESM_SOURCE, checkedAt: "2026-10-25", rows: ESM_ROWS.map(([label, g, , exception]) => ({ label, ratePct: g, exception })) },
  auction: { verified: true, source: ESM_SOURCE, checkedAt: "2026-10-25", rows: ESM_ROWS.map(([label, , a, exception]) => ({ label, ratePct: a, exception })) },
  coupang: {
    verified: false,
    source: "판매자 안내 자료 여러 곳과 일치하는 참고값(공식 표는 WING 로그인 뒤에만 보임)",
    checkedAt: "2026-10-25",
    rows: [
      { label: "도서", ratePct: 10.8 },
      { label: "가구·홈인테리어", ratePct: 10.8 },
      { label: "식품", ratePct: 10.6 },
      { label: "패션의류", ratePct: 10.5 },
      { label: "자동차용품", ratePct: 10.0 },
      { label: "뷰티", ratePct: 9.6 },
      { label: "가전디지털", ratePct: 7.8 },
      { label: "생활용품", ratePct: 7.8 },
      { label: "게임", ratePct: 6.8 },
      { label: "신선식품(쌀/잡곡)", ratePct: 5.8 },
      { label: "냉난방가전", ratePct: 5.8 },
      { label: "컴퓨터·태블릿PC", ratePct: 5.0 },
      { label: "모니터", ratePct: 4.5 },
      { label: "쥬얼리(순금/골드바)", ratePct: 4.0 },
    ],
  },
};

/** 스마트스토어는 수수료가 두 갈래 — 주문관리(등급별, 부가세 포함) + 판매수수료(유입 경로별, 부가세 별도). 대표값 ⚠ */
export const SMARTSTORE_PARTS = { orderFeePct: 3.63, salesFeePct: 2.73, verified: false };

/** 월 고정비(서버 이용료) — 공식 확인된 값만. 전월 판매대금 기준을 넘을 때만 붙는다. */
export const MONTHLY_SERVER_FEE: Partial<Record<MarketId, { krw: number; conditionKrw: number; verified: boolean }>> = {
  auction: { krw: 55000, conditionKrw: 5000000, verified: true },
};

// ── 마켓별 마진 계산 ──

export type ShippingMode = "free" | "prepaid" | "cod";

export const SHIPPING_MODE_LABELS: Record<ShippingMode, string> = {
  free: "무료배송",
  prepaid: "선결제 유료배송",
  cod: "착불",
};

export interface MarketMarginInput {
  market: MarketId;
  /** 판매가(원, 할인 전) */
  sellingPrice: number;
  optionPrice?: number;
  /** 판매자 부담 할인(원) */
  sellerDiscount?: number;
  /** 판매가에 곱하는 수수료율(%) — 스마트스토어는 주문관리+판매 합계 */
  feePct: number;
  /** 기타 추가 수수료(%) — 제휴·쿠폰·프로모션 등 회원이 확인한 값 */
  extraFeePct?: number;
  shippingMode: ShippingMode;
  /** 구매자가 내는 배송비(선결제일 때) */
  shippingCharge?: number;
  /** 배송비 수수료율(%) — 비우면 마켓 기본값 */
  shippingFeePct?: number;
  /** 판매자가 택배사에 내는 실제 택배비(착불이면 0으로 본다) */
  courierCost: number;
  /** 개당 최종 원가(수입 단가 포함) */
  unitCost: number;
  packCost?: number;
  adCost?: number;
  /** 월 고정비(원)와 월 예상 판매 수량 — 개당으로 나눠 반영 */
  monthlyFixed?: number;
  monthlyQty?: number;
}

export interface MarketMarginResult {
  /** 수수료 기준 금액 = 판매가 + 옵션 − 판매자 할인 */
  saleBase: number;
  /** 구매자가 실제로 낸 돈(판매 기준 금액 + 선결제 배송비) */
  paidTotal: number;
  feeKrw: number;
  shippingFeeKrw: number;
  settlement: number;
  fixedPerUnit: number;
  totalCost: number;
  profit: number;
  /** 구매자가 낸 돈 대비 이익률(%) */
  marginPct: number;
}

const n = (v: number | undefined) => (Number.isFinite(v) ? Number(v) : 0);

function parts(i: MarketMarginInput) {
  const saleBase = Math.max(0, n(i.sellingPrice) + n(i.optionPrice) - n(i.sellerDiscount));
  const ship = i.shippingMode === "prepaid" ? Math.max(0, n(i.shippingCharge)) : 0;
  const shipRate = i.shippingFeePct ?? MARKET_FEES[i.market].shippingRatePct;
  const rate = (n(i.feePct) + n(i.extraFeePct)) / 100;
  const fixedPerUnit = n(i.monthlyQty) > 0 ? n(i.monthlyFixed) / n(i.monthlyQty) : 0;
  const courier = i.shippingMode === "cod" ? 0 : n(i.courierCost);
  const costs = n(i.unitCost) + n(i.packCost) + n(i.adCost) + courier + fixedPerUnit;
  const shipNet = ship * (1 - shipRate / 100);
  return { saleBase, ship, shipRate, rate, fixedPerUnit, courier, costs, shipNet };
}

export function calcMarketMargin(i: MarketMarginInput): MarketMarginResult {
  const p = parts(i);
  const feeKrw = Math.round(p.saleBase * p.rate);
  const shippingFeeKrw = Math.round(p.ship * (p.shipRate / 100));
  const settlement = p.saleBase - feeKrw + p.ship - shippingFeeKrw;
  const totalCost = Math.round(p.costs);
  const profit = Math.round(settlement - p.costs);
  const paidTotal = p.saleBase + p.ship;
  return {
    saleBase: p.saleBase,
    paidTotal,
    feeKrw,
    shippingFeeKrw,
    settlement,
    fixedPerUnit: Math.round(p.fixedPerUnit),
    totalCost,
    profit,
    marginPct: paidTotal > 0 ? Math.round((profit / paidTotal) * 1000) / 10 : 0,
  };
}

/**
 * 목표 이익률(%)을 맞추는 판매가(할인 전, 원 단위 올림). 0%면 손익분기 판매가.
 * 수수료가 너무 커서 어떤 가격으로도 맞출 수 없으면 null.
 */
export function priceForMargin(i: MarketMarginInput, targetPct = 0): number | null {
  const p = parts(i);
  const m = targetPct / 100;
  const denom = 1 - p.rate - m;
  if (denom <= 0) return null;
  // saleBase × (1 − r) + shipNet − costs = m × (saleBase + ship)
  const saleBase = (p.costs - p.shipNet + m * p.ship) / denom;
  return Math.max(0, Math.ceil(saleBase - n(i.optionPrice) + n(i.sellerDiscount)));
}

/** 마켓 기본 수수료율(카테고리를 고르면 그 값). 스마트스토어는 두 갈래 합계. */
export function defaultFeePct(market: MarketId, categoryLabel?: string): number {
  const table = CATEGORY_FEES[market];
  const row = categoryLabel ? table?.rows.find((r) => r.label === categoryLabel) : undefined;
  if (row) return row.ratePct;
  if (market === "smartstore") return Math.round((SMARTSTORE_PARTS.orderFeePct + SMARTSTORE_PARTS.salesFeePct) * 100) / 100;
  return MARKET_FEES[market].ratePct;
}

export interface MarketCompareRow extends MarketMarginResult {
  market: MarketId;
  feePct: number;
  verified: boolean;
  breakEven: number | null;
}

/** 같은 원가·판매가로 5개 마켓을 비교한다(각 마켓 대표 수수료·배송 수수료). 이익 큰 순. */
export function compareMarkets(base: Omit<MarketMarginInput, "market" | "feePct" | "shippingFeePct">, feeOverride: Partial<Record<MarketId, number>> = {}): MarketCompareRow[] {
  const markets: MarketId[] = ["smartstore", "coupang", "11st", "gmarket", "auction"];
  return markets
    .map((market) => {
      const feePct = feeOverride[market] ?? defaultFeePct(market);
      const input = { ...base, market, feePct };
      return { market, feePct, verified: MARKET_FEES[market].verified, breakEven: priceForMargin(input, 0), ...calcMarketMargin(input) };
    })
    .sort((a, b) => b.profit - a.profit);
}
