import "server-only";

export interface SeoDraft { title: string; body: string; seoReport: Record<string, string>; }

function normalizeBlogText(value: string) {
  return value
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
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

export async function generateSeoDraft(params: { apiKey: string; topic: string; keywords: string[]; strategy: string }): Promise<SeoDraft> {
  if (!/^[\x00-\xFF]*$/.test(params.apiKey)) throw new Error("등록된 OpenAI API 키 형식이 올바르지 않습니다.");
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${params.apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `당신은 한국어 네이버 블로그 콘텐츠 편집자입니다. ${STRATEGY_GUIDE[params.strategy] ?? STRATEGY_GUIDE["C-Rank 기본"]} AI 탐지를 피한다고 과장하거나 존재하지 않는 경험을 지어내지 말고, 사용자가 사실을 확인할 수 있는 초안을 작성하세요. 제목과 본문은 JSON으로만 응답하세요. {"title":"...","body":"...","seoReport":{"searchIntent":"...","strength":"...","factCheck":"..."}}` },
        { role: "user", content: `주제: ${params.topic}\n핵심 키워드: ${params.keywords.join(", ")}\n전략: ${params.strategy}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
  });
  if (!response.ok) throw new Error(`AI 글 생성 요청이 실패했습니다. (${response.status})`);
  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error("AI가 빈 응답을 반환했습니다.");
  const parsed = JSON.parse(raw) as Partial<SeoDraft>;
  if (!parsed.title || !parsed.body) throw new Error("AI가 제목과 본문을 모두 반환하지 않았습니다.");
  return { title: normalizeBlogText(parsed.title), body: normalizeBlogText(parsed.body), seoReport: parsed.seoReport ?? {} };
}
