export type AIModelProvider = "openai" | "anthropic" | "gemini";

export const AI_PROVIDERS: AIModelProvider[] = ["openai", "anthropic", "gemini"];

export interface AIModelOption {
  value: string;
  label: string;
  shortLabel: string;
  provider: AIModelProvider;
  isRecommended?: boolean;
}

// 2026-11-14 주인님 지시 「사용안되는 모델이니 이런건 빼고 최신 모델로 바꿔」 — docs/AI_MODEL_CATALOG.md(2026-11-03 확인)
// 플랫폼별 추천 3개(균형·가성비·최고 품질), 맨 앞이 기본값(중가 균형). 같은 목록: ebook-studio/src/lib/textModels.ts.
export const AI_MODEL_OPTIONS: AIModelOption[] = [
  // 1. OpenAI (GPT)
  { value: "gpt-6.1-terra", label: "🎯 GPT-6.1 Terra (균형 · 기본 추천)", shortLabel: "GPT-6.1 Terra", provider: "openai", isRecommended: true },
  { value: "gpt-6-luna", label: "⚡ GPT-6 Luna (가성비 · 가장 저렴)", shortLabel: "GPT-6 Luna", provider: "openai" },
  { value: "gpt-6-astra", label: "💎 GPT-6 Astra (최고 품질 · 비용 높음)", shortLabel: "GPT-6 Astra", provider: "openai" },

  // 2. Claude (Anthropic)
  { value: "claude-sonnet-5-5", label: "🎯 Claude Sonnet 5.5 (자연스러운 문체 · 기본 추천)", shortLabel: "Claude Sonnet 5.5", provider: "anthropic", isRecommended: true },
  { value: "claude-haiku-5-5", label: "⚡ Claude Haiku 5.5 (가성비 · 빠름)", shortLabel: "Claude Haiku 5.5", provider: "anthropic" },
  { value: "claude-opus-5-5", label: "💎 Claude Opus 5.5 (최고 품질)", shortLabel: "Claude Opus 5.5", provider: "anthropic" },

  // 3. Gemini (Google)
  { value: "gemini-3.8-flash", label: "🎯 Gemini 3.8 Flash (균형 · 기본 추천 · 무료 등급 있음)", shortLabel: "Gemini 3.8 Flash", provider: "gemini", isRecommended: true },
  { value: "gemini-3.5-flash-lite", label: "⚡ Gemini 3.5 Flash Lite (가장 저렴)", shortLabel: "Gemini 3.5 Flash Lite", provider: "gemini" },
  { value: "gemini-4-argon", label: "💎 Gemini 4 Argon (최고 품질 · 결제 연결 키 필요)", shortLabel: "Gemini 4 Argon", provider: "gemini" },
];

export const DEFAULT_AI_MODELS: Record<AIModelProvider, string> = {
  openai: "gpt-6.1-terra",
  anthropic: "claude-sonnet-5-5",
  gemini: "gemini-3.8-flash",
};

/**
 * 회원 브라우저에 저장된 옛 모델 값·화면이 보낸 값을 지금 쓸 수 있는 모델로 바꾼다.
 * 목록에 있으면 그대로, 없으면(종료·종료 예정·미리보기·이전 세대) 그 플랫폼의 기본 추천 모델.
 */
export function currentModelFor(provider: AIModelProvider, model: unknown): string {
  return AI_MODEL_OPTIONS.some((o) => o.value === model && o.provider === provider) ? String(model) : DEFAULT_AI_MODELS[provider];
}

export const PROVIDER_SHORT_LABELS: Record<AIModelProvider, string> = {
  openai: "OpenAI (GPT)",
  anthropic: "Claude",
  gemini: "Gemini",
};

export const PROVIDER_ICONS: Record<AIModelProvider, string> = {
  openai: "🤖",
  anthropic: "🧠",
  gemini: "✨",
};
