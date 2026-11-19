import { currentModelName, DEFAULT_OPENAI_CONTENT_MODEL, OPENAI_CONTENT_MODELS, type OpenAIContentModel } from "./openaiModels";

export const CONTENT_PROVIDERS = ["openai", "anthropic", "gemini"] as const;
export type ContentProvider = (typeof CONTENT_PROVIDERS)[number];

export type ContentModelOption = { value: string; label: string; provider: ContentProvider };

export const CONTENT_MODEL_OPTIONS: ContentModelOption[] = [
  ...OPENAI_CONTENT_MODELS.map((model) => ({ ...model, provider: "openai" as const })),
  // 2026-11-19 주인님 지시(최신 모델순·같은 기준): 플랫폼마다 최신 모델을 위로, 종료 예정·자동 연결 모델은 빼고 저장값은 대체 모델로 읽는다. 근거: 공식 모델 문서 + 실제 호출 확인(docs/AI_MODEL_CATALOG.md 0-1절).
  { value: "claude-fable-5-2", label: "Claude Fable 5.2 · 최신 · 최상위 품질 장문 (느림·비쌈)", provider: "anthropic" },
  { value: "claude-opus-5-5", label: "Claude Opus 5.5 · 최신 · 복잡한 맥락과 고품질 글", provider: "anthropic" },
  { value: "claude-sonnet-5-5", label: "Claude Sonnet 5.5 · 최신 · 자연스러운 장문 (기본)", provider: "anthropic" },
  { value: "claude-haiku-5-5", label: "Claude Haiku 5.5 · 최신 · 빠르고 경제적", provider: "anthropic" },
  { value: "claude-opus-5", label: "Claude Opus 5 · 이전 세대 · 복잡한 맥락", provider: "anthropic" },
  { value: "claude-sonnet-5", label: "Claude Sonnet 5 · 이전 세대 · 자연스러운 장문", provider: "anthropic" },
  { value: "gemini-4-carbon", label: "Gemini 4 Carbon · 최신 · 가장 어려운 장문·분석", provider: "gemini" },
  { value: "gemini-4-neon", label: "Gemini 4 Neon · 최신 · 깊이와 효율 균형", provider: "gemini" },
  { value: "gemini-4-argon", label: "Gemini 4 Argon · 최신 · 빠른 추론형 분석", provider: "gemini" },
  { value: "gemini-4-hydrogen", label: "Gemini 4 Hydrogen · 최신 · 빠른 일상 작업", provider: "gemini" },
  { value: "gemini-3.8-flash", label: "Gemini 3.8 Flash · 본문 생성 균형형 (기본)", provider: "gemini" },
  { value: "gemini-3.6-flash", label: "Gemini 3.6 Flash · 이전 세대 · 본문 생성", provider: "gemini" },
  { value: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite · 빠르고 경제적", provider: "gemini" },
  { value: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro 미리보기 · 분석형 장문", provider: "gemini" },
];

// 목록을 최신순으로 바꿨으므로 기본값은 「첫 항목」이 아니라 명시한 모델(docs/AI_MODEL_CATALOG.md 「중가 균형」).
const DEFAULT_MODEL_BY_PROVIDER: Record<Exclude<ContentProvider, "openai">, string> = {
  anthropic: "claude-sonnet-5-5",
  gemini: "gemini-3.8-flash",
};

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
  return DEFAULT_MODEL_BY_PROVIDER[provider];
}

export function isContentModelForProvider(provider: ContentProvider, value: unknown) {
  return getContentModels(provider).some((model) => model.value === value);
}

export function resolveContentModel(provider: ContentProvider, value: unknown) {
  const current = currentModelName(value);
  return isContentModelForProvider(provider, current) ? String(current) : getDefaultContentModel(provider);
}

// 2026-10-23: 원고 기록(seo_report.generatedModel)에 남길 「회사 · 모델」 — 나중에 어떤 모델로 만든 글인지 확인용.
export function generatedModelRecord(provider: ContentProvider, model: string) {
  return `${CONTENT_PROVIDER_LABELS[provider]} · ${model}`;
}

export type { OpenAIContentModel };
