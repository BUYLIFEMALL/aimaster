// [이미지 모델 교체 2026-10-17] 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview) → 최신 정식(gemini-nano-banana-2.1·gemini-3-pro-image), 기준: ai-image-studio v1.11 lib/providers/adapters/gemini.ts.
// 실제 이미지 생성 시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다(주인님 지시).
import "server-only";

export interface NanoBananaModelConfig {
  modelName: string;
  endpoint: string;
  imageSize: "1K" | "2K" | "4K";
  temperature: number;
}

export const NANO_BANANA_MODEL_CONFIGS: Record<string, NanoBananaModelConfig> = {
  nanobanana: { modelName: "gemini-nano-banana-2.1", endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-nano-banana-2.1:generateContent", imageSize: "1K", temperature: 0.7 },
  "nanobanana-2-2k": { modelName: "gemini-nano-banana-2.1", endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-nano-banana-2.1:generateContent", imageSize: "2K", temperature: 0.7 },
  "nanobanana-2-4k": { modelName: "gemini-nano-banana-2.1", endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-nano-banana-2.1:generateContent", imageSize: "4K", temperature: 0.7 },
  "nanobanana-pro": { modelName: "gemini-3-pro-image", endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image:generateContent", imageSize: "4K", temperature: 0.7 },
};

export function getNanoBananaConfig(model: string) {
  return NANO_BANANA_MODEL_CONFIGS[model] ?? NANO_BANANA_MODEL_CONFIGS["nanobanana-2-2k"];
}
