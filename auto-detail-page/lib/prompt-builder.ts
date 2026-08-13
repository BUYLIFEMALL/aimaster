import {
  TemplateInput,
  CoupangInput,
  SmartstoreInput,
  PremiumInput,
  ProductInputBase,
} from "@/types/product";

export function buildSystemPrompt(template: TemplateInput["template"]): string {
  const base = `당신은 한국 이커머스 상세페이지 전문 디자이너이자 카피라이터입니다.
수백 개의 고전환율 상세페이지를 분석한 전문가로서, 구매 심리를 설계하는 데이터 구조를 생성합니다.

반드시 지켜야 할 규칙:
1. 완전한 HTML 문서만 출력하세요 (<!DOCTYPE html>부터 </html>까지).
2. 마크다운, 설명 텍스트, 코드블록 없이 순수 HTML만 출력하세요.
3. 모든 CSS는 <style> 태그 안에 인라인으로 작성하세요. 외부 CSS 파일 링크 금지.
4. Google Fonts (Noto Sans KR)만 외부 링크로 허용합니다.
5. 이미지 src를 반드시 [IMAGE_1], [IMAGE_2] 형태의 플레이스홀더로 작성하세요.
6. JavaScript는 <script> 태그 안에 인라인으로 작성하세요.
7. 모바일 우선 반응형 디자인 (최대 너비 600px 기준).
8. 세로로 긴 레이아웃 (총 콘텐츠 높이 최소 4000px 이상).
9. 카피라이팅 원칙: 제품 스펙 나열 ❌ → 고객이 얻는 변화·이득·편리함 중심 ⭕`;

  const guide: Record<TemplateInput["template"], string> = {
    coupang: `
10. 쿠팡 스타일: 빨간색(#cc0000)·흰색·노랑(#ffd600) 중심. 가격·긴박감·사회적 증거로 즉시 구매 전환 최적화.`,
    smartstore: `
10. 스마트스토어 스타일: 초록(#03c75a)·흰색 중심. 브랜드 신뢰·검색 최적화·커뮤니티 감성으로 전환.`,
    premium: `
10. 프리미엄 스타일: 다크(#1a1a1a)·골드(#b8960c) 중심. 희소성·브랜드 헤리티지·감성 스토리텔링으로 전환.`,
  };

  return base + guide[template];
}

export function buildUserPrompt(input: TemplateInput): string {
  switch (input.template) {
    case "coupang":
      return buildCoupangPrompt(input);
    case "smartstore":
      return buildSmartstorePrompt(input);
    case "premium":
      return buildPremiumPrompt(input);
  }
}

// ── 공통 베이스 섹션 ────────────────────────────────────────────────────────

function buildBaseSection(input: ProductInputBase): string {
  const specsRows = input.specifications
    .filter((s) => s.key && s.value)
    .map((s) => `  - ${s.key}: ${s.value}`)
    .join("\n");

  const imageInstructions =
    input.uploadedImages.length > 0
      ? input.uploadedImages.map((img, i) => `- [IMAGE_${i + 1}]: ${img.name}`).join("\n")
      : "이미지 없음";

  const trust = input.trustData;
  const policy = input.policyInfo;

  return `다음 제품의 한국식 이커머스 상세페이지 HTML을 생성해주세요.

## 제품 기본 정보
- **제품명**: ${input.productName}
- **설명**: ${input.description}
- **타겟 고객**: ${input.targetAudience || "일반 소비자"}
- **핵심 셀링포인트**:
${input.keySellingPoints.filter(Boolean).map((p, i) => `  ${i + 1}. ${p}`).join("\n") || "  없음"}

## 고객 문제 & 해결 (3단계 설득)
- **고객이 겪는 문제**: ${input.problemStatement || "미입력 — AI가 제품 설명을 기반으로 추론"}
- **전/후 변화 수치**: ${input.beforeAfterData || "미입력 — AI가 설득력 있는 수치로 창작"}

## 신뢰 데이터 (2단계 — 숫자 카운트업 애니메이션으로 표현)
- 누적 판매량: ${trust.salesCount || "AI 추정값 사용"}
- 만족도: ${trust.satisfactionRate || "AI 추정값 사용"}
- 후기 수: ${trust.reviewCount || "AI 추정값 사용"}
- 재구매율: ${trust.repurchaseRate || "AI 추정값 사용"}

## 구매 보장 정책 (5단계 — 구매 불안 제거)
- 배송: ${policy.delivery || "빠른 배송"}
- 환불/교환: ${policy.refund || "7일 이내 무료 반품"}
- AS: ${policy.as || "1년 무상 AS"}

## 제품 스펙
${specsRows || "스펙 정보 없음"}

## 이미지 플레이스홀더 (반드시 준수)
${imageInstructions}
반드시 <img src="[IMAGE_1]">, <img src="[IMAGE_2]"> 형태로 사용하세요.`;
}

// ── 쿠팡 스타일 프롬프트 ────────────────────────────────────────────────────

function buildCoupangPrompt(input: CoupangInput): string {
  const base = buildBaseSection(input);

  return `${base}

## 쿠팡 전용 정보
- **원가**: ${input.originalPrice || "미입력"}
- **할인율**: ${input.discountRate ? input.discountRate + "%" : "미입력"}
- **판매가**: ${input.finalPrice || "미입력"}
- **배송**: ${input.deliveryInfo || "로켓배송 · 내일 도착"}
- **로켓배송 뱃지**: ${input.rocketBadge ? "표시" : "미표시"}
- **긴박감 문구**: ${input.urgencyMessage || "AI가 자동 생성 (예: 오늘 자정 특가 마감)"}
- **인증 배지**: ${input.certificationBadges.filter(Boolean).join(", ") || "없음"}

## 고객 리뷰 하이라이트
${input.reviewHighlights.filter(Boolean).map((r) => `- "${r}"`).join("\n") || "없음 (AI가 설득력 있는 리뷰 3개 자동 생성)"}

## 필수 포함 섹션 — 5단계 전환 구조 (쿠팡 버전)

### [1단계] 히어로 — 결과 중심 카피 + 가격 강타
- 빨간 배경(#cc0000) 풀스크린 히어로
- 제품명 아닌 "고객이 얻는 결과" 중심 헤드라인 (예: "7일 만에 달라지는 ○○")
- 원가/할인율/판매가 크게 표시 + "오늘만 특가" 카운트다운 타이머 (JavaScript)
- 로켓배송 뱃지 + 긴박감 문구
- 히어로 이미지 [IMAGE_1]

### [2단계] 신뢰 데이터 블록
- 판매량·만족도·후기수·재구매율 숫자 카운트업 애니메이션 (4개 카드)
- 전/후 변화 비교 (이전 문제 → 사용 후 결과)
- 인증 뱃지 그리드

### [3단계] 문제→해결→왜 이 제품?
- 고객 문제 공감 섹션 (빨간 강조)
- 해결책으로서 제품 소개
- 핵심 기능 카드 3~5개 (아이콘 + 제목 + 설명)

### [4단계] 사회적 증거
- ⭐⭐⭐⭐⭐ 별점 시각화
- 고객 리뷰 카드 (이미지 후기 스타일)
- "재구매 N%" 뱃지

### [5단계] 구매 불안 제거
- 배송·환불·AS·고객센터 아이콘 카드 (4개 그리드)
- 이미지 갤러리 (모든 [IMAGE_N])
- 스펙 테이블
- 최종 CTA: 빨간 "지금 구매하기" + "장바구니 담기"
- 재고 경고 프로그레스 바 + 긴박감 메시지

## 디자인
- 색상: 빨강(#cc0000), 흰색, 노랑(#ffd600), 연회색(#f5f5f5)
- Noto Sans KR 700/900 weight
- 스크롤 페이드인, 숫자 카운트업, 카운트다운 타이머 (JavaScript)`;
}

// ── 스마트스토어 스타일 프롬프트 ──────────────────────────────────────────

function buildSmartstorePrompt(input: SmartstoreInput): string {
  const base = buildBaseSection(input);

  const qaText =
    input.qaItems.filter((q) => q.question).length > 0
      ? input.qaItems
          .filter((q) => q.question)
          .map((q) => `Q: ${q.question}\nA: ${q.answer || "답변 미입력"}`)
          .join("\n\n")
      : "없음 (AI가 제품 특성에 맞는 Q&A 5개 자동 생성)";

  return `${base}

## 스마트스토어 전용 정보
- **브랜드 스토리**: ${input.brandStory || "미입력"}
- **원산지/생산지**: ${input.productOrigin || "미입력"}
- **소싱 스토리**: ${input.sourcingStory || "미입력"}
- **해시태그**: ${input.hashtags.filter(Boolean).join(" ") || "없음"}
- **성분/소재 상세**: ${input.ingredientDetails || "미입력"}
- **인증 정보**: ${input.certifications.filter(Boolean).join(", ") || "없음"}
- **사용 방법**: ${input.usageGuide || "미입력 — AI가 단계별 사용법 자동 생성"}
- **네이버페이 뱃지**: ${input.naverPayBadge ? "표시" : "미표시"}

## Q&A
${qaText}

## 필수 포함 섹션 — 5단계 전환 구조 (스마트스토어 버전)

### [1단계] 히어로 — 결과 중심 브랜드 감성
- 라이프스타일 이미지 [IMAGE_1] 풀스크린
- 제품 스펙 ❌ → "○○ 하나로 ○○ 해결" 감성 헤드라인
- 브랜드 스토리 인용 형식 (짧고 임팩트 있게)
- 네이버페이 뱃지

### [2단계] 신뢰 데이터 블록
- 판매량·만족도·후기수·재구매율 숫자 카운트업 (4개 카드, 초록 테마)
- 전/후 변화 비교 섹션 (수치 명시)
- 인증 뱃지 그리드 (HACCP, 유기농인증 등)

### [3단계] 브랜드 스토리 & 설득
- 원산지/소싱 스토리 (지도 아이콘 + 산문체)
- 고객 문제 공감 → 이 제품이 해결책인 이유
- 성분/소재 상세 섹션
- 핵심 특징 카드 3~5개 (초록 테마)

### [4단계] 사회적 증거
- 별점 시각화 + 후기 카드
- 재구매율 강조 배지
- 해시태그 클라우드

### [5단계] 구매 불안 제거
- 사용 방법 단계별 가이드 (숫자 아이콘)
- Q&A 아코디언 (JavaScript 토글)
- 배송·환불·AS 아이콘 카드 블록
- 이미지 갤러리 (모든 [IMAGE_N])
- 스펙 테이블
- 최종 CTA: 초록 "네이버페이로 구매" + "찜하기"

## 디자인
- 색상: 초록(#03c75a), 흰색, 연회색(#f5f5f5)
- 라이프스타일 감성, 여백 충분히
- Noto Sans KR, 스크롤 페이드인, 숫자 카운트업`;
}

// ── 프리미엄 스타일 프롬프트 ──────────────────────────────────────────────

function buildPremiumPrompt(input: PremiumInput): string {
  const base = buildBaseSection(input);

  const endorsementText =
    input.endorsements.filter((e) => e.name).length > 0
      ? input.endorsements
          .filter((e) => e.name)
          .map((e) => `- ${e.name} (${e.platform}): "${e.quote}"`)
          .join("\n")
      : "없음";

  const videoText =
    input.videos.length > 0
      ? input.videos
          .map(
            (v, i) =>
              `- 영상 ${i + 1}: ${v.url}${v.caption ? ` (${v.caption})` : ""}\n  → <!-- VIDEO_${i + 1}_PLACEHOLDER: ${v.url} --> 주석 + 검은 배경 재생버튼 UI`
          )
          .join("\n")
      : "없음";

  return `${base}

## 프리미엄 전용 정보
- **브랜드 헤리티지**: ${input.brandHeritage || "미입력"}
- **소재/장인정신**: ${input.materialsStory || "미입력"}
- **컬렉션명**: ${input.collectionName || "미입력"}
- **한정판 정보**: ${input.limitedEditionInfo || "해당 없음"}
- **언박싱 경험**: ${input.unboxingDescription || "미입력"}

## 인플루언서/전문가 추천
${endorsementText}

## 영상 플레이스홀더
${videoText}

## 필수 포함 섹션 — 5단계 전환 구조 (프리미엄 버전)

### [1단계] 히어로 — 희소성·감성 폭발
- 다크 배경 풀스크린, [IMAGE_1] 전폭 배치
- 컬렉션명 + 골드 텍스트 헤드라인
- 제품 스펙 ❌ → "당신의 삶이 바뀌는 순간" 식 감성 카피
- 한정판 배지 (입력된 경우)

### [2단계] 신뢰 & 권위 블록
- 판매량·만족도·후기수·재구매율 (다크 테마 카드, 느린 카운트업)
- 전/후 변화 비교 (고급스럽게 연출)
- 인증/시험 결과 뱃지

### [3단계] 브랜드 스토리 & 장인정신
- 브랜드 헤리티지 타임라인 or 산문 + 이미지 교차
- 소재/장인정신 섹션 ([IMAGE_2] 클로즈업)
- "왜 이 제품인가?" 고급 어휘 카피

### [4단계] 사회적 증거 & 인플루언서
- 전문가/인플루언서 추천 다크 카드
- 별점 + 후기 (미니멀 스타일)
- 재구매율 강조

### [5단계] 구매 불안 제거 & 스토리 마무리
- 언박싱 경험 섹션 (패키지 이미지 + 설명)
- 영상 플레이스홀더 UI (입력된 경우)
- 배송·환불·AS 골드 아이콘 카드
- 이미지 갤러리 ([IMAGE_N] 전체, 전폭 슬라이더 스타일)
- 스펙 테이블 (다크 테마)
- CTA: 골드 "지금 주문하기" + "컬렉션 보기"

## 디자인
- 색상: 다크(#1a1a1a), 골드(#b8960c), 흰색
- 미니멀 타이포그래피, 풍부한 여백
- 느린 페이드인 (0.8s+), 고급스러운 hover 효과
- Noto Sans KR (400, 700, 900 weight)`;
}
