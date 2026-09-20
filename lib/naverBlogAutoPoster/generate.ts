import "server-only";

// 주제 하나로 네이버 블로그용 제목+본문 초안을 생성한다. blog 서브프로젝트의
// structureBlogCandidates()와 동일하게 SDK 없이 fetch로 OpenAI Chat Completions를
// 직접 호출한다(본인 API 키를 그대로 Authorization 헤더에 실어서, 서버 쪽에 별도
// 클라이언트 설정 없이 바로 사용).

const SYSTEM_PROMPT = `당신은 네이버 블로그 글쓰기를 돕는 한국어 작가입니다. 주어진 주제로
실제 사람이 쓴 것처럼 자연스러운 블로그 글의 제목과 본문을 작성합니다.

규칙:
- 제목은 25자 이내, 클릭하고 싶어지는 자연스러운 문구로 작성합니다(과장/낚시성 금지).
- 본문은 문단을 줄바꿈(\n) 한 번으로 구분합니다. 문단마다 2~5문장 정도로 씁니다.
- 전체 본문은 5~8개 문단 정도로 작성합니다.
- 광고 문구, 해시태그, 이모지는 넣지 않습니다.
- 반드시 아래 JSON 형식으로만 응답하세요. 다른 설명은 절대 추가하지 마세요.
{"title": "...", "body": "문단1\\n문단2\\n문단3"}`;

export interface BlogDraft {
  title: string;
  body: string;
}

export async function generateBlogDraft(params: { apiKey: string; topic: string }): Promise<BlogDraft> {
  const { apiKey, topic } = params;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `주제: ${topic}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`AI 글 생성 요청이 실패했습니다. (${response.status}) ${errorBody}`);
  }

  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) {
    throw new Error("AI가 빈 응답을 반환했습니다.");
  }

  let parsed: Partial<BlogDraft>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI 응답을 JSON으로 해석하지 못했습니다.");
  }

  if (!parsed.title || !parsed.body) {
    throw new Error("AI가 제목/본문을 모두 반환하지 않았습니다.");
  }

  return { title: parsed.title, body: parsed.body };
}
