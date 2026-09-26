export type AIModelProvider = "openai" | "gemini" | "anthropic";

export interface AIModelOption {
  value: string;
  label: string;
  shortLabel: string;
  provider: AIModelProvider;
}

export const AI_MODEL_OPTIONS: AIModelOption[] = [
  // OpenAI 최신 모델순
  { value: "gpt-5.6-luna", label: "⚡ GPT-5.6 Luna (가성비 초고속 · 기본 추천)", shortLabel: "GPT-5.6 Luna", provider: "openai" },
  { value: "gpt-5.6-terra", label: "🎯 GPT-5.6 Terra (균형형 자연스러운 어조)", shortLabel: "GPT-5.6 Terra", provider: "openai" },
  { value: "gpt-5.6-sol", label: "💎 GPT-5.6 Sol (최고 품질 플래그십)", shortLabel: "GPT-5.6 Sol", provider: "openai" },
  { value: "gpt-4.1", label: "🚀 GPT-4.1 (최신 세대 스마트 모델)", shortLabel: "GPT-4.1", provider: "openai" },
  { value: "o3", label: "🧩 o3 (고성능 논리 추론 모델)", shortLabel: "o3", provider: "openai" },
  { value: "gpt-4o", label: "⚙️ GPT-4o (범용 표준 모델)", shortLabel: "GPT-4o", provider: "openai" },

  // Google Gemini 최신 모델순
  { value: "gemini-3.7-flash", label: "⚡ Gemini 3.7 Flash (최신 세대 · 속도와 품질 균형 · 기본 추천)", shortLabel: "Gemini 3.7 Flash", provider: "gemini" },
  { value: "gemini-3.6-pro", label: "🎯 Gemini 3.6 Pro (고성능 차세대 추론)", shortLabel: "Gemini 3.6 Pro", provider: "gemini" },
  { value: "gemini-3.5-flash-lite", label: "⚡ Gemini 3.5 Flash Lite (가장 빠르고 저렴)", shortLabel: "Gemini 3.5 Flash Lite", provider: "gemini" },
  { value: "gemini-3.1-pro-preview", label: "💎 Gemini 3.1 Pro Preview (Google 최상위 플래그십)", shortLabel: "Gemini 3.1 Pro Preview", provider: "gemini" },

  // Anthropic Claude 최신 모델순
  { value: "claude-sonnet-5", label: "🎯 Claude Sonnet 5 (최신 세대 · 최고품질 자연스러운 문체 · 기본 추천)", shortLabel: "Claude Sonnet 5", provider: "anthropic" },
  { value: "claude-opus-5", label: "💎 Claude Opus 5 (고급형 복잡한 맥락 이해)", shortLabel: "Claude Opus 5", provider: "anthropic" },
  { value: "claude-haiku-4-5", label: "⚡ Claude Haiku 4.5 (가성비 초고속)", shortLabel: "Claude Haiku 4.5", provider: "anthropic" },
];

export const DEFAULT_AI_MODELS: Record<AIModelProvider, string> = {
  openai: "gpt-5.6-luna",
  gemini: "gemini-3.7-flash",
  anthropic: "claude-sonnet-5",
};

export const PROVIDER_SHORT_LABELS: Record<AIModelProvider, string> = {
  openai: "OpenAI (GPT)",
  gemini: "Google Gemini",
  anthropic: "Anthropic Claude",
};
