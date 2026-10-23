import "server-only";
import { getNanoBananaConfig } from "./nanoBananaConfig";
import { generateGeminiImage } from "./geminiImage";

export interface GeneratedImage { base64: string; mimeType: string; model: string; }

export async function generateNanoBananaImage(params: { apiKey: string; topic: string; title?: string; keywords?: string; model?: string; sceneDescription?: string }): Promise<GeneratedImage> {
  const config = getNanoBananaConfig(params.model ?? "nanobanana-2-2k");
  const prompt = `${params.sceneDescription ? `Create this exact editorial scene: ${params.sceneDescription}` : `Create one photorealistic editorial image for a Korean Naver blog post. Topic: ${params.topic}. Title: ${params.title || "not specified"}. Keywords: ${params.keywords || "none"}.`} Depict realistic Korean/East Asian people by default unless the topic explicitly requires another setting. Use one unified scene, not a collage or split screen. Natural lighting, documentary-quality composition, 16:9 landscape, no visible text, no logo, no watermark.`;
  // v1.67(2026-10-17): 호출·대기·이미지 받아오기는 공용 기준 코드 gemini-image-client(./geminiImage — 기준은 ai-image-studio)로.
  // 키는 머리글로, 120초 시간 제한, 서버 오류·혼잡 1회 재시도, 안전 차단·키 오류 한국어 안내(키 가림). 프롬프트·모델·화질·온도는 그대로.
  const image = await generateGeminiImage({
    apiKey: params.apiKey,
    modelName: config.modelName,
    prompt,
    aspectRatio: "16:9",
    imageSize: config.imageSize,
    temperature: config.temperature,
    responseModalities: ["Image"],
  });
  return { base64: image.base64, mimeType: image.mimeType, model: config.modelName };
}
