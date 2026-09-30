import "server-only";
import { resolveContentModel, type ContentProvider } from "./contentModels";
import { generateContentJson } from "./contentJson";
import { getExplicitYears, getKoreaToday } from "./freshness";
import type { SeoPersona } from "./personas";

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

type OpenAiMessage = { role: "system" | "user"; content: string };

async function requestDraftJson(apiKey: string, provider: ContentProvider, model: string, messages: OpenAiMessage[]) {
  if (provider !== "openai") {
    const system = messages.find((message) => message.role === "system")?.content ?? "";
    const user = messages.find((message) => message.role === "user")?.content ?? "";
    return await generateContentJson({ apiKey, provider, model, system, user }) as Partial<SeoDraft>;
  }
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, response_format: { type: "json_object" }, temperature: 0.65 }),
  });
  if (!response.ok) throw new Error(`AI 글 생성 요청이 실패했습니다. (${response.status})`);
  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error("AI가 빈 응답을 반환했습니다.");
  return JSON.parse(raw) as Partial<SeoDraft>;
}

export async function generateSeoDraft(params: { apiKey: string; provider: ContentProvider; topic: string; keywords: string[]; strategy: string; persona: SeoPersona; model?: string; sourceContext?: string }): Promise<SeoDraft> {
  if (!/^[\x00-\xFF]*$/.test(params.apiKey)) throw new Error("등록된 OpenAI API 키 형식이 올바르지 않습니다.");
  const today = getKoreaToday();
  const explicitYears = [...getExplicitYears(params.topic, ...params.keywords)];
  const model = resolveContentModel(params.provider, params.model);
  const messages: OpenAiMessage[] = [
        { role: "system", content: `당신은 한국어 네이버 블로그 콘텐츠 편집자입니다. 오늘은 한국 기준 ${today}입니다. ${STRATEGY_GUIDE[params.strategy] ?? STRATEGY_GUIDE["C-Rank 기본"]}

선택한 글쓰기 페르소나는 '${params.persona.name}'입니다. 다음 톤과 관점을 일관되게 반영하세요: ${params.persona.toneDescription}

검색 의도를 먼저 추론하고, 독자가 실제로 도움을 얻는 자연스러운 초안을 작성하세요. 제목은 25~40자 안팎으로 핵심 키워드를 한 번만 넣습니다. 본문은 다음 규칙을 반드시 지킵니다.
1. 첫 문단은 검색 의도에 바로 답하는 3~4문장 요약입니다.
2. 소제목은 4개를 일반 문장으로 작성하고, 소제목 앞뒤에는 빈 줄을 둡니다. 마크다운 기호(#, *, -, ##)와 HTML은 사용하지 않습니다. 소제목은 자연스러운 질문형 또는 판단 기준형 문장으로 씁니다.
3. 전체 본문은 공백·줄바꿈을 제외하고 반드시 2,000~3,500자입니다. 각 소제목 아래에는 2개 이상의 문단을 두고, 각 문단은 3~5문장으로 충분히 구체적으로 설명합니다. 짧은 요약문으로 끝내지 마세요.
4. 독자가 실제로 실행할 수 있도록 업무 흐름, 선택 기준, 흔한 실수, 점검 방법을 포함합니다. 주제에 맞는 경우에만 최소 2개의 목록형 문단(• 기호)을 사용합니다. 확인되지 않은 실제 기업명·수치·경험담은 만들지 않습니다.
5. 핵심 키워드는 제목과 도입부, 관련 소제목에 자연스럽게 반영하며 억지 반복·키워드 나열·해시태그는 금지합니다.
6. 확인되지 않은 수치, 출처, 체험담을 만들지 말고 필요한 곳은 [확인 필요]라고 표시합니다. AI 탐지 회피를 약속하거나 자동 발행을 유도하지 않습니다.
7. 실시간 검색·뉴스·공식 자료가 제공되지 않았으므로 최신 수치, 정책, 순위, 연도별 사실을 지어내지 마세요. 사용자가 직접 제시한 연도(${explicitYears.join(", ") || "없음"}) 외의 연도는 제목과 본문에 쓰지 마세요. 최신성 검증이 필요한 내용은 [확인 필요]로 표시합니다.

제목과 본문은 JSON으로만 응답하세요. 형식: {"title":"...","body":"...","seoReport":{"searchIntent":"...","strength":"...","factCheck":"..."}}` },
        { role: "user", content: `주제: ${params.topic}\n핵심 키워드: ${params.keywords.join(", ") || "없음"}\n전략: ${params.strategy}\n페르소나: ${params.persona.name}${params.sourceContext ? `\n\n기존 글에서 확인한 핵심 내용(새 글의 관점과 구조를 잡는 참고 자료이며 문장을 복제하지 마세요):\n${params.sourceContext}` : ""}\n\n독자가 이 주제를 검색하는 구체적인 질문에 답하고, 실제 사용자가 자신의 경험과 사실을 덧붙일 수 있는 초안으로 작성하세요.` },
  ];
  let parsed = await requestDraftJson(params.apiKey, params.provider, model, messages);
  if (!parsed.title || !parsed.body) throw new Error("AI가 제목과 본문을 모두 반환하지 않았습니다.");
  const title = normalizeBlogText(parsed.title).replace(/\n+/g, " ").slice(0, 150);
  let body = normalizeBlogText(parsed.body);
  let compactLength = body.replace(/\s/g, "").length;
  if (compactLength < 2_000) {
    parsed = await requestDraftJson(params.apiKey, params.provider, model, [
      { role: "system", content: "당신은 한국어 네이버 블로그 전문 편집자입니다. 제공된 초안의 사실·제목·핵심 주제를 유지하면서 짧은 부분을 실무 절차, 선택 기준, 점검 방법, 구체적 예시로 보강합니다. 확인되지 않은 수치·기업 사례·개인 경험은 만들지 말고 [확인 필요]로 표시합니다. 마크다운·HTML·해시태그는 쓰지 않습니다. 반드시 공백 제외 2,000~3,500자의 자연스러운 완성형 본문으로 확장하고, 4개 소제목과 각 소제목 아래 2개 이상의 문단을 유지합니다. JSON만 반환합니다: {\"title\":\"원래 제목\",\"body\":\"확장된 본문\",\"seoReport\":{\"searchIntent\":\"...\",\"strength\":\"...\",\"factCheck\":\"...\"}}" },
      { role: "user", content: `주제: ${params.topic}\n핵심 키워드: ${params.keywords.join(", ") || "없음"}\n\n현재 초안(공백 제외 ${compactLength}자):\n${body}\n\n원문 의미를 삭제하거나 다른 주제로 바꾸지 말고, 부족한 설명을 더해 완성형 본문으로 확장하세요.` },
    ]);
    if (!parsed.body) throw new Error("AI가 보강 본문을 반환하지 않았습니다.");
    body = normalizeBlogText(parsed.body);
    compactLength = body.replace(/\s/g, "").length;
  }
  if (compactLength < 2_000) throw new Error(`AI가 보강 후에도 완성형 본문 분량을 충족하지 못했습니다. (공백 제외 ${compactLength}자 / 최소 2,000자)`);
  return { title, body, seoReport: normalizeSeoReport(parsed.seoReport, body) };
}
