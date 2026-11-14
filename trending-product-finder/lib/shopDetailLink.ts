// v1.23: 소싱한 상품으로 AI 상세페이지 자동화(shop-detail-page)의 새 상품 화면을 연다.
// 상품명과 원본 정보만 주소로 넘긴다. 도매가는 넘기지 않는다 — 상세페이지에서 할인가로 오해되면 혜택 문구가 생길 수 있다.
// 받는 쪽: shop-detail-page/app/(dashboard)/products/new/page.tsx (from=sourcing, name ≤100자, source ≤1000자, price 선택).
// v1.23(추가): 마진 계산기의 추천판매가를 고르면 price로 넘기고, 받는 쪽은 「정상가」 칸에만 넣는다(할인가로는 넘기지 않는다).
import { platformLabel, type Platform } from "./sourcingResults";

const SHOP_DETAIL_URL = "https://shop-detail-page.buylife.xyz/products/new";

/** E2-4: 「상품명·태그 초안」에서 고른 상품명·태그로 새 상품 화면을 연다(원본 판매처 정보 대신 조사 키워드를 남긴다). */
export function shopDetailDraftUrl(draft: { title: string; tags: string[]; keyword: string; market: "coupang" | "naver" }, inFlow = false): string {
  const params = new URLSearchParams({
    from: "sourcing",
    name: draft.title.slice(0, 100),
    source: `상품소싱 등록 정보 도우미 초안\n조사 마켓: ${draft.market === "naver" ? "네이버쇼핑" : "쿠팡"}\n조사 키워드: ${draft.keyword}`.slice(0, 1000),
  });
  if (draft.tags.length) params.set("tags", draft.tags.slice(0, 10).join(",").slice(0, 400));
  if (inFlow) params.set("flow", "shop");
  return `${SHOP_DETAIL_URL}?${params.toString()}`;
}

export function shopDetailPageUrl(
  product: { title: string; platform: Platform | "coupang" | "naver"; detailUrl: string },
  sellingPriceKrw?: number,
  /** E9: 쇼핑몰 흐름 중이면 흐름 표시(flow=shop)를 함께 넘긴다 — 받는 쪽은 띠 사본이 생기면 흐름 띠를 보여 준다 */
  inFlow = false,
): string {
  const source = [
    `원본 판매처: ${product.platform === "coupang" ? "쿠팡" : product.platform === "naver" ? "네이버쇼핑" : (platformLabel(product.platform) ?? product.platform)}`,
    `원본 상품명: ${product.title}`,
    product.detailUrl ? `원본 링크: ${product.detailUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const params = new URLSearchParams({
    from: "sourcing",
    name: product.title.slice(0, 100),
    source: source.slice(0, 1000),
  });
  if (sellingPriceKrw && Number.isFinite(sellingPriceKrw) && sellingPriceKrw > 0) {
    params.set("price", String(Math.round(sellingPriceKrw)));
  }
  if (inFlow) params.set("flow", "shop");
  return `${SHOP_DETAIL_URL}?${params.toString()}`;
}
