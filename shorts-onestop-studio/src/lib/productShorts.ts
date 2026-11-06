// v1.44(V3): 상품 홍보 쇼츠 — 상품 정보 정리·넘겨받기(화면·서버 공용 순수 함수).
// 15초 6비트 구성은 product-shorts-studio의 「구성」만 참고해 문장은 새로 썼다(라이선스 없는 원본 — 코드·문구 사용 안 함).
//
// [다른 프로그램 → 원스톱 넘기기 형식] (예: shop-detail-page 「쇼츠로 만들기」, 이커머스 E9)
//   https://shorts-onestop-studio.buylife.xyz/topic#product-name=<상품명>&product-point=<장점>&product-point=…&product-offer=<혜택>&product-from=<보낸 프로그램>
//   - 주소 # 뒤에 실어 서버 기록에 남지 않게 한다(레퍼런스 대사 넘기기 v1.32와 같은 방식, 로그인을 거치면 탭 저장소에 잠시 보관).
//   - 값은 encodeURIComponent. 상품명 100자, 장점 최대 3개 각 60자, 혜택 80자, 보낸 프로그램 40자에서 자른다.
//   - 도매가·원가·재고·주문 정보는 넘기지 않는다(trending-product-finder/lib/shopDetailLink.ts와 같은 원칙).
//   - 상품 사진은 2단계(배경 형식에 「상품 사진」 추가 뒤)에 product-image로 받는다 — 지금은 받지 않는다.

export type ProductInfo = { name: string; points: string[]; offer: string };

export const PRODUCT_HASH = "product-name";
const POINT = "product-point";
const OFFER = "product-offer";
const FROM = "product-from";
export const PRODUCT_LIMITS = { name: 100, point: 60, points: 3, offer: 80, from: 40 } as const;
/** 상품 홍보 구성의 카드 수(인트로 1 + 카드 4 + 아웃트로 1 = 6비트) */
export const PRODUCT_CARDS = 4;

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** 회원 입력·서버 요청을 같은 기준으로 정리. 상품명이 없으면 null */
export function normalizeProduct(raw: unknown): ProductInfo | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const name = clean(r.name, PRODUCT_LIMITS.name);
  if (!name) return null;
  const points = (Array.isArray(r.points) ? r.points : [])
    .map((p) => clean(p, PRODUCT_LIMITS.point))
    .filter(Boolean)
    .slice(0, PRODUCT_LIMITS.points);
  return { name, points, offer: clean(r.offer, PRODUCT_LIMITS.offer) };
}

/** 보내는 쪽이 쓰는 주소 # 부분 */
export function productHandoffHash(product: ProductInfo, from?: string): string {
  const p = normalizeProduct(product);
  if (!p) return "";
  const parts = [`${PRODUCT_HASH}=${encodeURIComponent(p.name)}`];
  for (const pt of p.points) parts.push(`${POINT}=${encodeURIComponent(pt)}`);
  if (p.offer) parts.push(`${OFFER}=${encodeURIComponent(p.offer)}`);
  const f = clean(from, PRODUCT_LIMITS.from);
  if (f) parts.push(`${FROM}=${encodeURIComponent(f)}`);
  return `#${parts.join("&")}`;
}

/** 받는 쪽: 주소 # 부분에서 상품 정보와 보낸 프로그램 이름. 상품 넘기기가 아니면 null */
export function readProductHandoff(hash: string): { product: ProductInfo; from: string } | null {
  if (!hash.startsWith(`#${PRODUCT_HASH}=`)) return null;
  const values: Record<string, string[]> = {};
  for (const part of hash.slice(1).split("&")) {
    const at = part.indexOf("=");
    if (at < 1) continue;
    let value = "";
    try {
      value = decodeURIComponent(part.slice(at + 1));
    } catch {
      continue;
    }
    (values[part.slice(0, at)] ??= []).push(value);
  }
  const product = normalizeProduct({ name: values[PRODUCT_HASH]?.[0], points: values[POINT] ?? [], offer: values[OFFER]?.[0] });
  return product ? { product, from: clean(values[FROM]?.[0], PRODUCT_LIMITS.from) } : null;
}

/** 대본 프롬프트에 넣는 상품 정보 블록 */
export function productBlock(p: ProductInfo): string {
  return [
    `상품명: ${p.name}`,
    p.points.length ? `판매자가 적은 장점:\n${p.points.map((pt, i) => `${i + 1}. ${pt}`).join("\n")}` : "판매자가 적은 장점: (없음 — 상품명에서 알 수 있는 일반적인 쓰임만)",
    p.offer ? `판매자가 적은 혜택·구매 안내: ${p.offer}` : "",
  ].filter(Boolean).join("\n");
}
