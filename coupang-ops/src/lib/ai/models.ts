// 회원이 고르는 글 생성 모델. 목록 기준: threads-affiliate-poster/src/lib/ai/models.ts(OpenAI·Gemini), Claude는 현재 공식 모델(2026-10-31).
export type AIModelProvider = "anthropic" | "openai" | "gemini";

export const AI_MODEL_OPTIONS: { value: string; label: string; provider: AIModelProvider }[] = [
  { value: "claude-opus-5-5", label: "💎 Claude Opus 5.5 (기본 추천 · 최고 품질)", provider: "anthropic" },
  { value: "claude-sonnet-5-5", label: "🎯 Claude Sonnet 5.5 (균형형)", provider: "anthropic" },
  { value: "claude-haiku-5-5", label: "⚡ Claude Haiku 5.5 (빠르고 저렴)", provider: "anthropic" },
  { value: "gpt-4.1", label: "🚀 GPT-4.1 (기본 추천)", provider: "openai" },
  { value: "gpt-6-luna", label: "⚡ GPT-6 Luna (빠르고 저렴)", provider: "openai" },
  { value: "gpt-6-sol", label: "🎯 GPT-6 Sol (균형형)", provider: "openai" },
  { value: "gpt-6-astra", label: "💎 GPT-6 Astra (최고 품질)", provider: "openai" },
  { value: "gemini-3.7-flash", label: "⚡ Gemini 3.7 Flash (기본 추천)", provider: "gemini" },
  { value: "gemini-3.8-flash", label: "🚀 Gemini 3.8 Flash (최고 성능 Flash)", provider: "gemini" },
  { value: "gemini-3.5-flash-lite", label: "⚡ Gemini 3.5 Flash Lite (가장 빠르고 저렴)", provider: "gemini" },
  { value: "gemini-3.1-pro-preview", label: "💎 Gemini 3.1 Pro Preview (최고 품질)", provider: "gemini" },
];

export const AI_PROVIDERS: AIModelProvider[] = ["anthropic", "openai", "gemini"];
export const PROVIDER_LABEL: Record<AIModelProvider, string> = { anthropic: "Claude (Anthropic)", openai: "GPT (OpenAI)", gemini: "Gemini (Google)" };
export const DEFAULT_AI_MODELS: Record<AIModelProvider, string> = { anthropic: "claude-opus-5-5", openai: "gpt-4.1", gemini: "gemini-3.7-flash" };
export const DEFAULT_AI_MODEL = DEFAULT_AI_MODELS.anthropic;

/** 목록에 없는 값은 받지 않는다(회원 키로 엉뚱한 모델을 부르지 않게) */
export const providerOfModel = (model: unknown): AIModelProvider | null => AI_MODEL_OPTIONS.find((o) => o.value === model)?.provider ?? null;
export const missingKeyMessage = (provider: AIModelProvider) => `${PROVIDER_LABEL[provider]} API 키가 없습니다. 「API키등록·플랫폼연동」에서 본인 키를 등록해 주세요.`;
