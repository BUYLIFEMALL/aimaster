// 쿠팡·스마트스토어(네이버 쇼핑) 상품소싱기 저장 자료 형식과 입력 검사(서버·화면 공용, 순수 함수).

export const MAX_ITEMS_PER_RUN = 120;
export const MAX_RUNS_PER_DAY = 200;
export const COUPANG_RESULT_RETENTION_DAYS = 365;

export type SourcingMarket = "coupang" | "naver";

export const MARKET_LABEL: Record<SourcingMarket, string> = { coupang: "쿠팡", naver: "네이버쇼핑" };

/** 예전 확장(v1.33 이하)은 마켓을 보내지 않으므로 쿠팡으로 본다. */
export function sanitizeMarket(raw: unknown): SourcingMarket {
  return raw === "naver" ? "naver" : "coupang";
}

export interface ReviewItemInput {
  productId: string;
  name: string;
  price: number | null;
  reviews: number;
  isAd: boolean;
  url: string;
  /** 한 번 읽은 화면 안의 순서(1부터). 판매량순(쿠팡)·랭킹순(네이버) 화면이면 그 마켓의 순위다. */
  salesRank: number;
  /** 네이버만: 구매 수(가격비교 상품은 0), 가격비교 판매처 수(0이면 판매처 한 곳), 판매처 이름 */
  purchases: number | null;
  sellers: number | null;
  mallName: string | null;
}

const toCount = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 0 && n <= 2_000_000_000 ? n : null;
};

/** 네이버 상품 주소는 https·naver.com 주소만 받고, 아니면 가격비교 화면 주소로 새로 쓴다. */
function naverUrl(productId: string, sellers: number, raw: unknown): string {
  const catalog = `https://search.shopping.naver.com/catalog/${productId}`;
  if (sellers > 0) return catalog;
  try {
    const url = new URL(String(raw ?? ""));
    if (url.protocol === "https:" && /(^|\.)naver\.com$/.test(url.hostname)) return url.href.slice(0, 500);
  } catch {
    // 아래로
  }
  return catalog;
}

/** 확장이 보낸 자료를 믿지 않고 다시 만든다. 쿠팡 주소는 상품번호로 새로 쓴다. */
export function sanitizeReviewItems(raw: unknown, market: SourcingMarket = "coupang"): ReviewItemInput[] {
  if (!Array.isArray(raw)) return [];
  const byId = new Map<string, ReviewItemInput>();
  for (const value of raw.slice(0, MAX_ITEMS_PER_RUN)) {
    const item = (value ?? {}) as Record<string, unknown>;
    const productId = String(item.id ?? "");
    if (!/^\d{1,20}$/.test(productId) || byId.has(productId)) continue;
    const naver = market === "naver";
    const sellers = naver ? toCount(item.sellers) ?? 0 : null;
    byId.set(productId, {
      productId,
      name: String(item.name ?? "").trim().slice(0, 300),
      price: item.price == null ? null : toCount(item.price),
      reviews: toCount(item.reviews) ?? 0,
      isAd: item.isAd === true,
      url: naver ? naverUrl(productId, sellers ?? 0, item.url) : `https://www.coupang.com/vp/products/${productId}`,
      salesRank: byId.size + 1,
      purchases: naver ? toCount(item.purchases) ?? 0 : null,
      sellers,
      mallName: naver && !sellers ? String(item.mall ?? "").trim().slice(0, 100) || null : null,
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
