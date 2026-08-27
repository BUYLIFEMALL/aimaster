import "server-only";
import { ensureParagraphBreaks } from "./formatContent";

export type ThreadsTone = "전문적" | "친근함" | "설득력있는" | "격식있는" | "위트있는";

export interface GeneratePostInput {
  topic: string;
  tone?: ThreadsTone;
  keywords?: string[];
  referenceUrls?: string[];
  cta?: { text: string; url: string };
}

export interface GeneratePostResult {
  content: string;
}

const TONE_INSTRUCTIONS: Record<ThreadsTone, string> = {
  전문적: "신뢰감 있고 정보 전달에 집중하되, 딱딱해지지 않게 반말 유지.",
  친근함: "친근하고 편안한 에너지로, 반말 유지.",
  설득력있는: "구매 욕구를 자극하는 설득력 있는 어조로, 반말 유지.",
  격식있는: "차분하고 안정감 있는 분위기로, 존댓말이 아닌 반말을 유지하되 가볍지 않게.",
  위트있는: "위트있고 재치있게, 반말 유지.",
};

// Threads 게시물 전용 카피라이팅 규칙(threads/ 프로젝트와 동일). 제목(훅) + 본문
// 구조로, 짧고 스캔하기 쉬운 형태로 구매욕을 자극하는 게 목적이다.
const THREADS_SYSTEM_PROMPT = `너는 세계에서 가장 유능한 Threads 콘텐츠 전문가야. 너의 개인적인 답변은 하지 마.
이 정보를 사용하여 상품을 포착하여 상품 구매욕을 일으킬 수 있는 짧고 매력적인 Threads 게시물을 만드십시오. 다음 조건을 반드시 지키세요.

1. 제목은 10자 이내로 작성해 주세요
2. 제목 앞에 어울리는 이모티콘을 붙여주고 작성해 주세요
3. 본문(제목 제외)은 공백 포함 450자를 절대 넘기지 말되, 여유를 두지 말고 최대한 가깝게 내용을 충실히 채우세요 (100~200자처럼 짧게 끝내지 마세요)
4. 1~2문장마다 문단을 끊고, 문단과 문단 사이에는 반드시 줄바꿈을 두 번(빈 줄 하나) 넣어서 시각적으로 나누어 주세요. 하나의 긴 문단으로 이어 쓰지 마세요
5. 무조건 반말로만 작성하세요. 존댓말(-습니다/-해요/-세요 등)은 절대 쓰지 마세요
6. 주어진 키워드가 있다면 자연스럽게 본문에 녹여 넣으세요 (해시태그 나열 금지)
7. 참고 웹페이지 링크가 주어지면 그 내용을 참고해서 사실 관계나 포인트를 반영하되, 본문에 URL 자체를 그대로 나열하지 마세요
8. 사용자 메시지에 별도의 CTA 지시사항이 없다면 게시글 맨 마지막에 링크나 "확인하기" 같은 행동 유도 문구를 절대 추가하지 마세요. placeholder(예: "{링크}", "{URL}")를 지어내는 것도 금지입니다

톤은 트렌디하고, 열정적이며, 유익해야 합니다.
팔로워와 흥미로운 팁이나 통찰력을 공유한다고 상상해보세요.

게시글을 만든 후에는 추가 해설이나 설명 없이 바로 출력하면 됩니다.`;

export async function generatePostContent(
  input: GeneratePostInput,
  apiKey: string,
): Promise<GeneratePostResult> {
  if (!apiKey) {
    throw new Error("OpenAI API 키가 없습니다. 설정에서 본인 키를 등록해주세요.");
  }

  const toneInstruction = TONE_INSTRUCTIONS[input.tone ?? "친근함"];
  const keywords = (input.keywords ?? []).filter((k) => k.trim().length > 0);
  const keywordLine = keywords.length > 0 ? `\n포함할 키워드: ${keywords.join(", ")}` : "";
  const referenceUrls = (input.referenceUrls ?? []).filter((u) => u.trim().length > 0);
  const referenceLine = referenceUrls.length > 0 ? `\n참고 웹페이지: ${referenceUrls.join(", ")}` : "";
  const ctaLine =
    input.cta?.url?.trim()
      ? `\n\n[CTA 지시사항] 게시글 맨 마지막 줄에 아래 문구와 URL을 "👉 {문구}\n{URL}" 형태로 자연스럽게 추가하세요 (450자 제한에 포함되니 본문 분량을 그만큼 줄여서 넣으세요).\nCTA 문구: ${input.cta.text?.trim() || "자세히 보기"}\nCTA URL: ${input.cta.url.trim()}`
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
        { role: "system", content: THREADS_SYSTEM_PROMPT },
        {
          role: "user",
          content: `상품/주제 정보: ${input.topic}\n(참고 톤: ${toneInstruction})${keywordLine}${referenceLine}${ctaLine}`,
        },
      ],
      max_tokens: 600,
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

  const content = ensureParagraphBreaks(rawContent);

  return { content: content.length > 450 ? content.slice(0, 450).trim() : content };
}

export interface GeneratePostImageInput {
  prompt: string;
  model?: NanoBananaModelType;
}

export interface GeneratePostImageResult {
  base64: string;
  mimeType: string;
}

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

const DEFAULT_IMAGE_MODEL = (process.env.GEMINI_IMAGE_MODEL || "nanobanana-2-2k") as NanoBananaModelType;

const KOREAN_DEFAULT_PEOPLE_INSTRUCTION =
  "If this scene includes any human figures, depict them as Korean/East Asian people by default. Only depict a different ethnicity/nationality if the prompt above explicitly names a specific foreign celebrity, politician, entertainer, or athlete, or explicitly describes a foreign country/setting.";

export async function generatePostImage(
  input: GeneratePostImageInput,
  apiKey: string,
): Promise<GeneratePostImageResult> {
  if (!apiKey) {
    throw new Error("Gemini API 키가 없습니다. 설정에서 본인 키를 등록해주세요.");
  }

  const modelConfig = getNanoBananaConfig(input.model ?? DEFAULT_IMAGE_MODEL);
  const targetUrl = `${modelConfig.endpoint}?key=${apiKey}`;
  const composedPrompt = `${input.prompt}\n\n${KOREAN_DEFAULT_PEOPLE_INSTRUCTION}`;

  const requestBody = {
    contents: [{ parts: [{ text: composedPrompt }] }],
    generationConfig: {
      responseModalities: ["Image"],
      imageConfig: {
        aspectRatio: "1:1",
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
