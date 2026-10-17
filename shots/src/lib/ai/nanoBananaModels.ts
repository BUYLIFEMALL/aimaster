// [이미지 모델 교체 2026-10-17] 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview) → 최신 정식(gemini-nano-banana-2.1·gemini-3-pro-image), 기준: ai-image-studio v1.11 lib/providers/adapters/gemini.ts.
// 실제 이미지 생성 시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다(주인님 지시).
// 클라이언트 컴포넌트(모델 선택 UI)에서도 import해야 해서 "server-only" 의존성이 없는 별도 파일로 분리.

export type NanoBananaModelType = "nanobanana" | "nanobanana-2-2k" | "nanobanana-2-4k" | "nanobanana-pro";

export interface NanoBananaModelConfig {
  modelName: string;
  endpoint: string;
  imageSize: "1K" | "2K" | "4K";
  temperature: number;
}

export const NANO_BANANA_MODEL_CONFIGS: Record<NanoBananaModelType, NanoBananaModelConfig> = {
  nanobanana: {
    modelName: "gemini-nano-banana-2.1",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-nano-banana-2.1:generateContent",
    imageSize: "1K",
    temperature: 0.7,
  },
  "nanobanana-2-2k": {
    modelName: "gemini-nano-banana-2.1",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-nano-banana-2.1:generateContent",
    imageSize: "2K",
    temperature: 0.7,
  },
  "nanobanana-2-4k": {
    modelName: "gemini-nano-banana-2.1",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-nano-banana-2.1:generateContent",
    imageSize: "4K",
    temperature: 0.7,
  },
  "nanobanana-pro": {
    modelName: "gemini-nano-banana-2.1",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-nano-banana-2.1:generateContent",
    imageSize: "4K",
    temperature: 0.4,
  },
};

export const NANO_BANANA_MODEL_OPTIONS: { label: string; value: NanoBananaModelType }[] = [
  { label: "NanoBanana Standard (기본 모델)", value: "nanobanana" },
  { label: "NanoBanana 2-2K (2K 고화질 - 추천)", value: "nanobanana-2-2k" },
  { label: "NanoBanana 2-4K (4K 울트라 HD)", value: "nanobanana-2-4k" },
  { label: "NanoBanana Pro (정교한 묘사)", value: "nanobanana-pro" },
];

export function getNanoBananaConfig(modelType?: string): NanoBananaModelConfig {
  return NANO_BANANA_MODEL_CONFIGS[modelType as NanoBananaModelType] ?? NANO_BANANA_MODEL_CONFIGS["nanobanana-2-2k"];
}
