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

// Make.com 자동화에서 쓰던 인스타그램 캡션 생성 프롬프트를 그대로 이식했다 (동일한 결과물 톤 유지 목적).
const INSTAGRAM_CAPTION_SYSTEM_PROMPT = `주어진 콘텐츠와 주제에 맞는 인스타그램 스크립트 카드 뉴스 콘텐츠를 생성하세요.

본문글에 아래와 같은 필요없는 제목은 작성하지 말고 본문에만 충실해주세요.
예: 인스타그램 스크립트 카드 뉴스 콘텐츠

요구사항은 다음과 같습니다.

깔끔하고 읽기 쉬운 서식을 사용하여 9~10개의 단락으로 나누어 작성하세요.
전체 글자 수는 1500자 이상 1800자 이하로 작성하세요.
각 단락은 2~4문장 이내로 간결하게 구성하세요.
단락 사이에는 한 줄 공백을 두세요.
글쓰기 스타일은 잡지 기사나 전문 블로그 게시물과 유사하게 깔끔하고 편집적인 것이어야 합니다.
스크립트가 흥미롭고 유익하며 타겟 고객에게 적합하도록 작성하세요.
각 문단 앞에 문단내용에 어울리는 이모티콘을 1개씩 사용하세요.
과도한 반복, 불필요한 설명, 장황한 문장은 제거하세요.
해시태그는 마지막 줄에 3~5개 이내로 작성하세요.
한국어로 답변하세요.
"**" 또는 기타 서식 요소 없이 일반 텍스트로 문장으로 작성하세요.`;

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

const YOUTUBE_DESCRIPTION_SYSTEM_PROMPT = `주어진 제목과 스토리로 유튜브 쇼츠 설명란에 넣을 설명 글을 작성하세요.

본문에 "유튜브 설명" 같은 불필요한 제목은 쓰지 말고 본문 내용만 작성하세요.

요구사항:
- 첫 줄은 시청자의 흥미를 끄는 한두 문장 훅으로 시작하세요.
- 이어서 영상 내용을 짧은 문단 3~5개로 요약하세요. 각 문단은 2~3문장 이내로 간결하게, 문단 사이엔 한 줄 공백을 두세요.
- 전체 글자 수는 400자 이상 700자 이하로 작성하세요.
- 문장은 짧고 명확하게, 유튜브 쇼츠 시청자가 스크롤하며 훑어봐도 이해되도록 작성하세요.
- 과도한 반복, 불필요한 설명, 장황한 문장은 제거하세요.
- 마지막 줄에 영상 주제와 관련된 해시태그 3~5개를 작성하세요 (예: #쇼츠 포함 가능).
- 한국어로, "**" 또는 기타 마크다운 서식 없이 일반 텍스트로만 작성하세요.`;

/** 영상 제목/쇼츠 스토리로 유튜브 쇼츠 설명란에 쓸 텍스트를 생성한다 (인스타 캡션 생성과 동일한 패턴). */
export async function generateYoutubeDescription(
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
        { role: "system", content: YOUTUBE_DESCRIPTION_SYSTEM_PROMPT },
        { role: "user", content: `제목: ${title}\n스토리: ${script}` },
      ],
      max_tokens: 2000,
      temperature: 0.9,
    }),
  });

  if (!response.ok) {
    throw new Error(`유튜브 설명 생성 요청이 실패했습니다. (${response.status}) ${await response.text()}`);
  }

  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("AI가 빈 응답을 반환했습니다.");
  return content;
}
