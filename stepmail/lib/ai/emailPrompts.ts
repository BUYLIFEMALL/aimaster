import "server-only";
import { callOpenAiJson } from "./openai";

// blog의 AI 글쓰기 폼(주제/키워드/참고링크/추천링크/추가지시사항 -> AI 초안)과 동일한 입력
// 구조를 이메일에 맞게 재구성한 프롬프트. 기사 전체가 아니라 짧은 이메일 1통 분량이라는 점만
// 다르다.
const EMAIL_SYSTEM_PROMPT = `# 역할 및 목표

당신은 전환율 높은 이메일 마케팅/아웃리치 카피라이터입니다. 사용자가 준 주제/키워드/참고자료/
추천링크를 바탕으로, 받는 사람이 끝까지 읽고 행동하게 만드는 이메일 제목과 본문을 작성합니다.

# 지침

* 제목은 스팸으로 분류되지 않으면서도 열어보고 싶게 만드는 자연스러운 한 문장으로 작성하세요
  (과도한 느낌표/전부 대문자/"무료!!!" 같은 스팸성 표현 금지).
* 본문은 짧고 명확하게: 인사 -> 핵심 메시지(주제) -> (참고자료가 있다면 자연스럽게 녹여서 신뢰
  보강) -> 추천링크(CTA)가 있다면 눈에 띄는 버튼으로 마무리.
* 이메일 클라이언트에서 안전하게 보이는 **인라인 스타일의 단순한 HTML**만 사용하세요
  (외부 CSS/JS/복잡한 레이아웃 금지, 사진/이미지 태그 넣지 마세요 — 텍스트와 버튼 링크만).
* "추천링크"가 주어지면, 본문 하단에 눈에 띄는 버튼 스타일(예: 배경색 있는 <a> 태그)로 만드세요.
* 추가 지시사항이 있으면 반드시 반영하세요.
* 한국어로 자연스럽게 작성하세요.

# 출력 형식

다음 JSON 형식으로만 출력하라 (다른 설명/마크다운 금지):
{"subject": "이메일 제목", "bodyHtml": "이메일 본문 (HTML)"}`;

export interface GenerateEmailDraftInput {
  topic: string;
  keywords?: string[];
  referenceUrls?: string[];
  ctaText?: string;
  ctaUrl?: string;
  customPrompt?: string;
}

export interface GenerateEmailDraftResult {
  subject: string;
  bodyHtml: string;
}

export async function generateEmailDraft(
  input: GenerateEmailDraftInput,
  apiKey: string,
): Promise<GenerateEmailDraftResult> {
  const lines = [`# 요청`, `주제: ${input.topic}`];
  if (input.keywords?.length) lines.push(`키워드: ${input.keywords.join(", ")}`);
  if (input.referenceUrls?.length) lines.push(`참고 자료:\n${input.referenceUrls.map((u) => `- ${u}`).join("\n")}`);
  if (input.ctaText || input.ctaUrl) {
    lines.push(`추천링크(CTA): 문구="${input.ctaText ?? "자세히 보기"}", URL="${input.ctaUrl ?? "#"}"`);
  }
  if (input.customPrompt) lines.push(`추가 지시사항: ${input.customPrompt}`);

  return callOpenAiJson<GenerateEmailDraftResult>(EMAIL_SYSTEM_PROMPT, lines.join("\n"), apiKey, {
    model: "gpt-4o-mini",
    temperature: 0.9,
    maxTokens: 1800,
  });
}
