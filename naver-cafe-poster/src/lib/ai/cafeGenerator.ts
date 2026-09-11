import "server-only";
import { ensureParagraphBreaks } from "./formatContent";

export interface GenerateCafePostInput {
  topic: string;
  keywords?: string[];
}

export interface GenerateCafePostResult {
  title: string;
  content: string;
}

// 네이버 카페 게시글은 Threads와 달리 글자수 제한이 없고, 존댓말/커뮤니티 톤이
// 자연스럽다 — 카페 회원들에게 공지/정보를 전달하는 느낌으로 작성한다.
const CAFE_SYSTEM_PROMPT = `너는 네이버 카페 운영 경험이 많은 카페 매니저야. 너의 개인적인 답변은 하지 마.
주어진 주제로 카페 게시판에 올릴 글을 작성해줘. 다음 조건을 반드시 지키세요.

1. 첫 줄은 "제목: "으로 시작하는 게시글 제목 한 줄 (20자 이내)
2. 그 다음 줄부터는 본문. 정중한 존댓말(-습니다/-해요체)로 작성하세요
3. 1~2문장마다 문단을 끊고, 문단과 문단 사이에는 줄바꿈을 두 번(빈 줄 하나) 넣어서 시각적으로 나누세요
4. 카페 회원들에게 도움이 되는 정보 전달에 집중하고, 과도한 광고 느낌은 피하세요
5. 주어진 키워드가 있다면 자연스럽게 본문에 녹여 넣으세요 (해시태그 나열 금지)

출력 형식 예시:
제목: (여기에 제목)
(빈 줄)
(본문 내용)

게시글을 만든 후에는 추가 해설이나 설명 없이 바로 출력하면 됩니다.`;

export async function generateCafePostContent(
  input: GenerateCafePostInput,
  apiKey: string,
): Promise<GenerateCafePostResult> {
  if (!apiKey) {
    throw new Error("OpenAI API 키가 없습니다. 설정에서 본인 키를 등록해주세요.");
  }

  const keywords = (input.keywords ?? []).filter((k) => k.trim().length > 0);
  const keywordLine = keywords.length > 0 ? `\n포함할 키워드: ${keywords.join(", ")}` : "";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: CAFE_SYSTEM_PROMPT },
        { role: "user", content: `주제: ${input.topic}${keywordLine}` },
      ],
      max_tokens: 1200,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`AI 생성 요청이 실패했습니다. (${response.status}) ${errorBody}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const rawContent = data.choices?.[0]?.message?.content?.trim();
  if (!rawContent) {
    throw new Error("AI가 빈 응답을 반환했습니다.");
  }

  const titleMatch = rawContent.match(/^제목:\s*(.+)$/m);
  const title = titleMatch?.[1]?.trim() ?? input.topic.slice(0, 20);
  const bodyWithoutTitle = titleMatch
    ? rawContent.slice((titleMatch.index ?? 0) + titleMatch[0].length).trim()
    : rawContent;

  return { title, content: ensureParagraphBreaks(bodyWithoutTitle) };
}
