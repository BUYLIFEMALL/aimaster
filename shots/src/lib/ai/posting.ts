import "server-only";
import { YOUTUBE_CATEGORY_OPTIONS } from "@/lib/youtubeCategories";

/** 제목/스크립트를 보고 가장 어울리는 유튜브 카테고리를 GPT가 고른다. */
export async function suggestYoutubeCategory(
  title: string,
  script: string,
  apiKey: string,
): Promise<string> {
  if (!apiKey) {
    throw new Error("OpenAI API 키가 없습니다. 설정 > API 키 설정에서 본인의 OpenAI API 키를 등록해주세요.");
  }

  const options = YOUTUBE_CATEGORY_OPTIONS.map((o) => `${o.id}: ${o.label}`).join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `아래 유튜브 카테고리 목록 중, 주어진 쇼츠 영상 내용에 가장 어울리는 카테고리 id 하나만 정확히 골라라.\n${options}\n\n반드시 아래 JSON 형식으로만 출력하라: {"categoryId": "숫자"}`,
        },
        { role: "user", content: `제목: ${title}\n\n내용: ${script}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`카테고리 분류 요청이 실패했습니다. (${response.status}) ${await response.text()}`);
  }

  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error("AI가 빈 응답을 반환했습니다.");

  const parsed = JSON.parse(raw) as { categoryId?: string };
  const valid = YOUTUBE_CATEGORY_OPTIONS.some((o) => o.id === parsed.categoryId);
  return valid ? parsed.categoryId! : "24"; // 기본값: 엔터테인먼트
}

const INSTAGRAM_CAPTION_SYSTEM_PROMPT = `주어진 콘텐츠와 주제에 맞는 인스타그램 카드뉴스 스타일 캡션을 생성하세요.

본문에 "인스타그램 스크립트 카드 뉴스 콘텐츠" 같은 불필요한 제목은 쓰지 말고 본문 내용만 작성하세요.

요구사항:
- 9~10개 단락으로 나누어 작성 (전체 1500~1800자)
- 각 단락은 2~4문장 이내로 간결하게, 단락 사이엔 한 줄 공백
- 잡지 기사/전문 블로그처럼 깔끔하고 편집적인 문체
- 각 단락 앞에 내용에 어울리는 이모지 1개
- 과도한 반복, 불필요한 설명, 장황한 문장은 제거
- 마지막 줄에 해시태그 3~5개
- 한국어로, "**" 같은 마크다운 서식 없이 일반 텍스트로만 작성`;

/** 영상 제목/스크립트로 인스타그램 릴스용 카드뉴스 스타일 캡션을 생성한다. */
export async function generateInstagramCaption(
  title: string,
  script: string,
  apiKey: string,
): Promise<string> {
  if (!apiKey) {
    throw new Error("OpenAI API 키가 없습니다. 설정 > API 키 설정에서 본인의 OpenAI API 키를 등록해주세요.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: INSTAGRAM_CAPTION_SYSTEM_PROMPT },
        { role: "user", content: `제공된 주제: ${title}\n제공 정보: ${script}` },
      ],
      max_tokens: 4000,
      temperature: 1,
    }),
  });

  if (!response.ok) {
    throw new Error(`인스타그램 캡션 생성 요청이 실패했습니다. (${response.status}) ${await response.text()}`);
  }

  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("AI가 빈 응답을 반환했습니다.");
  return content;
}
