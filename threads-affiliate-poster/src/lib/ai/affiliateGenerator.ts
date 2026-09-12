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
// 쿠팡은 2026-09-12 사용자 지시로 문구를 더 짧게 줄였다(한 줄에 보이도록) — 다른
// 플랫폼은 기존 문구를 그대로 유지한다.
const DISCLOSURE_TEXT: Record<AffiliatePlatform, string | null> = {
  coupang: "(광고)쿠팡파트너스 활동으로 수수료를 받을 수 있음",
  aliexpress: "(광고) 제휴 활동으로 수수료를 받을 수 있습니다.",
  naver: "(광고) 브랜드 제휴 활동으로 수수료를 받을 수 있습니다.",
  toss: "(광고) 토스쇼핑 쉐어링크 활동으로 수수료를 받을 수 있습니다.",
};

const PLATFORM_DEFAULT_CTA_TEXT: Record<AffiliatePlatform, string> = {
  coupang: "지금 쿠팡에서 확인",
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
// Threads 실제 상한은 500자지만, 목표는 490자다(2026-09-12 사용자 지시 — "500자 제한에
// 안 걸리면서 최대한 본문을 꽉 채워달라"). 480→490으로 여유를 10자로 좁힌 대신,
// 근본 원인(아래 "경계 버그" 참고)을 줄이는 두 가지를 같이 적용했다: ① CTA 이모지
// (👉)를 제거하고 ② 링크를 CTA 문구와 같은 줄에 붙여서 서로게이트쌍 문자 하나를
// 줄였다. AI가 생성하는 제목 앞 이모지 정도만 남는다.
const TARGET_TOTAL_LENGTH = 490;

export async function generateAffiliatePostContent(
  product: AffiliateProductContext,
  options: { tone?: ThreadsTone; keywords?: string[] },
  apiKey: string,
): Promise<{ content: string }> {
  const ctaText = PLATFORM_DEFAULT_CTA_TEXT[product.platform];
  // CTA 문구와 링크를 같은 줄에 붙인다(2026-09-12 사용자 지시 — "옆에 링크 걸어주고").
  // Threads는 순수 텍스트만 받는 SNS라 앵커 텍스트에 링크를 거는 것 자체는 불가능하고,
  // 대신 URL 문자열을 올리면 Threads가 자동으로 그 부분만 파란색 클릭 가능한 링크로
  // 인식해서 보여준다 — 그래서 "쿠팡에서 확인"이라는 문구 바로 뒤에 이어붙이는 것으로
  // 최대한 가깝게 구현했다.
  const ctaBlock = `\n\n${ctaText} ${product.affiliateUrl}`;
  const disclosureLine = DISCLOSURE_TEXT[product.platform] ?? "";
  const disclosureBlock = disclosureLine ? `${disclosureLine}\n\n` : "";

  // 2026-09-12: 본문을 다 만들고 나서 사후에 잘라내는 대신, 고지문구+CTA+링크 길이를
  // 먼저 계산해 "실제로 본문에 쓸 수 있는 글자 수"를 AI 프롬프트에 정확히 넘긴다.
  // AI가 처음부터 그 분량에 맞춰 문장을 완결된 형태로 채우므로, 사후 slice()로 문장
  // 중간이 잘리는 문제가 사실상 사라진다(아래 maxContentLength는 AI가 지시를 못 지켰을
  // 때를 대비한 최후 방어선일 뿐이다).
  const maxContentLength = Math.max(0, TARGET_TOTAL_LENGTH - disclosureBlock.length - ctaBlock.length);

  // 본문에 배정할 글자 수가 0 이하라는 건 고지 문구+CTA+링크만으로 이미 목표치를
  // 넘는다는 뜻 — 본문을 아예 못 쓰니 원인을 명확히 알려준다(쿠팡 제휴 링크가 특히 길
  // 때 발생하기 쉽다).
  if (maxContentLength <= 0) {
    throw new Error(
      `제휴 링크가 너무 길어서 고지 문구·CTA·링크만으로 이미 목표 글자수(${TARGET_TOTAL_LENGTH}자)를 넘습니다(현재 ${disclosureBlock.length + ctaBlock.length}자). 더 짧은 제휴 링크를 사용해주세요.`,
    );
  }

  const input: GeneratePostInput = {
    topic: buildTopic(product),
    tone: options.tone,
    keywords: options.keywords,
    maxLength: maxContentLength,
  };

  const { content } = await generatePostContent(input, apiKey);

  // 2026-09-12 버그 수정: 이전엔 여기서 `content.slice(0, maxContentLength)`의
  // maxContentLength가 음수로 내려갈 수 있었는데, JS slice의 음수 인덱스 규칙상
  // "본문을 비우는" 게 아니라 "뒤에서 그만큼만 잘라내는" 동작을 해서 본문이 거의
  // 그대로 남는 사고가 있었다. 이제 maxContentLength는 항상 0 이상(위에서 확인)이고,
  // AI에게 이미 정확한 예산을 넘겼으므로 이 trim은 AI가 지시를 못 지켰을 때만 실제로
  // 발동하는 안전망이다.
  const trimmedContent = content.length > maxContentLength ? content.slice(0, maxContentLength).trim() : content;

  return { content: `${disclosureBlock}${trimmedContent}${ctaBlock}` };
}
