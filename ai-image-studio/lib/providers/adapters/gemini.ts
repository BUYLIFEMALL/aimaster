import { ImageGenerateParams, ImageGenerateResult, ImageProviderAdapter } from "../types";
import { generateGeminiImage } from "../geminiImage";
import { getNanoBananaConfig, resolveImageSize } from "../nanoBananaModels";

const KOREAN_DEFAULT_PEOPLE_INSTRUCTION =
  "If this scene includes any human figures, depict them as Korean/East Asian people by default. Only depict a different ethnicity/nationality if the prompt explicitly names a specific foreign celebrity, politician, entertainer, or athlete, or explicitly describes a foreign country/setting.";

// v1.14(2026-10-17): 등급별 모델·화질·온도는 공용 기준 코드 gemini-image-models(../nanoBananaModels)로 통합했다(값은 v1.11과 같음).
// ★ 이 프로그램은 이미지 생성의 레퍼런스 구현이다(루트 CLAUDE.md 「이미지 생성 레퍼런스 규칙」) — 다른 프로그램은 같은 파일 사본을 쓴다.

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
    const config = getNanoBananaConfig(rawModel);

    const stylePreset = params.options.style_preset;
    const styleText = stylePreset && STYLE_PROMPTS[stylePreset] ? ` (${STYLE_PROMPTS[stylePreset]})` : "";
    const composedPrompt = `${params.prompt}${styleText}\n\n${KOREAN_DEFAULT_PEOPLE_INSTRUCTION}`;

    const aspectRatio = params.options.aspectRatio || "1:1";
    const selectedSize = params.options.imageSize as string | undefined;
    // 모델이 받지 않는 화질(예: Lite에 2K)은 기본 화질로 — 요청 실패 대신 가능한 값으로 만든다
    const finalImageSize = resolveImageSize(config, selectedSize === "auto" ? undefined : selectedSize);

    // v1.13(2026-10-17): 호출·대기·이미지 받아오기는 공용 기준 코드 gemini-image-client(../geminiImage)로 —
    // 키는 머리글로, 120초 시간 제한, 서버 오류·혼잡 1회 재시도, 안전 차단·키 오류 한국어 안내. 프롬프트·모델·화질·온도는 이 어댑터 값 그대로.
    const { base64, mimeType } = await generateGeminiImage({
      apiKey: params.apiKey,
      modelName: config.modelName,
      prompt: composedPrompt,
      aspectRatio,
      imageSize: finalImageSize,
      temperature: config.temperature,
      responseModalities: ["IMAGE"],
    });
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
