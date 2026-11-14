// 2026-11-14: 상품 → AI 쇼츠 원스톱(shorts-onestop-studio) 「상품 홍보 쇼츠」로 넘기기.
// 형식은 받는 쪽 shorts-onestop-studio/src/lib/productShorts.ts 의 productHandoffHash()·productExtraHash()와 같다
// (프로그램끼리 코드를 불러오지 않으므로 형식만 맞춰 여기서 만든다 — 한쪽을 바꾸면 다른 쪽도 맞출 것).
//   https://shorts-onestop-studio.buylife.xyz/topic#product-name=…&product-point=…(최대 3)&product-offer=…&product-from=…&product-id=…
// - 주소 # 뒤에 실어 서버 기록에 남지 않는다. 도매가·원가·재고·주문 정보는 넘기지 않는다.
// - 혜택 문구는 할인가가 정가보다 낮게 있을 때만 만든다(없는 혜택을 만들지 않음).
// - 상품 사진은 쇼츠 쪽 2단계(자료함 원본 참조) 전이라 넘기지 않는다 — 쇼츠 화면 「📷 상품 사진」에서 회원이 올린다.

export const SHORTS_TOPIC_URL = "https://shorts-onestop-studio.buylife.xyz/topic";
const FROM = "AI 상세페이지 자동화";
const LIMITS = { name: 100, point: 60, points: 3, offer: 80, id: 64 } as const;

const clean = (v: string | null | undefined, max: number) => (v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

export interface ShortsProduct {
  id: string;
  name: string | null;
  product_label: string | null;
  key_features: string | null;
  price: number | null;
  sale_price: number | null;
  currency: string | null;
}

export function shortsPoints(keyFeatures: string | null): string[] {
  return (keyFeatures ?? "")
    .split(/\r?\n/)
    // 앞의 글머리표와 「3.」「4)」 같은 번호만 지운다(「12시간 보온」의 숫자는 남김)
    .map((l) => clean(l.replace(/^[\s\-•*·✔︎✓]+/, "").replace(/^\d{1,2}[.)]\s*/, ""), LIMITS.point))
    .filter(Boolean)
    .slice(0, LIMITS.points);
}

export function shortsOffer(p: Pick<ShortsProduct, "price" | "sale_price" | "currency">): string {
  if (!p.sale_price || (p.currency && p.currency !== "KRW")) return "";
  const sale = `${p.sale_price.toLocaleString("ko-KR")}원`;
  return clean(p.price && p.price > p.sale_price ? `정가 ${p.price.toLocaleString("ko-KR")}원 → 할인가 ${sale}` : `판매가 ${sale}`, LIMITS.offer);
}

/** 상품명이 없으면 null(버튼을 숨김). */
export function shortsProductUrl(p: ShortsProduct): string | null {
  const name = clean(p.name || p.product_label, LIMITS.name);
  if (!name) return null;
  const parts = [`product-name=${encodeURIComponent(name)}`];
  for (const pt of shortsPoints(p.key_features)) parts.push(`product-point=${encodeURIComponent(pt)}`);
  const offer = shortsOffer(p);
  if (offer) parts.push(`product-offer=${encodeURIComponent(offer)}`);
  parts.push(`product-from=${encodeURIComponent(FROM)}`);
  const id = clean(p.id, LIMITS.id);
  if (/^[A-Za-z0-9_-]+$/.test(id)) parts.push(`product-id=${encodeURIComponent(id)}`);
  return `${SHORTS_TOPIC_URL}#${parts.join("&")}`;
}
