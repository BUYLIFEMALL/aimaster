// v1.19(추가, S-22-10): 섹션 이미지 1장을 쓰레드 쇼핑제휴 자동화(threads-affiliate-poster)의 새 글 화면으로 넘긴다.
// v1.20: 같은 방식으로 INSTA 포스팅 자동화(insta_auto_poster v1.53)의 새 글 화면에도 넘긴다(받는 쪽 src/lib/shopDetailImport.ts).
// 비공개 버킷이라 열람 열쇠가 담긴 서명 주소는 넘기지 않고 버킷 안 위치만 넘긴다.
// 받는 쪽(threads-affiliate-poster/src/lib/shopDetailImport.ts)이 로그인한 회원 본인 폴더인지 확인한 뒤 자기 공개 저장소로 복사한다.
// 본문 초안은 상품명·핵심 특징만 쓰고, 가격은 할인가가 있을 때만 넣는다(없는 혜택 문구를 만들지 않기 위해).
import { storagePathFromUrl } from "@/lib/imageSrc";

const THREADS_NEW_POST_URL = "https://threads-affiliate-poster.buylife.xyz/posts/new";
const INSTA_NEW_POST_URL = "https://auto-instagram-posting.buylife.xyz/posts/new";

export function threadsDraftText(product: {
  name: string | null;
  product_label: string | null;
  key_features: string | null;
  sale_price: number | null;
  currency: string | null;
}): string {
  const lines: string[] = [];
  const name = (product.name || product.product_label || "").trim();
  if (name) lines.push(name);
  const features = (product.key_features ?? "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\s\-•*·✔︎✓]+/, "").trim())
    .filter(Boolean)
    .slice(0, 3);
  if (features.length) lines.push("", ...features.map((f) => `✔ ${f}`));
  if (product.sale_price) {
    const currency = product.currency ?? "KRW";
    lines.push(
      "",
      currency === "KRW"
        ? `💰 ${product.sale_price.toLocaleString("ko-KR")}원`
        : `💰 ${product.sale_price.toLocaleString("en-US")} ${currency}`,
    );
  }
  return lines.join("\n").slice(0, 400);
}

/** 우리 버킷 이미지가 아니면(외부 주소 등) null — 버튼을 숨긴다. */
export function threadsPostUrl(imageUrl: string, draft: string): string | null {
  const path = storagePathFromUrl(imageUrl);
  if (!path) return null;
  const params = new URLSearchParams({ from: "shop-detail", shopImage: path });
  if (draft) params.set("initialContent", draft);
  return `${THREADS_NEW_POST_URL}?${params.toString()}`;
}

/** INSTA 새 글 화면은 캡션 초안을 caption으로 받는다. 우리 버킷 이미지가 아니면 null. */
export function instaPostUrl(imageUrl: string, draft: string): string | null {
  const path = storagePathFromUrl(imageUrl);
  if (!path) return null;
  const params = new URLSearchParams({ from: "shop-detail", shopImage: path });
  if (draft) params.set("caption", draft);
  return `${INSTA_NEW_POST_URL}?${params.toString()}`;
}
