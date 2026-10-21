import type { Database } from "@/types/database.types";

type Product = Database["public"]["Tables"]["shop_products"]["Row"];

// v1.17(2026-10-21, 이커머스 병합 E2): 상세페이지 자동생성기 v1(auto-detail-page)의 HTML 템플릿 3종을 옮겨 왔다
// (원본: auto-detail-page/lib/prompt-builder.ts). 바꾼 점:
//  ① 판매량·만족도·후기·재구매율·인증을 「AI 추정값/자동 생성」으로 채우던 지시를 없앴다 — 지어낸 후기·수치는 허위 광고가 된다.
//  ② JavaScript 금지(카운트다운·카운트업 제거) — 마켓 편집기가 스크립트를 지우고, 미리보기도 스크립트 없이 격리해서 보여준다.
//  ③ 이미지는 이 앱에서 이미 만든 섹션 이미지([IMAGE_N])만 쓴다.

export type HtmlTemplate = "coupang" | "smartstore" | "premium";

export const HTML_TEMPLATES: Record<HtmlTemplate, { label: string; description: string }> = {
  coupang: { label: "쿠팡 스타일", description: "빨강·노랑 — 가격·혜택 중심의 즉시 구매형" },
  smartstore: { label: "스마트스토어 스타일", description: "초록·흰색 — 브랜드 신뢰·감성형" },
  premium: { label: "프리미엄 스타일", description: "다크·골드 — 희소성·스토리텔링형" },
};

export function toHtmlTemplate(value: unknown): HtmlTemplate {
  return value === "smartstore" || value === "premium" ? value : "coupang";
}

const STYLE_GUIDE: Record<HtmlTemplate, string> = {
  coupang: `쿠팡 스타일: 빨강(#cc0000)·흰색·노랑(#ffd600)·연회색(#f5f5f5). 첫 화면은 고객이 얻는 결과 중심 헤드라인 + 판매가·정상가(입력된 경우만) + [IMAGE_1]. 이어서 문제 공감 → 해결 → 핵심 기능 카드 3~5개 → 사용 방법 → 스펙 표 → 구매 안내(입력된 정보만) → 「지금 구매하기」 버튼 모양의 마무리.`,
  smartstore: `스마트스토어 스타일: 초록(#03c75a)·흰색·연회색(#f5f5f5), 여백을 넉넉히. 첫 화면은 [IMAGE_1]과 「○○ 하나로 ○○」 식 감성 헤드라인. 이어서 브랜드·제품 이야기 → 핵심 특징 카드 3~5개 → 사용 방법 단계 → 스펙 표 → 자주 묻는 질문(상품 정보로 답할 수 있는 것만 2~4개) → 마무리 안내.`,
  premium: `프리미엄 스타일: 다크(#1a1a1a)·골드(#b8960c), 고급 어휘. 첫 화면은 [IMAGE_1] 전폭 + 골드 헤드라인. 이어서 소재·디테일 이야기(클로즈업 이미지와 교차) → 「왜 이 제품인가」 → 핵심 특징 → 사용 장면 → 스펙 표 → 정중한 마무리.`,
};

export function buildHtmlDetailPrompt(params: {
  template: HtmlTemplate;
  product: Product;
  images: { placeholder: string; sectionName: string }[];
}): string {
  const p = params.product;
  const currentYear = new Date().getFullYear();
  const price = (v: number | null) => (v != null ? `${v.toLocaleString()}${p.currency ?? "원"}` : "미입력");
  const imageList = params.images.map((i) => `- ${i.placeholder}: ${i.sectionName} 섹션 이미지`).join("\n") || "이미지 없음";

  return `당신은 한국 이커머스 상세페이지 전문 디자이너이자 카피라이터입니다. (기준 연도: ${currentYear}년 — 연도 표기가 필요하면 ${currentYear}년을 쓰세요.)
아래 상품의 상세페이지를 HTML 문서 한 개로 작성하세요.

# 반드시 지킬 규칙
1. <!DOCTYPE html>부터 </html>까지 완전한 HTML만 출력. 마크다운·설명·코드블록 금지.
2. CSS는 <style> 한 곳에. 외부 링크는 Google Fonts(Noto Sans KR)만 허용.
3. **JavaScript·<script>·on* 속성 금지**(정적 HTML/CSS만). 애니메이션이 필요하면 CSS만.
4. 이미지는 아래 목록의 플레이스홀더만 <img src="[IMAGE_N]" style="width:100%;display:block">로 쓰고, 목록에 없는 이미지·외부 이미지 주소는 쓰지 마세요. 모든 이미지를 한 번 이상 쓰세요.
5. 모바일 우선, 최대 너비 860px, 세로로 긴 레이아웃.
6. **상품 정보에 없는 판매량·만족도·후기·별점·재구매율·인증·수상·의학적 효능·배송/환불 조건을 만들지 마세요.** 그런 블록은 정보가 있을 때만 넣고, 없으면 섹션 자체를 빼세요. 가짜 고객 후기 금지.
7. 카피는 스펙 나열보다 고객이 얻는 변화·편리함 중심의 자연스러운 한국어.

# 디자인
${STYLE_GUIDE[params.template]}

# 상품 정보
- 상품명: ${p.name ?? p.product_label ?? "미입력"}
- 카테고리: ${p.category ?? "미입력"}
- 정상가: ${price(p.price)} / 판매가: ${price(p.sale_price)}
- 핵심 특징:
${p.key_features ?? "미입력"}
- 상세 스펙:
${p.specs ?? "미입력"}
- 사용 방법:
${p.how_to_use ?? "미입력"}
- 타겟 고객: ${p.target_customer ?? "미입력"}
- 분위기: ${(p.mood_keywords ?? []).join(", ") || "미입력"}

# 이미지 플레이스홀더
${imageList}`;
}

/** 모델이 코드블록으로 감싸거나 스크립트를 넣었을 때를 대비해 정리한다(미리보기는 별도로 스크립트 없이 격리). */
export function sanitizeGeneratedHtml(text: string): string {
  return text
    .trim()
    .replace(/^```html\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/```\s*$/, "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .trim();
}
