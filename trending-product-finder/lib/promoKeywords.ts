// 상품명에 "공동구매/할인행사/이벤트" 등 프로모션 성격의 문구가 들어간 상품을 골라내는
// 용도. 정교한 분류(AI)가 아니라 단순 부분일치라 오탐(예: "이벤트상품 아님" 같은 문구도
// 걸릴 수 있음)이 있을 수 있다 — 빠르게 훑어보는 1차 필터로만 쓰고, 최종 판단은 상품명을
// 직접 확인하도록 안내한다.

export const PROMO_KEYWORDS = [
  "공동구매",
  "할인",
  "이벤트",
  "특가",
  "세일",
  "SALE",
  "프로모션",
  "타임세일",
  "반값",
  "1+1",
  "핫딜",
  "런칭",
  "오픈기념",
  "한정수량",
  "마감임박",
];

export function isPromoProduct(title: string): boolean {
  const upper = title.toUpperCase();
  return PROMO_KEYWORDS.some((k) => upper.includes(k.toUpperCase()));
}

/** 매칭된 프로모션 키워드 중 첫 번째만 반환(배지 표시용) */
export function matchedPromoKeyword(title: string): string | null {
  const upper = title.toUpperCase();
  const found = PROMO_KEYWORDS.find((k) => upper.includes(k.toUpperCase()));
  return found ?? null;
}
