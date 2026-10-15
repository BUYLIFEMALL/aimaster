import "server-only";

// 주제 하나로 네이버 블로그용 제목+본문 초안을 생성한다. blog 서브프로젝트의
// structureBlogCandidates()와 동일하게 SDK 없이 fetch로 OpenAI Chat Completions를
// 직접 호출한다(본인 API 키를 그대로 Authorization 헤더에 실어서, 서버 쪽에 별도
// 클라이언트 설정 없이 바로 사용).
//
// Easy-peasy SNS 참고 사례(README "조사한 참고 사례" 참고)의 셀프 리뷰 2단계 구조를
// 따른다: 1차 호출(초안 작성) -> 2차 호출(그 초안을 다시 AI에게 줘서 오탈자/어색한
// 문장을 다듬어달라고 요청). 두 호출 모두 같은 JSON 형식으로 응답받는다.

const BODY_FORMAT_RULE = `본문은 문단을 줄바꿈(\n) 한 번으로 구분합니다. 문단마다 2~5문장
정도로 쓰고, 전체 본문은 5~8개 문단 정도로 작성합니다. 광고 문구, 해시태그, 이모지는
넣지 않습니다. 반드시 아래 JSON 형식으로만 응답하세요. 다른 설명은 절대 추가하지 마세요.
{"title": "...", "body": "문단1\\n문단2\\n문단3"}`;

const DRAFT_SYSTEM_PROMPT = `당신은 네이버 블로그 글쓰기를 돕는 한국어 작가입니다. 주어진
주제로 실제 사람이 쓴 것처럼 자연스러운 블로그 글의 제목과 본문을 작성합니다.

규칙:
- 제목은 25자 이내, 클릭하고 싶어지는 자연스러운 문구로 작성합니다(과장/낚시성 금지).
- ${BODY_FORMAT_RULE}`;

const REVIEW_SYSTEM_PROMPT = `당신은 한국어 블로그 글을 교정하는 편집자입니다. 아래 초안을
검토해서 오탈자, 어색한 문장, 논리적으로 이상한 부분, 반복되는 표현을 자연스럽게 다듬은
최종본을 만듭니다. 내용의 핵심 주제나 사실관계는 바꾸지 않습니다.

- ${BODY_FORMAT_RULE}`;

export interface BlogDraft {
  title: string;
  body: string;
}

async function callChatCompletion(params: {
  apiKey: string;
  systemPrompt: string;
  userContent: string;
}): Promise<BlogDraft> {
  const { apiKey, systemPrompt, userContent } = params;

  // 등록된 값이 실제 OpenAI 키 형식이 아니면(예: 잘못 붙여넣은 다른 텍스트) fetch가
  // Authorization 헤더 생성 시점에 "Cannot convert argument to a ByteString..."라는
  // 원인을 알기 어려운 에러를 던진다 — 2026-09-22 실사용 검증 중 실제로 발견됨. 헤더에
  // 넣기 전에 먼저 검증해서 원인을 바로 알 수 있는 메시지로 대체한다.
  if (!/^[\x00-\xFF]*$/.test(apiKey)) {
    throw new Error(
      "등록된 OpenAI API 키 형식이 올바르지 않습니다. www.buylife.xyz의 'API 설정' 페이지에서 키를 다시 확인해주세요."
    );
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
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

export async function generateBlogDraft(params: { apiKey: string; topic: string }): Promise<BlogDraft> {
  return callChatCompletion({
    apiKey: params.apiKey,
    systemPrompt: DRAFT_SYSTEM_PROMPT,
    userContent: `주제: ${params.topic}`,
  });
}

export async function reviewBlogDraft(params: { apiKey: string; draft: BlogDraft }): Promise<BlogDraft> {
  return callChatCompletion({
    apiKey: params.apiKey,
    systemPrompt: REVIEW_SYSTEM_PROMPT,
    userContent: JSON.stringify(params.draft),
  });
}

/** 1차 초안 작성 -> 2차 셀프 리뷰를 순서대로 실행해 최종본을 반환한다. */
export async function generateReviewedBlogDraft(params: { apiKey: string; topic: string }): Promise<BlogDraft> {
  const draft = await generateBlogDraft(params);
  return reviewBlogDraft({ apiKey: params.apiKey, draft });
}
