// [이미지 모델 교체 2026-10-17] 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview) → 최신 정식(gemini-nano-banana-2.1·gemini-3-pro-image), 기준: ai-image-studio v1.11 lib/providers/adapters/gemini.ts.
// 실제 이미지 생성 시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다(주인님 지시).
export const IMAGE_MODELS = [
  { id: "gemini-nano-banana-2.1", name: "Nano Banana 2 · 균형형" },
  { id: "gemini-3-pro-image", name: "Nano Banana Pro · 정밀형" },
] as const;
export const TEXT_MODEL = "gemini-2.5-flash";
export const ASPECTS = ["original", "1:1", "3:4", "4:3", "9:16", "16:9"] as const;
export type Aspect = typeof ASPECTS[number];
export type Mode = "restore" | "compose";
export interface InputImage { data: string; mimeType: "image/jpeg" | "image/png" | "image/webp"; name: string; instruction?: string }
export interface RestoreOptions { repair: boolean; colorize: boolean; upscale: 1 | 2 | 4 }
export interface RemakeRequest {
  mode: Mode; model: string; base: InputImage; objects: InputImage[];
  options: RestoreOptions; aspect: Aspect; background: "keep" | "change";
  prompt: string; consent: true;
}
export interface RemakeResult {
  data: string; mimeType: "image/jpeg"; width: number; height: number;
  model: string; mode: Mode; limited: boolean; createdAt: number;
}
export const MAX_OBJECTS = 5;
export const MAX_REQUEST_BYTES = 3_800_000;
export const MAX_OUTPUT_SIDE = 8192;
export function downloadName(mode: Mode, mime: string, now = Date.now()) {
  return `포토리메이크-${mode === "restore" ? "복원" : "합성"}-${now}.${mime === "image/png" ? "png" : "jpg"}`;
}
