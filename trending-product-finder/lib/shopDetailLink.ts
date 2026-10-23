// v1.23: 소싱한 상품으로 AI 상세페이지 자동화(shop-detail-page)의 새 상품 화면을 연다.
// 상품명과 원본 정보만 주소로 넘긴다. 도매가는 넘기지 않는다 — 상세페이지에서 할인가로 오해되면 혜택 문구가 생길 수 있다.
// 받는 쪽: shop-detail-page/app/(dashboard)/products/new/page.tsx (from=sourcing, name ≤100자, source ≤1000자, price 선택).
// v1.23(추가): 마진 계산기의 추천판매가를 고르면 price로 넘기고, 받는 쪽은 「정상가」 칸에만 넣는다(할인가로는 넘기지 않는다).
import { platformLabel, type Platform } from "./sourcingResults";

const SHOP_DETAIL_URL = "https://shop-detail-page.buylife.xyz/products/new";

export function shopDetailPageUrl(
  product: { title: string; platform: Platform; detailUrl: string },
  sellingPriceKrw?: number,
): string {
  const source = [
    `원본 판매처: ${platformLabel(product.platform) ?? product.platform}`,
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
  return `${SHOP_DETAIL_URL}?${params.toString()}`;
}
