import "server-only";
import { generatePostContent, type GeneratePostInput, type ThreadsTone } from "./generator";
import type { AffiliatePlatform } from "@/types/product";

// 플랫폼별 제휴 고지 문구. 표시광고법은 특정 플랫폼이 아니라 "커미션을 받는
// 제휴 마케팅 콘텐츠 전반"에 적용되는 규정이라, API 연동 여부와 무관하게
// 쿠팡파트너스/알리익스프레스/네이버 브랜드커넥트 셋 다 고지 문구를 자동으로
// 붙인다. AGENTS.md에 명시된 정책 준수 장치이니 이 매핑을 임의로 지우면 안 된다.
//
// 고지 문구는 게시글 맨 끝이 아니라 첫 줄에 와야 한다(표시광고 심사지침 —
// "더보기"에 가려지거나 스크롤해야 보이는 위치는 인정되지 않음, 2026-09-11
// 사용자 지시로 위치 수정). 그래서 값에 앞뒤 줄바꿈을 넣지 않고, 조립하는
// 쪽(generateAffiliatePostContent)에서 맨 앞 줄로 붙인다.
const DISCLOSURE_TEXT: Record<AffiliatePlatform, string | null> = {
  coupang: "(광고) 쿠팡파트너스 활동으로 수수료를 받을 수 있습니다.",
  aliexpress: "(광고) 제휴 활동으로 수수료를 받을 수 있습니다.",
  naver: "(광고) 브랜드 제휴 활동으로 수수료를 받을 수 있습니다.",
  toss: "(광고) 토스쇼핑 쉐어링크 활동으로 수수료를 받을 수 있습니다.",
};

const PLATFORM_DEFAULT_CTA_TEXT: Record<AffiliatePlatform, string> = {
  coupang: "지금 쿠팡에서 확인하기",
  aliexpress: "지금 알리익스프레스에서 확인하기",
  naver: "지금 확인하기",
  toss: "지금 토스쇼핑에서 확인하기",
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
 * 제휴 상품 캡션을 생성한다. 일반 generatePostContent()를 감싸서 (1) 플랫폼별 고지
 * 문구를 캡션 맨 첫 줄에, (2) 제휴 링크를 캡션 끝에 자동으로 붙인다.
 *
 * 고지 문구가 첫 줄에 와야 하는 이유(2026-09-11): 표시광고 심사지침상 "더보기"를
 * 눌러야 보이거나 본문 끝에 파묻힌 고지는 인정되지 않는다 — 제목이 따로 없는
 * Threads 게시글 특성상 "첫 줄"이 사실상 제목 역할을 하므로 여기 배치한다.
 *
 * 제휴 링크는 AI에게 프롬프트로 "URL을 그대로 써달라"고 시키지 않는다 — 실제로
 * gpt-4o-mini가 실제 URL 대신 "{링크}" 같은 placeholder 문자열을 그대로 출력해버려
 * 게시글에 링크가 아예 안 걸리는 사고가 있었다(2026-09-09). 그래서 AI에게는 본문
 * 카피만 만들게 하고, 실제 URL은 여기서 코드로 직접 이어붙여 항상 정확하게 들어가도록
 * 보장한다. 고지 문구도 같은 이유로 AI 프롬프트가 아니라 코드로 직접 붙인다 — AI가
 * 법적으로 고정된 문구를 매번 토씨 하나 안 틀리고 그대로 낸다고 보장할 수 없어서다.
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
  };

  const { content } = await generatePostContent(input, apiKey);

  const ctaText = PLATFORM_DEFAULT_CTA_TEXT[product.platform];
  const ctaBlock = `\n\n${ctaText} 👉\n${product.affiliateUrl}`;
  const disclosureLine = DISCLOSURE_TEXT[product.platform] ?? "";
  const disclosureBlock = disclosureLine ? `${disclosureLine}\n\n` : "";

  // Threads 게시글 최대 길이(500자) 안에 고지 문구와 제휴 링크가 반드시 들어가도록,
  // 본문을 필요한 만큼 줄여서 잘리거나 누락되지 않게 한다.
  //
  // 2026-09-12 버그 수정: maxContentLength가 음수로 내려갈 수 있는데(쿠팡 검색 결과
  // productUrl이 이미 추적 링크라 딥링크 변환 없이 그대로 쓰게 되면서 — 2026-09-11
  // 변경 — 링크 자체가 꽤 길다), 이때 `content.slice(0, 음수)`는 본문을 비우는 게
  // 아니라 "뒤에서 |음수|글자만큼 잘라낸" 결과를 돌려줘서(JS slice의 음수 인덱스
  // 규칙) 본문이 거의 그대로 남는 사고가 있었다. 그 결과 disclosureBlock+본문+
  // ctaBlock 합계가 500자를 초과해 postFormSchema 검증에서 계속 막혔다("500자를
  // 초과할 수 없습니다" 에러만 뜨고 원인을 알 수 없는 상태). 0으로 clamp해서 본문이
  // 실제로 필요한 만큼(0자까지) 줄어들게 고친다.
  const maxContentLength = Math.max(0, 500 - disclosureBlock.length - ctaBlock.length);
  const trimmedContent = content.length > maxContentLength ? content.slice(0, maxContentLength).trim() : content;

  // 본문을 0자로 줄여도 고지 문구+CTA+링크만으로 이미 500자를 넘는 경우 — 더 줄일 게
  // 없으니 조용히 잘못된 결과를 만들지 말고 원인을 명확히 알려준다(쿠팡 제휴 링크가
  // 특히 길 때 발생하기 쉽다).
  if (disclosureBlock.length + ctaBlock.length > 500) {
    throw new Error(
      `제휴 링크가 너무 길어서 고지 문구·CTA·링크만으로 이미 Threads 500자 제한(${disclosureBlock.length + ctaBlock.length}자)을 초과합니다. 더 짧은 제휴 링크를 사용해주세요.`,
    );
  }

  return { content: `${disclosureBlock}${trimmedContent}${ctaBlock}` };
}
