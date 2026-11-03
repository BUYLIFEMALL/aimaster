// AI 설정값 제안에 쓰는 텍스트 모델·공급사 (서버·브라우저 공용)
export type Provider = "gemini" | "openai" | "anthropic";

export const PROVIDER_LABELS: Record<Provider, string> = {
  gemini: "Google Gemini",
  openai: "OpenAI",
  anthropic: "Anthropic Claude",
};

export interface TextModel { id: string; provider: Provider; label: string }
export const TEXT_MODELS: TextModel[] = [
  { id: "gemini-3.8-flash", provider: "gemini", label: "Gemini 3.8 Flash (빠름·기본)" },
  { id: "gemini-3.5-flash-lite", provider: "gemini", label: "Gemini 3.5 Flash-Lite (저렴)" },
  { id: "gemini-4-argon", provider: "gemini", label: "Gemini 4 Argon (최고 품질)" },
  { id: "gpt-6-luna", provider: "openai", label: "GPT-6 Luna (저렴)" },
  { id: "gpt-6.1-terra", provider: "openai", label: "GPT-6.1 Terra (빠름)" },
  { id: "gpt-6.1-sol", provider: "openai", label: "GPT-6.1 Sol (고품질)" },
  { id: "gpt-6-astra", provider: "openai", label: "GPT-6 Astra (최고 품질)" },
  { id: "gpt-4o-mini", provider: "openai", label: "GPT-4o mini (이전 모델)" },
  { id: "gpt-4o", provider: "openai", label: "GPT-4o (이전 모델)" },
  { id: "claude-haiku-5-5", provider: "anthropic", label: "Claude Haiku 5.5 (빠름·저렴)" },
  { id: "claude-sonnet-5-5", provider: "anthropic", label: "Claude Sonnet 5.5 (고품질)" },
  { id: "claude-opus-5-5", provider: "anthropic", label: "Claude Opus 5.5 (더 높은 품질)" },
  { id: "claude-fable-5-1", provider: "anthropic", label: "Claude Fable 5.1 (최고 품질)" },
];
export const DEFAULT_TEXT_MODEL = "gemini-3.8-flash";
// 2026-11-03 종료·자동 연결되는 옛 글 모델(Gemini 2.5, 12-01)은 새 모델로 바꿔 찾는다 — 저장된 옛 값도 새 모델로 호출된다.
const LEGACY_TEXT_MODEL: Record<string, string> = {
  "gemini-2.5-flash": "gemini-3.8-flash", "gemini-2.5-pro": "gemini-3.8-flash", "gemini-2.5-flash-lite": "gemini-3.5-flash-lite",
};
export const textModelById = (id: string) => TEXT_MODELS.find((m) => m.id === (LEGACY_TEXT_MODEL[id] ?? id));
