import { NANO_BANANA_MODEL_CONFIGS } from "./nanoBananaModels";
// [이미지 모델 교체 2026-10-17] 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview) → 최신 정식(gemini-nano-banana-2.1·gemini-3-pro-image), 기준: ai-image-studio v1.11 lib/providers/adapters/gemini.ts.
// 실제 이미지 생성 시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다(주인님 지시).
// 글 작성·분석 모델과 이미지 모델 목록(서버·화면 공용). 모델 ID는 ai-auto-blog/utils/ai/contentModels.ts에서
// 공급사 모델 목록 API로 확인한 ID만 쓴다(2026-10-01 확인). 새 모델을 넣을 때도 먼저 실제 존재를 확인할 것.
export type AiProvider = "openai" | "gemini";
export interface ModelOption { provider: AiProvider; id: string; name: string; purpose: string }

export const TEXT_MODELS: ModelOption[] = [
  { provider: "openai", id: "gpt-4.1", name: "GPT-4.1", purpose: "긴 지시를 잘 따르는 블로그 글 (기본)" },
  { provider: "openai", id: "gpt-5.6-terra", name: "GPT-5.6 Terra", purpose: "추론형 · 일반 장문" },
  { provider: "openai", id: "gpt-5.6-sol", name: "GPT-5.6 Sol", purpose: "추론형 · 복잡한 주제" },
  { provider: "openai", id: "gpt-4o-mini", name: "GPT-4o mini", purpose: "가벼운 작업" },
  { provider: "gemini", id: "gemini-3.8-flash", name: "Gemini 3.8 Flash", purpose: "일반 블로그 글 (기본)" },
  { provider: "gemini", id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash-Lite", purpose: "가벼운 작업" },
  { provider: "gemini", id: "gemini-4-argon", name: "Gemini 4 Argon", purpose: "깊이 있는 분석형 장문 (결제 연결된 키 필요)" },
];

// 2026-10-17: 이미지 모델 이름은 공용 기준 코드 gemini-image-models(./nanoBananaModels — 기준은 ai-image-studio)의 2K·Pro 등급에서 가져온다(주인님 지시로 통합).
export const IMAGE_MODELS = [
  { id: NANO_BANANA_MODEL_CONFIGS["nanobanana-2-2k"].modelName, name: "Nano Banana 2 · 균형형 (기본)" },
  { id: NANO_BANANA_MODEL_CONFIGS["nanobanana-pro"].modelName, name: "Nano Banana Pro · 정밀형" },
] as const;

export const DEFAULT_MODEL: Record<AiProvider, string> = { openai: "gpt-4.1", gemini: "gemini-3.8-flash" };

// 2026-11-03 종료·자동 연결되는 옛 글 모델(Gemini 2.5 12-01, 3.5 Flash) → 대체 모델. 저장된 설정의 옛 값도 새 모델로 호출한다.
const RETIRED_TEXT_MODEL: Record<string, string> = {
  "gemini-2.5-pro": "gemini-3.8-flash", "gemini-2.5-flash": "gemini-3.8-flash", "gemini-2.5-flash-lite": "gemini-3.5-flash-lite", "gemini-3.5-flash": "gemini-3.8-flash",
};
export function currentTextModel(id: string): string {
  return RETIRED_TEXT_MODEL[id] ?? id;
}
export const DEFAULT_IMAGE_MODEL = IMAGE_MODELS[0].id;

export function isTextModel(provider: unknown, id: unknown): boolean {
  return TEXT_MODELS.some((m) => m.provider === provider && m.id === id);
}
export function isImageModel(id: unknown): boolean {
  return IMAGE_MODELS.some((m) => m.id === id);
}
