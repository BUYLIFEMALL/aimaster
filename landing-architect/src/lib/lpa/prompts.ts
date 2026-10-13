import type { Inputs, Plan, PlanSection } from "./types";
import { LAYOUT_LABELS, templateById } from "./templates";

const clean = (s: string, max: number) => s.replace(/\s+/g, " ").trim().slice(0, max);

export function yearGuard(year = new Date().getFullYear()): string {
  return `[기준 연도 엄수: 현재 연도는 ${year}년입니다. 모든 연도 표기와 정보는 반드시 ${year}년(당해 연도)을 기준으로 작성하고 과거 연도로 퇴행하지 마세요.]`;
}

export const SYSTEM_INSTRUCTION = `당신은 한국어 웹 기획 전문가이자 UX 디자이너입니다.
- 모든 출력은 한국어로 작성합니다(영문 이미지 키워드 제외).
- 레이아웃 유형은 card(모바일 프로필 카드), document(A4 문서), hero(전체 화면 입력 폼), gallery(그리드 모음), landing(섹션 스크롤) 중 하나입니다.
- 사람이 등장하는 이미지를 묘사할 때는 별도 지시가 없으면 한국인 기준으로 묘사합니다.
- 요청한 형식(JSON 또는 HTML)만 출력하고 설명 문장은 덧붙이지 않습니다.`;

export function suggestPrompt(topic: string, year = new Date().getFullYear()): string {
  return `${yearGuard(year)}
다음 웹페이지 주제에 맞는 구체적인 타겟 사용자와 달성 목표를 한국어로 제안해 주세요.
- target: 연령대·상황·관심사를 포함한 구체적 인구통계 + 심리 (1~2문장)
- goal: 측정 가능한 목표 (1문장)
주제: ${clean(topic, 200)}
JSON {"target": "...", "goal": "..."} 형식으로만 응답하세요.`;
}

const SCHEMA_GUIDE = `{
  "projectInfo": { "topic": "", "target": "", "goal": "", "language": "ko", "layoutType": "card|document|hero|gallery|landing", "structureStrategy": "", "designIntent": "" },
  "structure": {
    "mainPage": { "title": "", "sections": [ { "id": "", "title": "", "description": "" } ] },
    "subPages": [ { "id": "", "title": "", "path": "/", "purpose": "", "contentSpecs": "" } ]
  },
  "contentStrategy": { "headline": "", "subHeadline": "", "cta": "", "keyMessages": [""] },
  "designSystem": { "primaryColor": "#RRGGBB", "secondaryColor": "#RRGGBB", "backgroundColor": "#RRGGBB", "typography": "", "mood": "" },
  "developmentGuide": { "stack": "Vite + React + TypeScript + Tailwind CSS", "folderStructure": [""], "deployment": "" },
  "imageAssets": [ { "name": "", "keyword": "영문 소문자 키워드", "description": "" } ]
}`;

export function planPrompt(i: Inputs, year = new Date().getFullYear()): string {
  const t = templateById(i.templateId);
  const structure = t.structure === "Auto-Detect"
    ? "주제에 가장 알맞은 레이아웃 유형을 직접 고르고, 메인 1개 + 서브 페이지 4개로 구성하세요."
    : `레이아웃 유형은 ${t.type}(${LAYOUT_LABELS[t.type]})로 고정하고, 다음 구조를 임의로 바꾸지 마세요: ${t.structure}`;
  return `${yearGuard(year)}
다음 정보를 바탕으로 웹페이지 기획안을 만들어 주세요.
- 주제: ${clean(i.topic, 200)}
- 타겟: ${clean(i.target, 400)}
- 목표: ${clean(i.goal, 400)}
- 구조 전략: ${structure}

서브 페이지는 정확히 4개입니다. 이미지 에셋은 6~10개, keyword는 이미지 검색에 쓸 영문 소문자 단어(하이픈 연결 가능)로 쓰세요.
아래 JSON 스키마 그대로, JSON만 출력하세요.
${SCHEMA_GUIDE}`;
}

export function sectionPrompt(i: Inputs, plan: Plan, section: PlanSection, year = new Date().getFullYear()): string {
  return `${yearGuard(year)}
아래는 현재 기획안입니다. 이 중 "${section}" 섹션만 더 좋게 다시 작성해 주세요. 다른 섹션과 일관성을 유지하고, 서브 페이지가 있다면 4개를 유지하세요.
주제: ${clean(i.topic, 200)} / 타겟: ${clean(i.target, 400)} / 목표: ${clean(i.goal, 400)}

현재 기획안:
${JSON.stringify(plan)}

"${section}" 섹션의 값만 JSON으로 출력하세요(키 이름 없이 그 섹션의 값 자체).`;
}

const LAYOUT_GUIDE: Record<string, string> = {
  card: "모바일 프로필 카드 스타일: 중앙 정렬 단일 컬럼(max-w-md), 큰 프로필/로고, 버튼형 링크 목록.",
  document: "A4 문서 스타일: 흰 종이 질감, 좁은 본문 폭(max-w-3xl), 명확한 제목 계층과 구분선, 인쇄 친화적 대비.",
  hero: "히어로 스타일: 화면 전체 높이의 배경 이미지와 중앙의 큰 헤드라인·입력 폼.",
  gallery: "갤러리 스타일: 반응형 그리드 카드(grid-cols-1/2/3), 호버 효과, 이미지 중심.",
  landing: "랜딩 스타일: 상단 고정 내비게이션 + 히어로 + 여러 섹션 스크롤 + 하단 CTA와 푸터.",
};

export function codePrompt(plan: Plan, year = new Date().getFullYear()): string {
  const layout = plan.projectInfo.layoutType;
  return `${yearGuard(year)}
아래 기획안을 바탕으로 **단일 HTML 파일** 프로토타입을 만들어 주세요.

[기술 규칙]
- <!DOCTYPE html>부터 </html>까지 완전한 문서 하나만 출력합니다(설명 금지, importmap·React import 금지).
- Tailwind CSS CDN(<script src="https://cdn.tailwindcss.com"></script>)과 Font Awesome CDN만 사용합니다.
- 메인(#home)과 서브 페이지 4개(#sub-page 영역)를 JavaScript로 전환하는 SPA 방식으로 구현하고, 서브 페이지에는 "메인으로 돌아가기" 버튼을 둡니다.
- 모든 이미지는 https://loremflickr.com/1600/900/{영문키워드} 형식의 URL을 쓰고, 키워드는 기획안 imageAssets의 keyword를 사용합니다. 이미지에는 의미 있는 alt를 넣습니다.
- 모바일 반응형, 접근성(대비·포커스) 유지, 한국어 문구를 사용합니다.
- 지도 iframe은 기획안에 오시는 길/지도가 명시된 경우에만 넣습니다.
- 디자인 시스템의 색상(primary/secondary/background)을 Tailwind 임의값이나 CSS 변수로 반영합니다.

[레이아웃 가이드(${layout})]
${LAYOUT_GUIDE[layout] ?? LAYOUT_GUIDE.landing}

[기획안]
${JSON.stringify(plan)}`;
}
