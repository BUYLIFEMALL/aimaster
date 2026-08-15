import "server-only";
import { ensureParagraphBreaks } from "./formatContent";

// blog(AutoBlog)/threads AI 글쓰기 폼과 동일한 5가지 톤 옵션
export type InstaTone = "전문적" | "친근함" | "설득력있는" | "격식있는" | "위트있는";

export interface GeneratePostInput {
  topic: string;
  tone?: InstaTone;
  keywords?: string[];
  referenceUrls?: string[];
  cta?: { text: string; url: string };
  // 카드뉴스용으로 이미 생성된 장문 본문(generateCardNewsContent 결과물)이 있으면
  // 그 내용을 근거로 짧은 인스타 캡션을 "재가공"한다 (Make 카드뉴스 시나리오의
  // "문장교정(인스타)" 모듈과 동일한 역할). 없으면 기존처럼 topic만으로 생성한다.
  sourceContent?: string;
}

export interface GeneratePostResult {
  caption: string;
  hashtags: string[];
}

// 반말 기조는 고정, 톤 옵션은 그 위에서 에너지/분위기만 바꾼다.
const TONE_INSTRUCTIONS: Record<InstaTone, string> = {
  전문적: "신뢰감 있고 정보 전달에 집중하되, 딱딱해지지 않게 반말 유지.",
  친근함: "친근하고 편안한 에너지로, 반말 유지.",
  설득력있는: "구매 욕구를 자극하는 설득력 있는 어조로, 반말 유지.",
  격식있는: "차분하고 안정감 있는 분위기로, 존댓말이 아닌 반말을 유지하되 가볍지 않게.",
  위트있는: "위트있고 재치있게, 반말 유지.",
};

// 인스타그램 피드 전용 캡션 카피라이팅 규칙. threads(THREADS_SYSTEM_PROMPT)와
// 동일한 검증된 규격(docs/PLATFORM_PATTERNS.md §3)을 쓰되, 캡션 하단에 붙는
// 해시태그를 별도 JSON 필드로 분리해서 요청한다.
const INSTAGRAM_SYSTEM_PROMPT = `너는 세계에서 가장 유능한 인스타그램 콘텐츠 전문가야. 너의 개인적인 답변은 하지 마.
이 정보를 사용하여 상품을 포착하여 상품 구매욕을 일으킬 수 있는 짧고 매력적인 인스타그램 피드 캡션을 만드십시오. 다음 조건을 반드시 지키세요.

1. 캡션(제목 제외)은 공백 포함 450자를 절대 넘기지 마세요
2. 1~2문장마다 문단을 끊고, 문단과 문단 사이에는 반드시 줄바꿈을 두 번(빈 줄 하나) 넣어서 시각적으로 나누어 주세요. 하나의 긴 문단으로 이어 쓰지 마세요. 간결하게 핵심 정보만 포함하고, 불필요한 설명은 하지 마세요
3. 무조건 반말로만 작성하세요. 존댓말(-습니다/-해요/-세요 등)은 절대 쓰지 마세요
4. 주어진 키워드가 있다면 자연스럽게 캡션 본문에 녹여 넣으세요
5. 캡션 본문에는 해시태그를 절대 나열하지 마세요 (해시태그는 별도 JSON 필드 hashtags에만 담습니다)
6. hashtags 필드에는 캡션 내용과 관련된 인스타그램 해시태그를 5~10개, "#" 기호 없이 단어/구문만 배열로 담으세요
7. 참고 웹페이지 링크가 주어지면 그 내용을 참고해서 사실 관계나 포인트를 반영하되, 캡션에 URL 자체를 그대로 나열하지 마세요
8. 사용자 메시지에 별도의 CTA 지시사항이 없다면 캡션 맨 마지막에 링크나 "확인하기" 같은 행동 유도 문구를 절대 추가하지 마세요. placeholder(예: "{링크}", "{URL}")를 지어내는 것도 금지입니다

톤은 트렌디하고, 열정적이며, 유익해야 합니다.
팔로워와 흥미로운 팁이나 통찰력을 공유한다고 상상해보세요.

반드시 아래 JSON 형식으로만 응답하세요. 다른 설명은 절대 추가하지 마세요.
{"caption": "위 규칙을 지킨 캡션", "hashtags": ["해시태그1", "해시태그2"]}`;

export async function generatePostContent(
  input: GeneratePostInput,
  apiKey: string,
): Promise<GeneratePostResult> {
  if (!apiKey) {
    throw new Error("OpenAI API 키가 없습니다. 설정에서 본인 키를 등록하거나 관리자에게 문의해주세요.");
  }

  const toneInstruction = TONE_INSTRUCTIONS[input.tone ?? "친근함"];
  const keywords = (input.keywords ?? []).filter((k) => k.trim().length > 0);
  const keywordLine = keywords.length > 0 ? `\n포함할 키워드: ${keywords.join(", ")}` : "";
  const referenceUrls = (input.referenceUrls ?? []).filter((u) => u.trim().length > 0);
  const referenceLine = referenceUrls.length > 0 ? `\n참고 웹페이지: ${referenceUrls.join(", ")}` : "";
  const ctaLine =
    input.cta?.url?.trim()
      ? `\n\n[CTA 지시사항] 캡션 맨 마지막 줄에 아래 문구와 URL을 "👉 {문구}\n{URL}" 형태로 자연스럽게 추가하세요 (450자 제한에 포함되니 본문 분량을 그만큼 줄여서 넣으세요).\nCTA 문구: ${input.cta.text?.trim() || "자세히 보기"}\nCTA URL: ${input.cta.url.trim()}`
      : "";
  const sourceContentLine = input.sourceContent?.trim()
    ? `\n\n[원본 콘텐츠 - 이 내용을 요약/재가공해서 캡션을 작성하세요, 새로운 사실을 지어내지 마세요]\n${input.sourceContent.trim()}`
    : "";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: INSTAGRAM_SYSTEM_PROMPT },
        {
          role: "user",
          content: `상품/주제 정보: ${input.topic}\n(참고 톤: ${toneInstruction})${keywordLine}${referenceLine}${ctaLine}${sourceContentLine}`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 700,
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

  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) {
    throw new Error("AI가 빈 응답을 반환했습니다.");
  }

  let parsed: { caption?: string; hashtags?: string[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI 응답을 JSON으로 해석하지 못했습니다.");
  }
  if (!parsed.caption) {
    throw new Error("AI가 캡션을 반환하지 않았습니다.");
  }

  // 모델이 지시(1~2문장마다 줄바꿈)를 안 지키고 한 줄로 붙여 쓴 경우를 보정한다.
  const caption = ensureParagraphBreaks(parsed.caption);

  // 모델이 지시를 넘겨서 450자를 초과하는 경우를 대비한 안전장치
  return {
    caption: caption.length > 450 ? caption.slice(0, 450).trim() : caption,
    hashtags: parsed.hashtags ?? [],
  };
}

// ─────────────────────────────────────────────────────────────
// 카드뉴스(캐러셀) 전용 — Make 시나리오(63🎯Threads+INSTA CardNews)의
// "블로그 제목+본문+해시태그" 모듈과 동일한 역할. 이 장문 본문이
// generateVisualPrompts()의 문단 소스이자 generatePostContent()의
// sourceContent로 재사용된다 (insta_auto_poster/README.md 참고).
export interface GenerateCardNewsContentResult {
  title: string;
  content: string;
  hashtags: string[];
}

const CARD_NEWS_CONTENT_SYSTEM_PROMPT = `당신은 인스타그램 카드뉴스 원고를 전문적으로 작성하는 콘텐츠 크리에이터입니다.
주어진 주제로 카드뉴스(여러 장의 이미지 슬라이드)의 소스가 될 장문 원고를 작성하세요. 실제로 존재하는
사실만 사용하고 지어내지 마세요.

출력은 반드시 아래 3개 키를 가진 JSON 객체로만 하세요.
- "title": 인스타그램에 적합한 매력적인 제목 (이모티콘 포함, 15자 이내)
- "content": 9~10개 문단으로 나눈 2000~2800자 분량의 본문. 각 문단은 2~4문장, 문단 맨 앞에 어울리는
  이모티콘 1개, 문단 사이는 반드시 줄바꿈 두 번(\\n\\n)으로 구분. 잡지 기사처럼 깔끔하고 편집적인
  문체. 무조건 반말로 작성하고 존댓말은 쓰지 마세요.
- "hashtags": 가시성을 높일 관련 해시태그 8~10개 배열 ("#" 기호 없이 단어만)

다른 설명 없이 JSON만 출력하세요.`;

export async function generateCardNewsContent(
  input: { topic: string; keywords?: string[]; referenceUrls?: string[] },
  apiKey: string,
): Promise<GenerateCardNewsContentResult> {
  if (!apiKey) {
    throw new Error("OpenAI API 키가 없습니다. 설정에서 본인 키를 등록하거나 관리자에게 문의해주세요.");
  }

  const keywords = (input.keywords ?? []).filter((k) => k.trim().length > 0);
  const keywordLine = keywords.length > 0 ? `\n포함할 키워드: ${keywords.join(", ")}` : "";
  const referenceUrls = (input.referenceUrls ?? []).filter((u) => u.trim().length > 0);
  const referenceLine = referenceUrls.length > 0 ? `\n참고 웹페이지: ${referenceUrls.join(", ")}` : "";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: CARD_NEWS_CONTENT_SYSTEM_PROMPT },
        { role: "user", content: `주제: ${input.topic}${keywordLine}${referenceLine}` },
      ],
      response_format: { type: "json_object" },
      max_tokens: 3000,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`카드뉴스 원고 생성 요청이 실패했습니다. (${response.status}) ${errorBody}`);
  }

  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) {
    throw new Error("AI가 빈 응답을 반환했습니다.");
  }

  let parsed: { title?: string; content?: string; hashtags?: string[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI 응답을 JSON으로 해석하지 못했습니다.");
  }
  if (!parsed.title || !parsed.content) {
    throw new Error("AI가 카드뉴스 원고를 반환하지 않았습니다.");
  }

  return {
    title: parsed.title,
    content: ensureParagraphBreaks(parsed.content),
    hashtags: parsed.hashtags ?? [],
  };
}

// ─────────────────────────────────────────────────────────────
// 카드뉴스 전용 캡션 생성 — Make 카드뉴스 시나리오의 "문장교정(인스타)" 모듈(claude-haiku-4-5)
// 프롬프트를 그대로 이식했다. generatePostContent()(피드용 450자 짧은 캡션)와는 목적이 달라서
// 별도 함수로 뒀다: 카드뉴스는 여러 장 이미지와 함께 게시되는 만큼 900~1400자, 6~7문단짜리
// 매거진풍 긴 캡션이 실제로 저장/도달에 더 효과적이라는 게 검증된(운영 중이던) 프롬프트다.
export interface GenerateCardNewsCaptionResult {
  caption: string;
  hashtags: string[];
}

const CARD_NEWS_CAPTION_SYSTEM_PROMPT = `당신은 인스타그램 콘텐츠 기획 및 카피라이팅 전문가입니다.

주어진 블로그 원문 내용을 기반으로
인스타그램 카드 뉴스용 캡션 콘텐츠와
해당 콘텐츠에 최적화된 해시태그를 생성하세요.

콘텐츠는 광고 느낌 없이 정보성과 공감 중심으로 작성합니다.

────────────────────
[스크립트 카드 뉴스 작성 지침]

주어진 콘텐츠와 주제에 맞는 인스타그램 캡션을 작성하세요.

전체 글 길이는 반드시
900자 이상 1400자 이하로 작성하세요.

총 6~7개의 문단으로 나누어 작성하세요.

각 문단은 2~3문장 정도로 작성하세요.

문단 사이에는 줄바꿈을 두 번(빈 줄 하나) 넣어 가독성을 높이세요.

글쓰기 스타일은
잡지 기사 또는 전문 블로그 글처럼
깔끔하고 편집적인 톤으로 작성하세요.

독자가 끝까지 읽고 저장하고 싶어지는
정보 중심 콘텐츠로 작성하세요.

각 문단의 맨 앞에는
문단 분위기에 어울리는 이모지 1개를 반드시 사용하세요.

전체 문장은 한국어로만 작성하세요.

**, #, 목록기호, 마크다운, 굵은글씨 등
어떠한 서식도 사용하지 마세요.

일반 텍스트 문장 형태로만 작성하세요.

────────────────────
[해시태그 생성 지침]

본문 내용을 참고하여
인스타그램에 적합한 해시태그를 생성하세요.

조건

총 8~10개 생성

대형 해시태그
중형 해시태그
소형 해시태그를 균형 있게 구성

광고성 태그 제외

모두 한국어 해시태그 사용

────────────────────
[출력 형식]

반드시 아래 JSON 형식으로만 응답하세요. 다른 설명은 절대 추가하지 마세요.
{"caption": "위 지침을 지킨 캡션 전체 (900~1400자, 6~7문단)", "hashtags": ["해시태그1", "해시태그2", "..."]}`;

export async function generateCardNewsCaption(
  input: { title: string; content: string },
  apiKey: string,
): Promise<GenerateCardNewsCaptionResult> {
  if (!apiKey) {
    throw new Error("OpenAI API 키가 없습니다. 설정에서 본인 키를 등록하거나 관리자에게 문의해주세요.");
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
        { role: "system", content: CARD_NEWS_CAPTION_SYSTEM_PROMPT },
        {
          role: "user",
          content: `[입력 콘텐츠 정보]\n\n주제: ${input.title}\n\n블로그 원문:\n${input.content}`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 3000,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`카드뉴스 캡션 생성 요청이 실패했습니다. (${response.status}) ${errorBody}`);
  }

  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) {
    throw new Error("AI가 빈 응답을 반환했습니다.");
  }

  let parsed: { caption?: string; hashtags?: string[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI 응답을 JSON으로 해석하지 못했습니다.");
  }
  if (!parsed.caption) {
    throw new Error("AI가 캡션을 반환하지 않았습니다.");
  }

  return {
    caption: ensureParagraphBreaks(parsed.caption),
    hashtags: parsed.hashtags ?? [],
  };
}

// ─────────────────────────────────────────────────────────────
// 문단 분석형 이미지 프롬프트 엔지니어 — blog/utils/news/imageGenerator.ts의
// generateArticleBasedImagePrompts()와 Make 카드뉴스 시나리오의 "이미지
// 생성프롬프트(x4)" 모듈을 슬라이드 개수 가변형으로 일반화한 함수.
// 주어진 텍스트를 slideCount개 문단으로 나눠 문단마다 카메라/조명/네거티브
// 블록까지 포함한 포토리얼리스틱 영어 프롬프트를 1개씩 만든다. 이미지 자체에는
// 텍스트를 굽지 않는다 (Make 시나리오와 동일 — 텍스트는 캡션에만 존재).
export interface VisualPromptSlide {
  sourceParagraph: string;
  imagePrompt: string;
}

const VISUAL_PROMPT_ENGINEER_SYSTEM_PROMPT = `당신은 세계 최고의 포토리얼리즘 이미지 프롬프트 엔지니어입니다.
주어진 한국어 텍스트를 문단 단위로 분석해서, 문단마다 실제 카메라로 촬영한 듯한 초고해상도
포토리얼리스틱 이미지를 생성하도록 유도하는 영어 프롬프트를 1개씩 작성하세요.

각 프롬프트는 반드시 다음 규칙을 지키세요:
1. "Create an ultra-realistic, high-resolution cinematic photograph that captures"로 시작하는
   하나의 연속된 영어 문장으로 작성하세요.
2. 한 문단당 하나의 통일된 장면만 묘사하세요 (콜라주/분할화면/스토리보드/여러 패널 금지).
3. 실제 사진처럼 묘사하세요 (일러스트/페인팅/3D렌더/애니메이션 스타일 금지). 인물이 등장하면 기본적으로
   한국인/동아시아인으로 묘사하세요. 문단에 해외의 특정 유명인·정치인·연예인·스포츠인이 명시되어 있거나
   해외 상황/장소가 이야기의 핵심인 경우에만 그 맥락에 맞게 묘사하세요. 자연스러운 피부 질감과
   해부학적으로 올바른 손 묘사를 포함하세요.
4. 카메라 기종(Sony A7R IV / Canon EOS R5 / Nikon Z8 중 택1), 렌즈(35mm/50mm/85mm 중 택1),
   조리개(f/1.8~f/4), 셔터스피드(1/160~1/1000), ISO(100~800), 화이트밸런스(5200K~6500K)를
   구체적으로 포함하세요.
5. 다음 포토리얼리즘 강화 문구를 프롬프트 끝부분에 자연스럽게 포함하세요: "photorealistic,
   documentary-quality real-world photography, physically plausible lighting and materials,
   true-to-life colors, natural film grain, realistic texture microdetail, optical bokeh,
   subtle chromatic aberration"
6. 프롬프트 맨 끝에는 반드시 다음 네거티브 블록을 그대로 덧붙이세요: ", no illustration, no
   painting, no watercolor, no sketch, no vector art, no cartoon, no anime, no 3D render, no
   CGI, no flat shading, no toon style, no collage, no split screen, no storyboard, no multiple
   panels, no watermark, no logo, no text overlay"
7. 프롬프트 문자열 안에 줄바꿈을 넣지 마세요.

출력은 반드시 아래 형식의 JSON만 출력하세요. 다른 설명은 절대 추가하지 마세요.
{"slides": [{"sourceParagraph": "원본 문단 텍스트", "imagePrompt": "위 규칙을 지킨 영어 프롬프트"}, ...]}`;

export async function generateVisualPrompts(
  text: string,
  slideCount: number,
  apiKey: string,
): Promise<VisualPromptSlide[]> {
  if (!apiKey) {
    throw new Error("OpenAI API 키가 없습니다. 설정에서 본인 키를 등록하거나 관리자에게 문의해주세요.");
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
        { role: "system", content: VISUAL_PROMPT_ENGINEER_SYSTEM_PROMPT },
        {
          role: "user",
          content: `아래 텍스트를 정확히 ${slideCount}개 문단으로 나눠, 문단마다 이미지 프롬프트를 1개씩 만들어주세요. 텍스트에 문단 구분이 이미 있다면 그 구분을 최대한 활용하고, 부족하면 의미 단위로 나눠주세요.\n\n${text}`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 3000,
      temperature: 0.6,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`이미지 프롬프트 생성 요청이 실패했습니다. (${response.status}) ${errorBody}`);
  }

  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) {
    throw new Error("AI가 빈 응답을 반환했습니다.");
  }

  let parsed: { slides?: VisualPromptSlide[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI 응답을 JSON으로 해석하지 못했습니다.");
  }

  const slides = (parsed.slides ?? []).filter((s) => s?.imagePrompt);
  if (slides.length === 0) {
    throw new Error("생성된 이미지 프롬프트가 없습니다.");
  }
  return slides.slice(0, slideCount);
}

// 인스타그램은 세로형(9:16, 릴스/스토리와 동일 비율) 노출이 알고리즘상 유리해 기본값으로 쓰고,
// 정사각(1:1)·가로(16:9)도 선택할 수 있게 한다. Gemini 이미지 생성 API가 이 3개 값을
// generationConfig.imageConfig.aspectRatio로 그대로 받아준다.
export type ImageAspectRatio = "9:16" | "1:1" | "16:9";

export interface GeneratePostImageInput {
  prompt: string;
  model?: NanoBananaModelType;
  aspectRatio?: ImageAspectRatio;
}

export interface GeneratePostImageResult {
  base64: string;
  mimeType: string;
}

// 나노바나나(NanoBanana)/제미나이(Gemini) 공식 REST 엔드포인트 및 스키마 설정.
// threads/src/lib/ai/generator.ts, blog(AutoBlog)와 동일한 4종 모델을 그대로 참고한다.
export type NanoBananaModelType =
  | "nanobanana"
  | "nanobanana-2-2k"
  | "nanobanana-2-4k"
  | "nanobanana-pro";

interface NanoBananaModelConfig {
  modelName: string;
  endpoint: string;
  imageSize: "1K" | "2K" | "4K";
  temperature: number;
}

const NANO_BANANA_MODEL_CONFIGS: Record<NanoBananaModelType, NanoBananaModelConfig> = {
  nanobanana: {
    modelName: "gemini-2.5-flash-image",
    endpoint: "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-image:generateContent",
    imageSize: "1K",
    temperature: 0.7,
  },
  "nanobanana-2-2k": {
    modelName: "gemini-3.1-flash-image",
    endpoint: "https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-image:generateContent",
    imageSize: "2K",
    temperature: 0.7,
  },
  "nanobanana-2-4k": {
    modelName: "gemini-3.1-flash-image",
    endpoint: "https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-image:generateContent",
    imageSize: "4K",
    temperature: 0.7,
  },
  "nanobanana-pro": {
    modelName: "gemini-3.1-flash-image",
    endpoint: "https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-image:generateContent",
    imageSize: "4K",
    temperature: 0.4,
  },
};

function getNanoBananaConfig(modelType?: string): NanoBananaModelConfig {
  return (
    NANO_BANANA_MODEL_CONFIGS[modelType as NanoBananaModelType] ??
    NANO_BANANA_MODEL_CONFIGS["nanobanana-2-2k"]
  );
}

// 기본 모델은 .env.local의 GEMINI_IMAGE_MODEL로 코드 수정 없이 교체 가능
const DEFAULT_IMAGE_MODEL = (process.env.GEMINI_IMAGE_MODEL || "nanobanana-2-2k") as NanoBananaModelType;

// 사용자가 직접 입력/수정한 프롬프트(generateVisualPrompts를 거치지 않은 경우 포함)에도
// 인물 묘사 기본값을 강제 적용하기 위해, 실제 API 호출 직전에 이 지시문을 덧붙인다.
const KOREAN_DEFAULT_PEOPLE_INSTRUCTION =
  "If this scene includes any human figures, depict them as Korean/East Asian people by default. Only depict a different ethnicity/nationality if the prompt above explicitly names a specific foreign celebrity, politician, entertainer, or athlete, or explicitly describes a foreign country/setting.";

export async function generatePostImage(
  input: GeneratePostImageInput,
  apiKey: string,
): Promise<GeneratePostImageResult> {
  if (!apiKey) {
    throw new Error("Gemini API 키가 없습니다. 설정에서 본인 키를 등록하거나 관리자에게 문의해주세요.");
  }

  const modelConfig = getNanoBananaConfig(input.model ?? DEFAULT_IMAGE_MODEL);
  const targetUrl = `${modelConfig.endpoint}?key=${apiKey}`;
  const composedPrompt = `${input.prompt}\n\n${KOREAN_DEFAULT_PEOPLE_INSTRUCTION}`;

  const requestBody = {
    contents: [{ parts: [{ text: composedPrompt }] }],
    generationConfig: {
      responseModalities: ["Image"],
      imageConfig: {
        aspectRatio: input.aspectRatio ?? "9:16",
        imageSize: modelConfig.imageSize,
      },
      temperature: modelConfig.temperature,
    },
  };

  const response = await fetch(targetUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`이미지 생성 요청이 실패했습니다. (${response.status}) ${errorBody}`);
  }

  const data = (await response.json()) as {
    candidates?: {
      content?: {
        parts?: { inlineData?: { mimeType?: string; data?: string } }[];
      };
    }[];
  };

  const imagePart = data.candidates?.[0]?.content?.parts?.find(
    (part) => part.inlineData?.data,
  );
  const base64 = imagePart?.inlineData?.data?.replace(/\s+/g, "");
  const mimeType = imagePart?.inlineData?.mimeType ?? "image/png";

  if (!base64) {
    throw new Error(`나노바나나(${modelConfig.modelName})가 이미지를 반환하지 않았습니다.`);
  }

  return { base64, mimeType };
}
