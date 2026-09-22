import "server-only";
import { resolveOpenAIContentModel } from "./openaiModels";

export interface SeoDraft { title: string; body: string; seoReport: Record<string, string>; }

export function normalizeBlogText(value: string) {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

const STRATEGY_GUIDE: Record<string, string> = {
  "C-Rank 기본": "특정 주제에 대한 실제 경험과 전문성을 중심으로 구성합니다.",
  ALCON: "서로 다른 검색 의도를 소제목별로 나누어 폭넓게 답합니다.",
  AEO: "두괄식 요약, 비교 정보, FAQ를 넣어 답변형 구조로 구성합니다.",
  "홈판 스토리": "독자의 공감과 체류를 돕는 자연스러운 이야기 흐름을 사용합니다.",
  "인사이트 엣지": "좁고 깊은 관점과 실용적인 판단 기준을 제시합니다.",
};

function normalizeSeoReport(report: Partial<Record<string, unknown>> | undefined, body: string) {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(report ?? {})) {
    if (typeof value === "string" && value.trim()) result[key] = normalizeBlogText(value).slice(0, 500);
  }
  const paragraphs = body.split(/\n\s*\n/).filter(Boolean).length;
  result.paragraphCount ??= String(paragraphs);
  result.readability ??= paragraphs >= 4 ? "소제목과 문단을 나누어 읽기 쉽게 구성했습니다." : "문단을 더 나누면 모바일에서 읽기 좋습니다.";
  return result;
}

export async function generateSeoDraft(params: { apiKey: string; topic: string; keywords: string[]; strategy: string; model?: string }): Promise<SeoDraft> {
  if (!/^[\x00-\xFF]*$/.test(params.apiKey)) throw new Error("등록된 OpenAI API 키 형식이 올바르지 않습니다.");
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${params.apiKey}` },
    body: JSON.stringify({
      model: resolveOpenAIContentModel(params.model),
      messages: [
        { role: "system", content: `당신은 한국어 네이버 블로그 콘텐츠 편집자입니다. ${STRATEGY_GUIDE[params.strategy] ?? STRATEGY_GUIDE["C-Rank 기본"]}

검색 의도를 먼저 추론하고, 독자가 실제로 도움을 얻는 자연스러운 초안을 작성하세요. 제목은 25~40자 안팎으로 핵심 키워드를 한 번만 넣습니다. 본문은 다음 규칙을 반드시 지킵니다.
1. 첫 문단은 검색 의도에 바로 답하는 2~3문장 요약입니다.
2. 3~5개의 소제목을 일반 문장으로 작성하고, 소제목 앞뒤에는 빈 줄을 둡니다. 마크다운 기호(#, *, -, ##)와 HTML은 사용하지 않습니다.
3. 각 문단은 2~4문장, 80~220자 정도로 나누고 문단 사이에는 빈 줄을 하나만 둡니다. 모바일에서 읽기 좋은 호흡을 유지합니다.
4. 핵심 키워드는 문맥에 맞게 자연스럽게 사용하며 억지 반복·키워드 나열·해시태그는 금지합니다.
5. 확인되지 않은 수치, 출처, 체험담을 만들지 말고 필요한 곳은 [확인 필요]라고 표시합니다. AI 탐지 회피를 약속하거나 자동 발행을 유도하지 않습니다.

제목과 본문은 JSON으로만 응답하세요. 형식: {"title":"...","body":"...","seoReport":{"searchIntent":"...","strength":"...","factCheck":"..."}}` },
        { role: "user", content: `주제: ${params.topic}\n핵심 키워드: ${params.keywords.join(", ") || "없음"}\n전략: ${params.strategy}\n\n독자가 이 주제를 검색하는 구체적인 질문에 답하고, 실제 사용자가 자신의 경험과 사실을 덧붙일 수 있는 초안으로 작성하세요.` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.65,
    }),
  });
  if (!response.ok) throw new Error(`AI 글 생성 요청이 실패했습니다. (${response.status})`);
  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error("AI가 빈 응답을 반환했습니다.");
  const parsed = JSON.parse(raw) as Partial<SeoDraft>;
  if (!parsed.title || !parsed.body) throw new Error("AI가 제목과 본문을 모두 반환하지 않았습니다.");
  const title = normalizeBlogText(parsed.title).replace(/\n+/g, " ").slice(0, 150);
  const body = normalizeBlogText(parsed.body);
  if (body.length < 120) throw new Error("AI가 충분한 길이의 본문을 반환하지 않았습니다. 다시 시도해 주세요.");
  return { title, body, seoReport: normalizeSeoReport(parsed.seoReport, body) };
}
