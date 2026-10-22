// BLC-09 (2026-10-22): 「구간별로 쓰기」 프롬프트 — 순수 함수. blog-workroom src/lib/prompts.ts의 outlinePrompt·sectionPrompt 방식.
// rules = 문체(styleSection, 끝맺음 필수 규칙 없음 — v1.91 교훈) + 사실 규칙(factRule·groundingSection). 서버 lib/outlineContext.ts의 sectionRules가 만든다.
// 이 파일은 시험에서 바로 import하도록 실제 가져오기가 없다(형식만).
import type { OutlineSection } from "../sections";

type Persona = { name: string; toneDescription: string };
export type SectionRules = { style: string; facts: string };

function common(today: string, persona: Persona, rules: SectionRules) {
  return `당신은 한국어 네이버 블로그 콘텐츠 편집자입니다. 오늘은 한국 기준 ${today}입니다.
선택한 글쓰기 페르소나는 '${persona.name}'입니다. 다음 톤과 관점을 일관되게 반영하세요: ${persona.toneDescription}${rules.style}
마크다운 기호(#, *, -, ##)와 HTML은 쓰지 않습니다. 확인되지 않은 수치·기업 사례·개인 경험은 만들지 말고 [확인 필요]로 표시합니다. AI 탐지 회피를 약속하지 않습니다.
${rules.facts}

JSON만 반환합니다.`;
}

export function outlinePrompt(p: { today: string; persona: Persona; rules: SectionRules; keyword: string }): { system: string; user: string } {
  return {
    system: common(p.today, p.persona, p.rules),
    user: `검색어 「${p.keyword}」로 쓸 블로그 글의 제목 후보와 구성을 만드세요.
- 제목 후보 3개: 25~40자, 핵심 키워드를 한 번만 넣습니다.
- 구성 5~6개: 첫 항목은 도입부(heading은 빈 문자열, 검색 의도에 바로 답하는 요약), 나머지는 소제목(자연스러운 질문형 또는 판단 기준형 문장). 각 항목의 goal에 그 부분에 담을 내용을 승인 근거 기준으로 한 문장으로 적습니다.
JSON: {"titles":["제목 후보 3개"],"sections":[{"heading":"","goal":""}]}`,
  };
}

export function sectionPrompt(p: { today: string; persona: Persona; rules: SectionRules; title: string; sections: OutlineSection[]; index: number }): { system: string; user: string } {
  const outline = p.sections.map((s, i) => `${i === p.index ? "▶ " : ""}${i + 1}. ${s.heading || "(도입)"} — ${s.goal}`).join("\n");
  const before = p.sections.slice(0, p.index).filter((s) => s.body).map((s) => `${s.heading ? `${s.heading}\n` : ""}${s.body}`).join("\n\n").slice(-2500);
  const target = p.sections[p.index];
  const size = p.index === 0 ? "공백 제외 250~400자, 2~3개 문단" : "공백 제외 350~550자, 2개 이상 문단(문단마다 3~5문장)";
  return {
    system: common(p.today, p.persona, p.rules),
    user: `글 제목: ${p.title}
전체 구성(▶ 표시가 이번에 쓸 부분):
${outline}
${before ? `\n앞에서 이미 쓴 내용(겹치지 않게, 자연스럽게 이어서):\n${before}\n` : ""}
이번에는 ${target.heading ? `소제목 「${target.heading}」 아래 본문` : "도입부"}만 쓰세요. 목표: ${target.goal}
분량: ${size}. 소제목 문장 자체는 본문에 다시 쓰지 않습니다. 독자가 실제로 실행할 수 있는 순서·선택 기준·주의할 점을 담습니다.
JSON: {"body":"이 부분의 본문"}`,
  };
}
