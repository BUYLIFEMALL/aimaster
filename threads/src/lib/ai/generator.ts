import "server-only";

// blog(AutoBlog) AI 글쓰기 폼의 5가지 톤 옵션과 동일하게 맞춘다.
export type ThreadsTone = "전문적" | "친근함" | "설득력있는" | "격식있는" | "위트있는";

export interface GeneratePostInput {
  topic: string;
  tone?: ThreadsTone;
  keywords?: string[];
  referenceUrls?: string[];
}

export interface GeneratePostResult {
  content: string;
}

// 반말 기조는 고정, 톤 옵션은 그 위에서 에너지/분위기만 바꾼다
// (예전 "전문적"/"격식있는" 옵션이 존댓말을 유도해 형식이 깨지던 문제 방지).
const TONE_INSTRUCTIONS: Record<ThreadsTone, string> = {
  전문적: "신뢰감 있고 정보 전달에 집중하되, 딱딱해지지 않게 반말 유지.",
  친근함: "친근하고 편안한 에너지로, 반말 유지.",
  설득력있는: "구매 욕구를 자극하는 설득력 있는 어조로, 반말 유지.",
  격식있는: "차분하고 안정감 있는 분위기로, 존댓말이 아닌 반말을 유지하되 가볍지 않게.",
  위트있는: "위트있고 재치있게, 반말 유지.",
};

// Threads 게시물 전용 카피라이팅 규칙. 제목(훅) + 본문 구조로, 짧고 스캔하기
// 쉬운 형태로 구매욕을 자극하는 게 목적이다 (일반 블로그 장문 포스팅과는 다른 포맷).
const THREADS_SYSTEM_PROMPT = `이 정보를 사용하여 상품을 포착하여 상품 구매욕을 일으킬 수 있는 짧고 매력적인 Threads 게시물을 만드십시오. 다음 조건을 반드시 지키세요.

1. 제목은 10자 이내로 작성해 주세요
2. 전체 게시글(제목+본문)은 공백 포함 500자를 절대 넘기지 마세요
3. 제목 앞에 어울리는 이모티콘을 붙여주고 작성해 주세요
4. 게시글을 시각적으로 더 매력적으로 만들기 위해 이모티콘 하나나 둘을 추가하는 것을 고려하세요. 하지만 과하지 마세요
5. 문단을 나누어 간결하게 작성해서 읽기 쉽게 핵심 정보만 포함해 주세요
6. 무조건 반말로만 작성하세요. 존댓말(-습니다/-해요/-세요 등)은 절대 쓰지 마세요
7. 주어진 키워드가 있다면 자연스럽게 본문에 녹여 넣으세요 (해시태그 나열 금지)
8. 참고 웹페이지 링크가 주어지면 그 내용을 참고해서 사실 관계나 포인트를 반영하되, 본문에 URL 자체를 그대로 나열하지 마세요

톤은 트렌디하고, 열정적이며, 유익해야 합니다.
팔로워와 흥미로운 팁이나 통찰력을 공유한다고 상상해보세요.

게시글을 만든 후에는 추가 해설이나 설명 없이 바로 출력하면 됩니다.`;

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

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: THREADS_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `상품/주제 정보: ${input.topic}\n(참고 톤: ${toneInstruction})${keywordLine}${referenceLine}`,
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

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("AI가 빈 응답을 반환했습니다.");
  }

  // 모델이 지시를 넘겨서 500자를 초과하는 경우를 대비한 안전장치
  return { content: content.length > 500 ? content.slice(0, 500).trim() : content };
}

export interface GeneratePostImageInput {
  prompt: string;
  model?: NanoBananaModelType;
}

export interface GeneratePostImageResult {
  base64: string;
  mimeType: string;
}

// 나노바나나(NanoBanana)/제미나이(Gemini) 공식 REST 엔드포인트 및 스키마 설정.
// blog 자동화 프로그램(blog/utils/news/nanoBananaConfig.ts)과 동일한 4종 모델을 그대로 참고한다.
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
    modelName: "gemini-3-pro-image",
    endpoint: "https://generativelanguage.googleapis.com/v1/models/gemini-3-pro-image:generateContent",
    imageSize: "4K",
    temperature: 0.7,
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

export async function generatePostImage(
  input: GeneratePostImageInput,
  apiKey: string,
): Promise<GeneratePostImageResult> {
  if (!apiKey) {
    throw new Error("Gemini API 키가 없습니다. 설정에서 본인 키를 등록하거나 관리자에게 문의해주세요.");
  }

  const modelConfig = getNanoBananaConfig(input.model ?? DEFAULT_IMAGE_MODEL);
  const targetUrl = `${modelConfig.endpoint}?key=${apiKey}`;

  const requestBody = {
    contents: [{ parts: [{ text: input.prompt }] }],
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
