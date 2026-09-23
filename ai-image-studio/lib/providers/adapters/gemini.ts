import { ImageGenerateParams, ImageGenerateResult, ImageProviderAdapter } from "../types";

const KOREAN_DEFAULT_PEOPLE_INSTRUCTION =
  "If this scene includes any human figures, depict them as Korean/East Asian people by default. Only depict a different ethnicity/nationality if the prompt explicitly names a specific foreign celebrity, politician, entertainer, or athlete, or explicitly describes a foreign country/setting.";

interface NanoBananaConfig {
  modelName: string;
  endpoint: string;
  defaultSize: "1K" | "2K" | "4K";
  temperature: number;
}

const NANO_BANANA_CONFIGS: Record<string, NanoBananaConfig> = {
  "nanobanana-pro": {
    modelName: "gemini-3-pro-image-preview",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent",
    defaultSize: "4K",
    temperature: 0.4,
  },
  "nanobanana-2-4k": {
    modelName: "gemini-3-pro-image-preview",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent",
    defaultSize: "4K",
    temperature: 0.7,
  },
  "nanobanana-2-2k": {
    modelName: "gemini-2.5-flash-image",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
    defaultSize: "2K",
    temperature: 0.7,
  },
  "nanobanana": {
    modelName: "gemini-2.5-flash-image",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
    defaultSize: "1K",
    temperature: 0.7,
  }
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
    const selectedSize = params.options.imageSize;
    const finalImageSize = (selectedSize && selectedSize !== "auto") ? selectedSize : config.defaultSize;

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
