// 콘텐츠 생성에서 "등록한 상품(쇼핑제휴 상품 등록)"을 연결할 때 쓰는 공용 규칙 (v1.56). 화면과 서버가 같은 함수를 읽으므로 "server-only"가 아니다.
// 상품을 연결하지 않으면 일반 Threads 글이고, 연결하면 본문 끝에 상품 소개가 자연스럽게 이어지고 아래에 상품 링크가 붙는다.
// 제휴 고지 문구는 threads-affiliate-poster의 정책(표시광고법 — 게시글 첫 줄)을 그대로 따른다. 서버가 저장할 때 항상 다시 조립하므로 화면에서 지울 수 없다.

export type LinkedProduct = { id: string; source_type: string; title: string; summary: string; source_url: string; price?: number | null };

export const PRODUCT_SOURCE_TYPES = ["coupang", "naver_brand_connect"] as const;

const DISCLOSURE: Record<string, string> = {
  coupang: "(광고)쿠팡파트너스 활동으로 수수료를 받을 수 있음",
  // 쿠팡과 같은 형식에 이름만 네이버 브랜드커넥트로 바꾼 문구(주인님 지시 2026-10-07).
  naver_brand_connect: "(광고)네이버 브랜드커넥트 활동으로 수수료를 받을 수 있음",
};
const PLATFORM_LABEL: Record<string, string> = { coupang: "쿠팡 파트너스", naver_brand_connect: "네이버 브랜드 커넥트" };

export const productPlatformLabel = (type: string) => PLATFORM_LABEL[type] ?? type;
export const disclosureFor = (type: string) => DISCLOSURE[type] ?? "(광고) 제휴 활동으로 수수료를 받을 수 있습니다.";

/** 고지 문구(첫 줄) + 빈 줄 + AI가 쓴 본문(이모지 제목·단락·상품 소개) + 빈 줄 + "상품링크: 주소"(한 줄). 상품이 없으면 본문 그대로. */
export function assemblePostBody(body: string, product?: Pick<LinkedProduct, "source_type" | "source_url"> | null): string {
  const text = body.trim();
  if (!product) return text;
  return `${disclosureFor(product.source_type)}\n\n${text}\n\n상품링크: ${product.source_url}`;
}
