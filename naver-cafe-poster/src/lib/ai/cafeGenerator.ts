import "server-only";
import { ensureParagraphBreaks } from "./formatContent";
import { fetchWithTimeout } from "./fetchWithTimeout";
import type { CafeTone } from "./tone";

// OpenAI 응답이 60초를 넘기면 버튼이 "생성 중..."에 무한정 갇히는 대신 명확한 에러로
// 실패시킨다(fetchWithTimeout.ts 주석 참고).
const OPENAI_TIMEOUT_MS = 60_000;

export type { CafeTone };

// blog(BLOG(원문)생성 자동화)의 AI 글쓰기 폼(app/write/ai-form)이 지원하는 세부 옵션
// (tone/targetAudience/wordCount/keywords/referenceUrls/customInstructions/cta)을
// 그대로 이식했다 — 사용자가 "블로그 글쓰기 메뉴를 적용해달라"고 명시적으로 요청함
// (2026-09-11). blog/utils/news/generator.ts의 toneRule/audienceRule/wordCountRule/
// referenceRule/customRule 패턴과 동일하게, 참고 URL은 실제로 스크랩하지 않고
// AI에게 URL 텍스트 그대로 참고하라고 넘기는 방식(모델이 아는 경우에만 반영)을 그대로 따른다.

export interface GenerateCafePostInput {
  topic: string;
  // "AI 자동 초안생성" 화면(2026-09-13)에서는 글감 수집 등으로 이미 원본 텍스트가 있는
  // 상태에서 "제대로 된 콘텐츠로 다시 만들어달라"는 요청이 있었다 — 그 원본을 참고 자료로
  // 넘기면 AI가 그 내용을 바탕으로 카페 톤에 맞게 다시 작성한다(단순히 그대로 베끼지 않음).
  referenceContent?: string;
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

interface DetailOptions {
  tone?: CafeTone;
  targetAudience?: string;
  wordCount?: number;
  keywords?: string[];
  referenceUrls?: string[];
  customInstructions?: string;
}

/** generate/revise가 공유하는 세부 옵션 → 프롬프트 규칙 변환. */
function buildDetailRuleLines(input: DetailOptions): string {
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

  return [toneRule, audienceRule, wordCountRule, keywordRule, referenceRule, customRule].filter(Boolean).join("\n");
}

/** CTA는 프롬프트가 아니라 생성 후 코드에서 직접 덧붙인다 — 시스템 프롬프트에 예시로 넣으면
 * AI가 실제 CTA 데이터가 없을 때도 placeholder를 지어내는 문제가 있다(docs/PLATFORM_PATTERNS.md
 * §3).
 *
 * 예전엔 "본문에 cta.url 문자열이 이미 포함돼 있으면 중복이니 다시 안 붙인다"는 방식으로
 * 중복을 막았는데, 실계정 테스트(2026-09-13, "성과 측정 자동화" 초안)에서 이게 오히려 버그를
 * 만드는 것을 발견했다: referenceContent(참고자료)에 이전에 만들어졌던 CTA 문구("📢 추천링크
 * buylife.blog")가 들어있으면, AI가 "참고해서 다시 작성해달라"는 지시를 따르면서 그 CTA
 * 문구까지 자기 방식대로 다시 써버린다(예: 문구와 URL을 줄바꿈으로 분리, https:// 프로토콜
 * 누락). 그러면 완성된 본문에 cta.url 문자열이 이미 들어있게 되어 위 조건이 "중복"으로 잘못
 * 판단해 정상 포맷으로 다시 붙이는 걸 건너뛰고, AI가 망가뜨린 형태를 그대로 통과시켰다 —
 * publish-core.ts의 splitCta()가 이 망가진 형태(다른 줄, 프로토콜 없음)를 CTA로 인식하지
 * 못해 네이버 자동 링크 인식이 실패하는 결과로 이어졌다.
 *
 * 그래서 "포함 여부로 중복 판단" 대신, 본문 끝에 있는 CTA로 보이는 블록(📢로 시작하는 부분)을
 * 형식에 상관없이 항상 제거한 뒤 정해진 포맷으로 다시 붙이는 멱등적 방식으로 바꿨다 — AI가
 * 뭘 만들어내든 최종 CTA 포맷은 항상 우리가 보장한다. referenceContent 자체에서도 같은
 * 함수(stripTrailingCta)로 미리 제거해서, AI가 애초에 예전 CTA 문구를 참고하지 않도록 한다. */
const TRAILING_CTA_BLOCK = /\s*📢[\s\S]*$/;

function stripTrailingCta(text: string): string {
  return text.replace(TRAILING_CTA_BLOCK, "").trimEnd();
}

function appendCtaIfNeeded(content: string, cta?: { text: string; url: string }): string {
  const cleaned = stripTrailingCta(content);
  if (!cta?.text || !cta?.url) return cleaned;
  // 문구와 URL 사이에 줄바꿈을 넣지 않는다 — URL이 문구 바로 우측에 이어지도록(2026-09-13
  // 사용자 요청). publish-core.ts의 splitCta()가 같은 형식(공백 하나로 구분)을 기대한다.
  return `${cleaned}\n\n📢 ${cta.text} ${cta.url}`;
}

export async function generateCafePostContent(
  input: GenerateCafePostInput,
  apiKey: string,
): Promise<GenerateCafePostResult> {
  if (!apiKey) {
    throw new Error("OpenAI API 키가 없습니다. 설정에서 본인 키를 등록해주세요.");
  }

  const ruleLines = buildDetailRuleLines(input);
  // referenceContent에 이전 CTA 문구가 남아있으면 AI가 그걸 다시 베껴 쓰다가 포맷을 망가뜨리는
  // 문제가 있어(위 appendCtaIfNeeded 주석 참고), AI에게 넘기기 전에 미리 제거한다.
  const cleanedReferenceContent = input.referenceContent?.trim()
    ? stripTrailingCta(input.referenceContent.trim())
    : "";
  const referenceBlock = cleanedReferenceContent
    ? `\n\n다음은 참고할 원본 자료입니다. 그대로 베끼지 말고, 이 내용을 바탕으로 카페 톤에 맞는 완성도 있는 글로 다시 작성해주세요:\n${cleanedReferenceContent}`
    : "";

  const response = await fetchWithTimeout(
    "https://api.openai.com/v1/chat/completions",
    {
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
            content: `주제: ${input.topic}${ruleLines ? `\n\n다음 세부 옵션을 반영해주세요:\n${ruleLines}` : ""}${referenceBlock}`,
          },
        ],
        max_tokens: 1800,
        temperature: 0.8,
      }),
    },
    OPENAI_TIMEOUT_MS,
    "AI 글 생성 요청이 60초 넘게 응답이 없어 중단했습니다. 잠시 후 다시 시도해주세요.",
  );
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

  const { title, content: parsedContent } = parseTitleContent(rawContent, input.topic.slice(0, 20));
  const content = appendCtaIfNeeded(parsedContent, input.cta);

  return { title, content };
}

function parseTitleContent(rawContent: string, fallbackTitle: string): GenerateCafePostResult {
  const titleMatch = rawContent.match(/^제목:\s*(.+)$/m);
  const title = titleMatch?.[1]?.trim() ?? fallbackTitle;
  const bodyWithoutTitle = titleMatch
    ? rawContent.slice((titleMatch.index ?? 0) + titleMatch[0].length).trim()
    : rawContent;
  return { title, content: ensureParagraphBreaks(bodyWithoutTitle) };
}

export interface ReviseCafePostInput {
  title: string;
  content: string;
  instruction: string;
  // "AI 자동 초안생성" 화면에도 세부 옵션·이미지·CTA 설정을 옮겨오면서(2026-09-13), 주제가
  // 없는 이 화면에서는 "AI에게 수정 요청하기"가 유일한 AI 텍스트 작업이라 여기에 반영한다 —
  // generateCafePostContent()의 세부 옵션과 동일한 필드를 그대로 받는다.
  tone?: CafeTone;
  targetAudience?: string;
  wordCount?: number;
  keywords?: string[];
  referenceUrls?: string[];
  customInstructions?: string;
  cta?: { text: string; url: string };
}

const REVISE_SYSTEM_PROMPT = `너는 네이버 카페 운영 경험이 많은 카페 매니저야. 사용자가 이미 작성된 카페 게시글을
어떻게 고치고 싶은지 지시사항을 줄 거야. 그 지시사항만 반영해서 게시글을 수정해줘 — 지시하지 않은
부분은 원문 스타일과 내용을 최대한 그대로 유지하세요. 정중한 존댓말(-습니다/-해요체)은 항상 유지하고,
1~2문장마다 문단을 끊어 줄바꿈을 두 번 넣는 형식도 그대로 유지하세요.

출력 형식은 반드시 아래와 같이 하세요:
제목: (수정된 제목)
(빈 줄)
(수정된 본문)

추가 해설이나 설명 없이 바로 출력하세요.`;

/** 이미 생성/저장된 초안을 사용자의 자연어 지시에 따라 AI가 다시 고쳐 쓴다. */
export async function reviseCafePostContent(
  input: ReviseCafePostInput,
  apiKey: string,
): Promise<GenerateCafePostResult> {
  if (!apiKey) {
    throw new Error("OpenAI API 키가 없습니다. 설정에서 본인 키를 등록해주세요.");
  }
  if (!input.instruction.trim()) {
    throw new Error("수정 지시사항을 입력해주세요.");
  }

  const ruleLines = buildDetailRuleLines(input);
  // 기존 본문에 이미 붙어있던 CTA 문구는 제거하고 넘긴다 — generateCafePostContent와 동일한
  // 이유(AI가 참고해서 다시 쓰다가 CTA 포맷을 망가뜨리는 문제)로, 어차피 아래 appendCtaIfNeeded가
  // 항상 정해진 포맷으로 다시 붙인다.
  const existingBody = stripTrailingCta(input.content);
  const userContent = [
    `기존 제목: ${input.title}`,
    `기존 본문:\n${existingBody}`,
    `수정 지시사항: ${input.instruction}`,
    ruleLines ? `다음 세부 옵션도 함께 반영해주세요:\n${ruleLines}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await fetchWithTimeout(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: REVISE_SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        max_tokens: 1800,
        temperature: 0.6,
      }),
    },
    OPENAI_TIMEOUT_MS,
    "AI 수정 요청이 60초 넘게 응답이 없어 중단했습니다. 잠시 후 다시 시도해주세요.",
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`AI 수정 요청이 실패했습니다. (${response.status}) ${errorBody}`);
  }

  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const rawContent = data.choices?.[0]?.message?.content?.trim();
  if (!rawContent) {
    throw new Error("AI가 빈 응답을 반환했습니다.");
  }

  const { title, content: parsedContent } = parseTitleContent(rawContent, input.title);
  const content = appendCtaIfNeeded(parsedContent, input.cta);
  return { title, content };
}
