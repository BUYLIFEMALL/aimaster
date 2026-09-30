import { DEFAULT_OPENAI_CONTENT_MODEL, OPENAI_CONTENT_MODELS, type OpenAIContentModel } from "./openaiModels";

export const CONTENT_PROVIDERS = ["openai", "anthropic", "gemini"] as const;
export type ContentProvider = (typeof CONTENT_PROVIDERS)[number];

export type ContentModelOption = { value: string; label: string; provider: ContentProvider };

export const CONTENT_MODEL_OPTIONS: ContentModelOption[] = [
  ...OPENAI_CONTENT_MODELS.map((model) => ({ ...model, provider: "openai" as const })),
  { value: "claude-haiku-4-5", label: "Claude Haiku 4.5 · 빠르고 경제적인 기본 모델", provider: "anthropic" },
  { value: "claude-sonnet-5", label: "Claude Sonnet 5 · 자연스러운 장문 콘텐츠", provider: "anthropic" },
  { value: "claude-opus-5", label: "Claude Opus 5 · 복잡한 맥락과 고품질 글", provider: "anthropic" },
  { value: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite · 빠르고 경제적인 기본 모델", provider: "gemini" },
  { value: "gemini-3.7-flash", label: "Gemini 3.7 Flash · 속도와 품질의 균형", provider: "gemini" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro · 깊이 있는 분석과 장문", provider: "gemini" },
  { value: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview · 고품질 콘텐츠", provider: "gemini" },
];

export const CONTENT_PROVIDER_LABELS: Record<ContentProvider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic Claude",
  gemini: "Google Gemini",
};

export function isContentProvider(value: unknown): value is ContentProvider {
  return CONTENT_PROVIDERS.some((provider) => provider === value);
}

export function getContentModels(provider: ContentProvider) {
  return CONTENT_MODEL_OPTIONS.filter((model) => model.provider === provider);
}

export function getDefaultContentModel(provider: ContentProvider) {
  if (provider === "openai") return DEFAULT_OPENAI_CONTENT_MODEL;
  return getContentModels(provider)[0]?.value ?? DEFAULT_OPENAI_CONTENT_MODEL;
}

export function isContentModelForProvider(provider: ContentProvider, value: unknown) {
  return getContentModels(provider).some((model) => model.value === value);
}

export function resolveContentModel(provider: ContentProvider, value: unknown) {
  return isContentModelForProvider(provider, value) ? String(value) : getDefaultContentModel(provider);
}

export type { OpenAIContentModel };
