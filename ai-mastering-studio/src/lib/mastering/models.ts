// AI 설정값 제안에 쓰는 텍스트 모델·공급사 (서버·브라우저 공용)
export type Provider = "gemini" | "openai" | "anthropic";

export const PROVIDER_LABELS: Record<Provider, string> = {
  gemini: "Google Gemini",
  openai: "OpenAI",
  anthropic: "Anthropic Claude",
};

export interface TextModel { id: string; provider: Provider; label: string }
export const TEXT_MODELS: TextModel[] = [
  { id: "gemini-2.5-flash", provider: "gemini", label: "Gemini 2.5 Flash (빠름·기본)" },
  { id: "gemini-2.5-pro", provider: "gemini", label: "Gemini 2.5 Pro (고품질)" },
  { id: "gpt-4o-mini", provider: "openai", label: "OpenAI GPT-4o mini (저렴)" },
  { id: "gpt-4o", provider: "openai", label: "OpenAI GPT-4o" },
  { id: "claude-haiku-5-5", provider: "anthropic", label: "Claude Haiku 5.5 (빠름)" },
  { id: "claude-sonnet-5-5", provider: "anthropic", label: "Claude Sonnet 5.5 (고품질)" },
];
export const DEFAULT_TEXT_MODEL = "gemini-2.5-flash";
export const textModelById = (id: string) => TEXT_MODELS.find((m) => m.id === id);
