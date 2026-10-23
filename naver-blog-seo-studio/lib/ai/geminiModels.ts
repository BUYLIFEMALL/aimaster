export const GEMINI_IMAGE_MODELS = [
  { value: "nanobanana", label: "NanoBanana Standard · 1K 기본 모델" },
  { value: "nanobanana-2-2k", label: "NanoBanana 2 · 2K 고화질" },
  { value: "nanobanana-2-4k", label: "NanoBanana 2 · 4K 초고화질" },
  { value: "nanobanana-pro", label: "NanoBanana Pro · 최고 품질" },
] as const;

export type GeminiImageModel = (typeof GEMINI_IMAGE_MODELS)[number]["value"];
export const DEFAULT_GEMINI_IMAGE_MODEL: GeminiImageModel = "nanobanana-2-2k";

export function isGeminiImageModel(value: unknown): value is GeminiImageModel {
  return GEMINI_IMAGE_MODELS.some((model) => model.value === value);
}

export function resolveGeminiImageModel(value: unknown): GeminiImageModel {
  return isGeminiImageModel(value) ? value : DEFAULT_GEMINI_IMAGE_MODEL;
}

export function getUserGeminiImageModel(userMetadata: Record<string, unknown> | null | undefined) {
  return resolveGeminiImageModel(userMetadata?.naver_blog_seo_gemini_model);
}
