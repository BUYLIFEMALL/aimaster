import { ImageGenerateParams, ImageGenerateResult, ImageProviderAdapter } from "../types";

const KOREAN_DEFAULT_PEOPLE_INSTRUCTION =
  "If this scene includes any human figures, depict them as Korean/East Asian people by default. Only depict a different ethnicity/nationality if the prompt explicitly names a specific foreign celebrity, politician, entertainer, or athlete, or explicitly describes a foreign country/setting.";

type ImageSizeOption = "1K" | "2K" | "4K";
interface NanoBananaConfig {
  modelName: string;
  endpoint: string;
  defaultSize: ImageSizeOption;
  /** 이 모델이 받는 화질(그 밖의 값은 defaultSize로) */
  sizes: ImageSizeOption[];
  temperature: number;
}

// 2026-10-17 v1.11: 종료·구형 모델 교체(주인님 승인). gemini-2.5-flash-image는 공식 가격표에 2026-10-02 종료 예정 구형,
// gemini-3-pro-image-preview는 2026-06-25 종료 예정 미리보기판 → 최신 정식 모델로. 가격(1장, 2026-10-17 공식 가격표):
// nano-banana-2.1 1K $0.0336·2K $0.0504·4K $0.113 / 3-pro-image 1K·2K $0.134·4K $0.24 / 3.1-flash-lite-image 1K $0.0336.
// ★ 이 파일은 이미지 생성의 레퍼런스 구현이다(루트 CLAUDE.md 「이미지 생성 레퍼런스 규칙」) — 다른 프로그램이 참고한다.
const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta/models";
const nb = (modelName: string, defaultSize: ImageSizeOption, sizes: ImageSizeOption[], temperature: number): NanoBananaConfig => ({
  modelName, endpoint: `${GEMINI_API}/${modelName}:generateContent`, defaultSize, sizes, temperature,
});

const NANO_BANANA_CONFIGS: Record<string, NanoBananaConfig> = {
  "nanobanana-pro": nb("gemini-3-pro-image", "4K", ["1K", "2K", "4K"], 0.4),
  "nanobanana-2-4k": nb("gemini-nano-banana-2.1", "4K", ["1K", "2K", "4K"], 0.7),
  "nanobanana-2-2k": nb("gemini-nano-banana-2.1", "2K", ["1K", "2K", "4K"], 0.7),
  "nanobanana": nb("gemini-3.1-flash-lite-image", "1K", ["1K"], 0.7),
};

const STYLE_PROMPTS: Record<string, string> = {
  photorealistic: "A high resolution, detailed photorealistic editorial photograph, natural skin texture, soft cinematic lighting.",
  digital_art: "Vibrant, highly detailed digital art illustration, clean vector aesthetic and vivid colors.",
  cinematic: "Cinematic film still, 35mm lens effect, dramatic lighting, depth of field, high contrast visual storytelling.",
  anime: "Japanese anime webtoon visual style, crisp linework, expressive character design, beautiful cel shading.",
  "3d_render": "Professional 3D Octane render, smooth materials, studio lighting, ambient occlusion, raytracing."
};

export class GeminiAdapter implements ImageProviderAdapter {
  providerId = "gemini";

  async generateImage(params: ImageGenerateParams): Promise<ImageGenerateResult> {
    const rawModel = params.model || "nanobanana-2-2k";

    // Lookup NanoBanana / Gemini verified model config
    const config = NANO_BANANA_CONFIGS[rawModel] || NANO_BANANA_CONFIGS["nanobanana-2-2k"];
    const url = `${config.endpoint}?key=${params.apiKey}`;

    const stylePreset = params.options.style_preset;
    const styleText = stylePreset && STYLE_PROMPTS[stylePreset] ? ` (${STYLE_PROMPTS[stylePreset]})` : "";
    const composedPrompt = `${params.prompt}${styleText}\n\n${KOREAN_DEFAULT_PEOPLE_INSTRUCTION}`;

    const aspectRatio = params.options.aspectRatio || "1:1";
    const selectedSize = params.options.imageSize as ImageSizeOption | "auto" | undefined;
    // 모델이 받지 않는 화질(예: Lite에 2K)은 기본 화질로 — 요청 실패 대신 가능한 값으로 만든다
    const finalImageSize: ImageSizeOption = selectedSize && selectedSize !== "auto" && config.sizes.includes(selectedSize) ? selectedSize : config.defaultSize;

    const requestBody = {
      contents: [{ parts: [{ text: composedPrompt }] }],
      generationConfig: {
        responseModalities: ["IMAGE"],
        imageConfig: {
          aspectRatio,
          imageSize: finalImageSize,
        },
        temperature: config.temperature,
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google Gemini (Nanobanana) API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const imagePart = data.candidates?.[0]?.content?.parts?.find(
      (part: any) => part.inlineData?.data
    );

    if (!imagePart?.inlineData?.data) {
      throw new Error(`나노바나나(${config.modelName}) 응답에 이미지 데이터가 포함되어 있지 않습니다.`);
    }

    const base64 = imagePart.inlineData.data.replace(/\s+/g, "");
    const mimeType = imagePart.inlineData.mimeType || "image/png";
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return {
      imageUrl: dataUrl,
      metadata: {
        model: rawModel,
        modelName: config.modelName,
        aspectRatio,
        imageSize: finalImageSize
      }
    };
  }
}
