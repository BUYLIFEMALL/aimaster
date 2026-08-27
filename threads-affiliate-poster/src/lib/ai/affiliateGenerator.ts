import "server-only";
import { generatePostContent, type GeneratePostInput, type ThreadsTone } from "./generator";
import type { AffiliatePlatform } from "@/types/product";

// 플랫폼별 제휴 고지 문구. 쿠팡파트너스는 자체 운영정책 + 표시광고법상 고지가
// 필수이고, 알리익스프레스도 제휴 마케팅 활동이라 동일하게 취급한다. 네이버
// 브랜드커넥트는 자체 정책에 위임하고 여기서는 강제로 붙이지 않는다.
// AGENTS.md에 명시된 정책 준수 장치이니 이 매핑을 임의로 지우면 안 된다.
const DISCLOSURE_TEXT: Record<AffiliatePlatform, string | null> = {
  coupang:
    "\n\n(광고) 이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받을 수 있습니다.",
  aliexpress:
    "\n\n(광고) 이 포스팅은 제휴 마케팅 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받을 수 있습니다.",
  naver: null,
};

const PLATFORM_DEFAULT_CTA_TEXT: Record<AffiliatePlatform, string> = {
  coupang: "지금 쿠팡에서 확인하기",
  aliexpress: "지금 알리익스프레스에서 확인하기",
  naver: "지금 확인하기",
};

export function getDisclosureText(platform: AffiliatePlatform): string | null {
  return DISCLOSURE_TEXT[platform];
}

export interface AffiliateProductContext {
  platform: AffiliatePlatform;
  productName: string;
  price?: number | null;
  affiliateUrl: string;
  inputMode: "url" | "manual";
  description?: string | null;
  keySellingPoints?: string[] | null;
  detailPageExcerpt?: string | null;
}

function buildTopic(product: AffiliateProductContext): string {
  const parts = [product.productName];
  if (product.price) parts.push(`가격: ${product.price.toLocaleString()}원`);

  // input_mode가 manual일 때만 풍부한 컨텍스트(설명/셀링포인트/상세페이지 발췌)를
  // 프롬프트에 포함시킨다 — url 모드는 상품명/가격 정도의 최소 정보만 사용한다.
  if (product.inputMode === "manual") {
    if (product.description?.trim()) parts.push(`상품 설명: ${product.description.trim()}`);
    if (product.keySellingPoints?.length) {
      parts.push(`핵심 셀링포인트: ${product.keySellingPoints.join(", ")}`);
    }
    if (product.detailPageExcerpt?.trim()) {
      parts.push(`상세페이지 참고 내용: ${product.detailPageExcerpt.trim()}`);
    }
  }

  return parts.join("\n");
}

/**
 * 제휴 상품 캡션을 생성한다. 일반 generatePostContent()를 감싸서 (1) cta.url에
 * 제휴 링크를 자동으로 넣고 (2) 플랫폼별 고지 문구를 캡션 끝에 자동으로 붙인다.
 * 고지 문구는 사용자가 지울 수 없도록 이 함수 결과에 항상 포함시켜야 한다 —
 * 게시 직전 어느 경로(즉시 게시/예약)로 가든 이 함수를 거치도록 호출부에서 보장할 것.
 */
export async function generateAffiliatePostContent(
  product: AffiliateProductContext,
  options: { tone?: ThreadsTone; keywords?: string[] },
  apiKey: string,
): Promise<{ content: string }> {
  const input: GeneratePostInput = {
    topic: buildTopic(product),
    tone: options.tone,
    keywords: options.keywords,
    cta: { text: PLATFORM_DEFAULT_CTA_TEXT[product.platform], url: product.affiliateUrl },
  };

  const { content } = await generatePostContent(input, apiKey);

  const disclosure = DISCLOSURE_TEXT[product.platform];
  if (!disclosure) return { content };

  // Threads 게시글 최대 길이(500자) 안에 고지 문구가 반드시 들어가도록, 본문을
  // 필요한 만큼 줄여서 고지 문구가 잘리거나 누락되지 않게 한다.
  const maxContentLength = 500 - disclosure.length;
  const trimmedContent = content.length > maxContentLength ? content.slice(0, maxContentLength).trim() : content;

  return { content: `${trimmedContent}${disclosure}` };
}
