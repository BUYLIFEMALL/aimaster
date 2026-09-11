import "server-only";
import { ensureParagraphBreaks } from "./formatContent";
import type { CafeTone } from "./tone";

export type { CafeTone };

// blog(BLOG(원문)생성 자동화)의 AI 글쓰기 폼(app/write/ai-form)이 지원하는 세부 옵션
// (tone/targetAudience/wordCount/keywords/referenceUrls/customInstructions/cta)을
// 그대로 이식했다 — 사용자가 "블로그 글쓰기 메뉴를 적용해달라"고 명시적으로 요청함
// (2026-09-11). blog/utils/news/generator.ts의 toneRule/audienceRule/wordCountRule/
// referenceRule/customRule 패턴과 동일하게, 참고 URL은 실제로 스크랩하지 않고
// AI에게 URL 텍스트 그대로 참고하라고 넘기는 방식(모델이 아는 경우에만 반영)을 그대로 따른다.

export interface GenerateCafePostInput {
  topic: string;
  tone?: CafeTone;
  targetAudience?: string;
  wordCount?: number;
  keywords?: string[];
  referenceUrls?: string[];
  customInstructions?: string;
  cta?: { text: string; url: string };
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
2. 그 다음 줄부터는 본문. 정중한 존댓말(-습니다/-해요체)로 작성하세요 (지정된 어조는 문체의
   느낌에만 반영하고, 존댓말 자체는 절대 깨지 않습니다)
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
  const referenceUrls = (input.referenceUrls ?? []).filter((u) => u.trim().length > 0);

  const toneRule = input.tone ? `- 글 분위기(Tone): '${input.tone}' 어조로 작성하세요.` : "";
  const audienceRule = input.targetAudience
    ? `- 대상 독자: '${input.targetAudience}' 독자층을 염두에 두고 눈높이에 맞춰 작성하세요.`
    : "";
  const wordCountRule = input.wordCount
    ? `- 목표 분량: 약 ${input.wordCount}단어(공백 제외 약 ${Math.round(input.wordCount * 2.2)}자 이상)로 풍부하게 작성하세요.`
    : "";
  const keywordRule = keywords.length > 0 ? `- 포함할 키워드: ${keywords.join(", ")}` : "";
  const referenceRule = referenceUrls.length > 0 ? `- 참고 URL: ${referenceUrls.join(", ")}` : "";
  const customRule = input.customInstructions
    ? `- 추가 필수 지시사항: ${input.customInstructions} (★ 이 지침을 최우선으로 반영할 것)`
    : "";

  const ruleLines = [toneRule, audienceRule, wordCountRule, keywordRule, referenceRule, customRule]
    .filter(Boolean)
    .join("\n");

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
        {
          role: "user",
          content: `주제: ${input.topic}${ruleLines ? `\n\n다음 세부 옵션을 반영해주세요:\n${ruleLines}` : ""}`,
        },
      ],
      max_tokens: 1800,
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

  let content = ensureParagraphBreaks(bodyWithoutTitle);

  // CTA는 프롬프트가 아니라 생성 후 코드에서 직접 덧붙인다 — 시스템 프롬프트에 예시로
  // 넣으면 AI가 실제 CTA 데이터가 없을 때도 placeholder를 지어내는 문제가 있다
  // (docs/PLATFORM_PATTERNS.md §3, threads 프로젝트에서 확인된 문제 패턴).
  if (input.cta?.text && input.cta?.url) {
    content += `\n\n📢 ${input.cta.text}\n${input.cta.url}`;
  }

  return { title, content };
}
