export type AIModelProvider = "openai" | "anthropic" | "gemini";

export const AI_PROVIDERS: AIModelProvider[] = ["openai", "anthropic", "gemini"];

export interface AIModelOption {
  value: string;
  label: string;
  shortLabel: string;
  provider: AIModelProvider;
  isRecommended?: boolean;
}

export const AI_MODEL_OPTIONS: AIModelOption[] = [
  // 1. OpenAI (GPT) 최신 모델 라인업
  { value: "gpt-4.1", label: "🚀 GPT-4.1 (최신 스마트 플래그십 · 기본 추천)", shortLabel: "GPT-4.1", provider: "openai", isRecommended: true },
  { value: "gpt-6-luna", label: "⚡ GPT-6 Luna (최신 세대 · 가성비 초고속)", shortLabel: "GPT-6 Luna", provider: "openai" },
  { value: "gpt-6-sol", label: "🎯 GPT-6 Sol (최신 세대 · 균형형)", shortLabel: "GPT-6 Sol", provider: "openai" },
  { value: "gpt-6-astra", label: "💎 GPT-6 Astra (최신 세대 · 최고 품질)", shortLabel: "GPT-6 Astra", provider: "openai" },
  { value: "gpt-5.6-luna", label: "⚡ GPT-5.6 Luna (가성비 초고속 추론)", shortLabel: "GPT-5.6 Luna", provider: "openai" },
  { value: "gpt-5.6-terra", label: "🎯 GPT-5.6 Terra (균형형 자연스러운 어조)", shortLabel: "GPT-5.6 Terra", provider: "openai" },
  { value: "gpt-5.6-sol", label: "💎 GPT-5.6 Sol (최고 품질 플래그십)", shortLabel: "GPT-5.6 Sol", provider: "openai" },
  { value: "gpt-4o", label: "⚙️ GPT-4o (범용 표준 모델)", shortLabel: "GPT-4o", provider: "openai" },
  { value: "gpt-4o-mini", label: "⚡ GPT-4o-mini (초경량 빠른 응답)", shortLabel: "GPT-4o-mini", provider: "openai" },

  // 2. Claude (Anthropic) 최신 모델 라인업
  { value: "claude-sonnet-5", label: "🎯 Claude Sonnet 5 (최신 세대 · 최고품질 자연스러운 문체 · 기본 추천)", shortLabel: "Claude Sonnet 5", provider: "anthropic", isRecommended: true },
  { value: "claude-opus-5", label: "💎 Claude Opus 5 (고급형 깊은 맥락 이해)", shortLabel: "Claude Opus 5", provider: "anthropic" },
  { value: "claude-haiku-4-5", label: "⚡ Claude Haiku 4.5 (가성비 초고속)", shortLabel: "Claude Haiku 4.5", provider: "anthropic" },
  { value: "claude-3-5-sonnet-latest", label: "⚙️ Claude 3.5 Sonnet (안정형 표준)", shortLabel: "Claude 3.5 Sonnet", provider: "anthropic" },

  // 3. Gemini (Google) 최신 모델 라인업
  { value: "gemini-3.7-flash", label: "⚡ Gemini 3.7 Flash (속도와 품질 균형 · 기본 추천)", shortLabel: "Gemini 3.7 Flash", provider: "gemini", isRecommended: true },
  { value: "gemini-3.8-flash", label: "🚀 Gemini 3.8 Flash (최신 세대 · 최고 성능 Flash)", shortLabel: "Gemini 3.8 Flash", provider: "gemini" },
  { value: "gemini-3.5-flash-lite", label: "⚡ Gemini 3.5 Flash Lite (가장 빠르고 저렴)", shortLabel: "Gemini 3.5 Flash Lite", provider: "gemini" },
  { value: "gemini-2.0-flash", label: "⚙️ Gemini 2.0 Flash (안정화 표준 모델)", shortLabel: "Gemini 2.0 Flash", provider: "gemini" },
  { value: "gemini-3.1-pro-preview", label: "💎 Gemini 3.1 Pro Preview (Google 최상위 플래그십)", shortLabel: "Gemini 3.1 Pro Preview", provider: "gemini" },
];

export const DEFAULT_AI_MODELS: Record<AIModelProvider, string> = {
  openai: "gpt-4.1",
  anthropic: "claude-sonnet-5",
  gemini: "gemini-3.7-flash",
};

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
