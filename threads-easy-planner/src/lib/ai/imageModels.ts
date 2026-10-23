// 글과 함께 만드는 이미지의 모델·비율 목록(화면·서버 공용, 2026-10-23 v1.48).
// 모델 값은 Threads 콘텐츠 운영(threads-content-ops/lib/personas.ts IMAGE_MODELS)과 같은 이름을 쓴다 — 나노바나나 등급은 공용 gemini-image-models 사본(./nanoBananaModels)이 실제 모델로 바꾼다.
// 회원 본인 키: 나노바나나 = Gemini 키, GPT Image = OpenAI 키(이미 글 생성용으로 등록하는 같은 키).

export type ImageEngine = "gemini" | "openai";
export type ImageRatio = "4:5" | "1:1";

export interface ImageModelOption {
  value: string;
  label: string;
  engine: ImageEngine;
}

export const IMAGE_MODEL_OPTIONS: ImageModelOption[] = [
  { value: "nanobanana-2-2k", label: "🍌 NanoBanana 2 · 2K (고화질 · 기본 추천)", engine: "gemini" },
  { value: "nanobanana", label: "🍌 NanoBanana 2 · 1K (빠르고 저렴)", engine: "gemini" },
  { value: "nanobanana-pro", label: "🍌 NanoBanana Pro (정밀 고품질)", engine: "gemini" },
  { value: "gpt-image-2", label: "🎨 GPT Image 2 (OpenAI 표준 · 추천)", engine: "openai" },
  { value: "gpt-image-1-mini", label: "🎨 GPT Image 1 Mini (빠르고 저렴)", engine: "openai" },
  { value: "gpt-image-1", label: "🎨 GPT Image 1 (표준 1세대)", engine: "openai" },
];

export const DEFAULT_IMAGE_MODELS: Record<ImageEngine, string> = {
  gemini: "nanobanana-2-2k",
  openai: "gpt-image-2",
};

export const IMAGE_RATIO_OPTIONS: { value: ImageRatio; label: string }[] = [
  { value: "4:5", label: "세로 4:5 (스레드 피드 추천)" },
  { value: "1:1", label: "정사각 1:1" },
];

export const IMAGE_ENGINE_LABELS: Record<ImageEngine, string> = {
  gemini: "Gemini (나노바나나)",
  openai: "OpenAI (GPT Image)",
};

/** 한 번에 만드는 장수(1~2) — 장마다 따로 요청해 Vercel 시간 제한(300초) 안에 끝나게 한다 */
export const MAX_IMAGE_COUNT = 2;

export function findImageModel(value: string): ImageModelOption | undefined {
  return IMAGE_MODEL_OPTIONS.find((m) => m.value === value);
}

export function isImageRatio(value: string): value is ImageRatio {
  return value === "4:5" || value === "1:1";
}
