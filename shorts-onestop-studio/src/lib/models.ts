// 텍스트(주제·대본) 모델 레지스트리 — 서버·화면 공용.
// 모델 ID는 다른 서브프로그램이 공급사 모델 목록 API로 확인해 쓰는 값만 넣는다
// (ai-auto-blog/utils/ai/contentModels.ts, cardnews-studio·ai-mastering-studio models.ts — docs/AI_MODEL_INTEGRATION_STANDARD.md).
// 기본값은 각 공급사의 가장 저렴한 모델(개발·테스트 비용 최소화 지침). 가격은 공급사 가격표 기준이라 화면에 단정해 적지 않는다.
export type AiProvider = "gemini" | "openai" | "anthropic";
export interface ModelOption { provider: AiProvider; id: string; name: string; purpose: string }

export const PROVIDER_LABEL: Record<AiProvider, string> = { gemini: "Google Gemini", openai: "OpenAI", anthropic: "Anthropic Claude" };

export const TEXT_MODELS: ModelOption[] = [
  { provider: "gemini", id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash-Lite", purpose: "빠르고 가벼운 대본 (기본)" },
  { provider: "gemini", id: "gemini-3.5-flash", name: "Gemini 3.5 Flash", purpose: "일반 대본·스토리" },
  { provider: "gemini", id: "gemini-3.8-flash", name: "Gemini 3.8 Flash", purpose: "최신 Flash · 스토리형 품질" },
  { provider: "openai", id: "gpt-4o-mini", name: "GPT-4o mini", purpose: "가벼운 대본 (기본)" },
  { provider: "openai", id: "gpt-4.1", name: "GPT-4.1", purpose: "긴 지시를 잘 따르는 대본" },
  { provider: "anthropic", id: "claude-haiku-4-5", name: "Claude Haiku 4.5", purpose: "가벼운 대본 (기본)" },
  { provider: "anthropic", id: "claude-haiku-5-5", name: "Claude Haiku 5.5", purpose: "최신 Haiku" },
  { provider: "anthropic", id: "claude-sonnet-5-5", name: "Claude Sonnet 5.5", purpose: "스토리형·고품질 대본" },
];

export const DEFAULT_MODEL: Record<AiProvider, string> = { gemini: "gemini-3.5-flash-lite", openai: "gpt-4o-mini", anthropic: "claude-haiku-4-5" };

export function isProvider(v: unknown): v is AiProvider {
  return v === "gemini" || v === "openai" || v === "anthropic";
}
export function isTextModel(provider: unknown, id: unknown): boolean {
  return TEXT_MODELS.some((m) => m.provider === provider && m.id === id);
}
export function modelName(id: string): string {
  return TEXT_MODELS.find((m) => m.id === id)?.name ?? id;
}
