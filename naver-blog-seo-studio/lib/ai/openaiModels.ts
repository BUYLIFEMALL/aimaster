export const OPENAI_CONTENT_MODELS = [
  { value: "gpt-4o-mini", label: "GPT-4o mini · 빠르고 경제적인 기본 모델" },
  { value: "gpt-4o", label: "GPT-4o · 균형 잡힌 글쓰기" },
  { value: "gpt-4.1", label: "GPT-4.1 · 긴 문맥과 지시사항에 강함" },
  { value: "gpt-5", label: "GPT-5 · 고품질 콘텐츠 생성" },
  { value: "gpt-5.6-luna", label: "GPT-5.6 Luna · 빠르고 저렴한 최신 모델" },
  { value: "gpt-5.6-terra", label: "GPT-5.6 Terra · 성능과 비용의 균형" },
  { value: "gpt-5.6-sol", label: "GPT-5.6 Sol · 복잡한 콘텐츠에 강한 고급 모델" },
  { value: "gpt-6-astra", label: "GPT-6 Astra · 최고 성능 플래그십 모델" },
] as const;

export type OpenAIContentModel = (typeof OPENAI_CONTENT_MODELS)[number]["value"];
export const DEFAULT_OPENAI_CONTENT_MODEL: OpenAIContentModel = "gpt-4o-mini";

export function isOpenAIContentModel(value: unknown): value is OpenAIContentModel {
  return OPENAI_CONTENT_MODELS.some((model) => model.value === value);
}

export function resolveOpenAIContentModel(value: unknown): OpenAIContentModel {
  return isOpenAIContentModel(value) ? value : DEFAULT_OPENAI_CONTENT_MODEL;
}

export function getUserOpenAIContentModel(userMetadata: Record<string, unknown> | null | undefined) {
  return resolveOpenAIContentModel(userMetadata?.naver_blog_seo_openai_model);
}
