export const OPENAI_CONTENT_MODELS = [
  { value: "gpt-4o-mini", label: "GPT-4o mini · 빠르고 경제적인 기본 모델" },
  { value: "gpt-4o", label: "GPT-4o · 균형 잡힌 글쓰기" },
  { value: "gpt-4.1", label: "GPT-4.1 · 긴 문맥과 지시사항에 강함" },
  { value: "gpt-5", label: "GPT-5 · 고품질 콘텐츠 생성" },
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
