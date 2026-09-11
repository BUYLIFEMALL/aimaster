import "server-only";

// blog(BLOG(원문)생성 자동화)의 나노바나나(Gemini) 이미지 생성 기능을 그대로 이식했다
// (threads-affiliate-poster/src/lib/ai/generator.ts의 generatePostImage와 동일 구조).
// 카페 게시글에 대표 이미지를 붙이고 싶을 때 쓴다 — 단, 네이버 카페 글쓰기 오픈API가
// 실제로 이미지를 렌더링해주는지는 아직 미확인이라(Naver Cafe API 문서 확인 불가 상태),
// 생성된 이미지는 일단 게시글 본문 맨 위에 이미지 URL 한 줄로 덧붙이는 방식으로 넣는다
// (src/lib/posts/publish-core.ts 참고) — 실계정으로 첫 배포 테스트 후 실제로 이미지로
// 보이는지 확인해서 필요하면 보강할 것.

export interface GeneratePostImageInput {
  prompt: string;
  model?: NanoBananaModelType;
  endpoint?: string;
}

export interface GeneratePostImageResult {
  base64: string;
  mimeType: string;
}

export type NanoBananaModelType = "nanobanana" | "nanobanana-2-2k" | "nanobanana-2-4k" | "nanobanana-pro";

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
  return NANO_BANANA_MODEL_CONFIGS[modelType as NanoBananaModelType] ?? NANO_BANANA_MODEL_CONFIGS["nanobanana-2-2k"];
}

const KOREAN_DEFAULT_PEOPLE_INSTRUCTION =
  "If this scene includes any human figures, depict them as Korean/East Asian people by default. Only depict a different ethnicity/nationality if the prompt above explicitly names a specific foreign celebrity, politician, entertainer, or athlete, or explicitly describes a foreign country/setting.";

export async function generatePostImage(input: GeneratePostImageInput, apiKey: string): Promise<GeneratePostImageResult> {
  if (!apiKey) {
    throw new Error("Gemini API 키가 없습니다. 설정에서 본인 키를 등록해주세요.");
  }

  const modelConfig = getNanoBananaConfig(input.model ?? "nanobanana-2-2k");
  const baseEndpoint = input.endpoint?.trim() || modelConfig.endpoint;
  const targetUrl = `${baseEndpoint}?key=${apiKey}`;
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

  const imagePart = data.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data);
  const base64 = imagePart?.inlineData?.data?.replace(/\s+/g, "");
  const mimeType = imagePart?.inlineData?.mimeType ?? "image/png";

  if (!base64) {
    throw new Error(`나노바나나(${modelConfig.modelName})가 이미지를 반환하지 않았습니다.`);
  }

  return { base64, mimeType };
}
