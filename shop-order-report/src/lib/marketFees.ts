// 마켓 기본 수수료율(공용 기준 코드 후보 `market-fees` — 기준 shop-order-report, 상품소싱 E1이 사본으로 가져갈 예정).
// 값은 원본 프로그램 표를 옮기지 않고 마켓 공식 안내로 확인한 것만 「확인됨」으로 둔다(쇼핑몰 묶음 D2).
// 카테고리마다 다르므로 여기 값은 「대표값」이며, 회원이 상품·마켓별로 바꿀 수 있고 정산액 열이 있으면 그 값을 먼저 쓴다.
import type { MarketId } from "@/lib/orders/markets";

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
