// 쿠팡 리뷰 거르기 저장 자료 형식과 입력 검사(서버·화면 공용, 순수 함수).

export const MAX_ITEMS_PER_RUN = 120;
export const MAX_RUNS_PER_DAY = 200;
export const COUPANG_RESULT_RETENTION_DAYS = 365;

export interface ReviewItemInput {
  productId: string;
  name: string;
  price: number | null;
  reviews: number;
  isAd: boolean;
  url: string;
}

const toCount = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 0 && n <= 2_000_000_000 ? n : null;
};

/** 확장이 보낸 자료를 믿지 않고 다시 만든다. 상품 주소는 상품번호로 새로 쓴다. */
export function sanitizeReviewItems(raw: unknown): ReviewItemInput[] {
  if (!Array.isArray(raw)) return [];
  const byId = new Map<string, ReviewItemInput>();
  for (const value of raw.slice(0, MAX_ITEMS_PER_RUN)) {
    const item = (value ?? {}) as Record<string, unknown>;
    const productId = String(item.id ?? "");
    if (!/^\d{1,20}$/.test(productId) || byId.has(productId)) continue;
    byId.set(productId, {
      productId,
      name: String(item.name ?? "").trim().slice(0, 300),
      price: item.price == null ? null : toCount(item.price),
      reviews: toCount(item.reviews) ?? 0,
      isAd: item.isAd === true,
      url: `https://www.coupang.com/vp/products/${productId}`,
    });
  }
  return [...byId.values()];
}

export function sanitizeKeyword(raw: unknown): string {
  return String(raw ?? "").trim().slice(0, 100);
}

export function resultCutoff(now: Date = new Date()): string {
  return new Date(now.getTime() - COUPANG_RESULT_RETENTION_DAYS * 86_400_000).toISOString();
}
