import "server-only";
import { getNanoBananaConfig } from "./nanoBananaConfig";
import { generateGeminiImage } from "./geminiImage";
import { ratioWords, refParts, styleInfo, stylePromptLine, type ImageRatio, type ImageRef, type ImageStyle } from "../imageOptions";

export interface GeneratedImage { base64: string; mimeType: string; model: string; }

export async function generateNanoBananaImage(params: { apiKey: string; topic: string; title?: string; keywords?: string; model?: string; sceneDescription?: string; aspectRatio?: ImageRatio; style?: ImageStyle; refs?: ImageRef[] }): Promise<GeneratedImage> {
  const config = getNanoBananaConfig(params.model ?? "nanobanana-2-2k");
  // 병합 B-4: 비율·표현 방식·참고 사진(선택). 고르지 않으면 예전 프롬프트와 같다(16:9·기본 표현·참고 없음).
  const ratio = params.aspectRatio ?? "16:9";
  const styleLine = stylePromptLine(params.style ?? "default");
  const info = styleInfo(params.style ?? "default");
  const prompt = `${params.sceneDescription ? `Create this exact editorial scene: ${params.sceneDescription}` : `Create one ${info.photo ? "photorealistic editorial image" : info.kind} for a Korean Naver blog post. Topic: ${params.topic}. Title: ${params.title || "not specified"}. Keywords: ${params.keywords || "none"}.`} Depict realistic Korean/East Asian people by default unless the topic explicitly requires another setting. Use one unified scene, not a collage or split screen. ${info.photo ? "Natural lighting, documentary-quality composition" : "Clean, simple composition"}, ${ratioWords(ratio)}, no visible text, no logo, no watermark.${styleLine ? ` ${styleLine}` : ""}`;
  const parts = refParts(prompt, params.refs ?? []);
  // v1.67(2026-10-17): 호출·대기·이미지 받아오기는 공용 기준 코드 gemini-image-client(./geminiImage — 기준은 ai-image-studio)로.
  // 키는 머리글로, 120초 시간 제한, 서버 오류·혼잡 1회 재시도, 안전 차단·키 오류 한국어 안내(키 가림). 프롬프트·모델·화질·온도는 그대로.
  const image = await generateGeminiImage({
    apiKey: params.apiKey,
    modelName: config.modelName,
    ...(parts ? { parts } : { prompt }),
    aspectRatio: ratio,
    imageSize: config.imageSize,
    temperature: config.temperature,
    responseModalities: ["Image"],
  });
  return { base64: image.base64, mimeType: image.mimeType, model: config.modelName };
}
