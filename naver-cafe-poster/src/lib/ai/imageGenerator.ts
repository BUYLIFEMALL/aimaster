import "server-only";

// blog(BLOG(원문)생성 자동화)의 나노바나나(Gemini) 이미지 생성 기능을 그대로 이식했다
// (threads-affiliate-poster/src/lib/ai/generator.ts의 generatePostImage와 동일 구조).
// 카페 게시글에 대표 이미지를 붙이고 싶을 때 쓴다 — 단, 네이버 카페 글쓰기 오픈API가
// 실제로 이미지를 렌더링해주는지는 아직 미확인이라(Naver Cafe API 문서 확인 불가 상태),
// 생성된 이미지는 일단 게시글 본문 맨 위에 이미지 URL 한 줄로 덧붙이는 방식으로 넣는다
// (src/lib/posts/publish-core.ts 참고) — 실계정으로 첫 배포 테스트 후 실제로 이미지로
// 보이는지 확인해서 필요하면 보강할 것.

/**
 * blog(BLOG(원문)생성 자동화)의 generateArticleBasedImagePrompts()를 참고해서, 카페 게시글은
 * 이미지 1장만 필요하므로 "제목+본문 전체를 분석해 대표 이미지 1장을 묘사하는 영문 프롬프트
 * 1개"만 만드는 단순화 버전으로 이식했다(2026-09-12). 이렇게 만든 프롬프트를
 * generatePostImage()에 그대로 넘기면, 제목만 가지고 이미지를 만들 때보다 실제 본문 내용을
 * 훨씬 잘 반영한 이미지가 나온다.
 */
export async function generateContentImagePrompt(title: string, content: string, apiKey: string): Promise<string> {
  const endpoint = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const instruction = `You are an expert photorealistic image prompt engineer.
Read the following Korean community post and convert it into exactly ONE high-quality English
image-generation prompt describing a single photorealistic scene that captures its central
subject, situation, and mood.

[Title]: ${title}
[Body]: ${content.slice(0, 1500)}

STRICT RULES:
1. Identify the main subject, central action/situation, real-world environment, and emotional
   atmosphere from the text above, and describe ONE coherent photographic scene that
   communicates the central meaning of the post. Do NOT create multiple scenes, collages,
   split screens, storyboards, or multi-panel images.
2. The prompt MUST be one continuous English paragraph beginning EXACTLY with:
   "Create a sense of adventure, courage, and realism with a single photorealistic scene of"
3. Naturally include the phrase: "one unified scene in a single frame, not a collage, not a
   split screen, not a storyboard, not multiple panels".
4. Describe real-world photography only (NO artwork, NO illustration, NO infographic, NO 3D
   render, NO surreal metaphor). If human figures appear, depict realistic Korean/East Asian
   individuals by default — only depict a different ethnicity/nationality when the text
   explicitly names a specific foreign celebrity, politician, entertainer, or athlete, or
   explicitly describes a foreign country/setting central to the story. Natural skin texture,
   anatomically correct hands, believable proportions.
5. Include camera gear (choose one: Sony A7R IV, Canon EOS R5, or Nikon Z8) with one prime lens
   (35mm/50mm/85mm), aperture (f/1.8-f/4), shutter speed (1/160-1/1000s), ISO (100-800), white
   balance (5200K-6500K), and one lighting preset (Outdoor Daylight / Indoor daylight / Night
   neon practical lights). Always include: "photorealistic, documentary-quality real-world
   photography, physically plausible lighting and materials, true-to-life colors, natural film
   grain, realistic skin texture, anatomically correct human features, accurate scale and
   perspective, no stylization, shot on a full-frame camera, 16-bit RAW photographic look".
6. Cinematic framing, rule-of-thirds, high resolution, "no visible text" unless essential.
7. Append this exact negative block at the very end:
   ", no illustration, no painting, no watercolor, no sketch, no vector art, no cartoon, no anime, no comic-book style, no 3D render, no CGI, no game-engine look, no flat shading, no cel shading, no toon style, no surreal montage, no collage, no split screen, no storyboard, no multiple panels, no duplicated subjects, no repeated faces, no extra limbs, no malformed hands, no distorted anatomy, no floating objects, no over-smoothed skin, no waxy skin, no plastic texture, no artificial facial features, no excessive HDR, no oversaturation, no unrealistic colors, no posterization, no watermark, no signature, no unwanted captions, no logo artifacts"
8. Output ONLY a valid JSON object: { "imagePrompt": "..." }`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: instruction }] }],
        generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        const parsed = JSON.parse(text);
        if (parsed.imagePrompt) {
          return parsed.imagePrompt as string;
        }
      }
    }
  } catch {
    // 실패하면 아래 fallback으로 넘어간다 — 호출부(generateCafeImageAction)에서 이 에러를
    // 사용자에게 보여줄 필요는 없다(제목 기반 fallback으로도 이미지 생성 자체는 계속 진행됨).
  }

  // Gemini 텍스트 호출이 실패했을 때의 최후 보루 — 제목만으로 만드는 단순 프롬프트.
  // 루트 CLAUDE.md 불변의 핵심 원칙 3번(인물은 기본 한국인/동아시아인으로 묘사)을 여기서도
  // 반드시 지킨다 — blog에서 이 규칙이 fallback 경로에 빠져 있어 "인물이 전부 외국인으로
  // 나온다"는 사고가 났던 전례(2026-09-03)가 있다.
  return `Create a sense of adventure, courage, and realism with a single photorealistic scene of ${title}, one unified scene in a single frame, not a collage, not a split screen, not a storyboard, not multiple panels. If human figures appear, depict realistic Korean/East Asian individuals by default, natural skin texture, anatomically correct hands, believable proportions. Shot on Canon EOS R5 with 50mm prime lens, f/2.0, 1/320s, ISO 200, 5600K, photorealistic, documentary-quality real-world photography, no visible text.`;
}

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
