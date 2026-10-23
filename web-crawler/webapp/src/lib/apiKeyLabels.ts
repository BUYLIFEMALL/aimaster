// PROVIDER_LABELS는 클라이언트 컴포넌트(JobForm 등)에서도 표시용으로 써야 해서,
// "server-only"가 걸린 apiKeys.ts와 분리된 별도 파일로 둔다.
import type { ApiKeyProvider } from "@/types/database.types";

export const PROVIDER_LABELS: Record<ApiKeyProvider, string> = {
  openai: "OpenAI (GPT — 크롤링 항목 분석)",
  anthropic: "Anthropic (Claude — 크롤링 항목 분석)",
  gemini: "Google (Gemini — 크롤링 항목 분석)",
  perplexity: "Perplexity (크롤링 항목 분석)",
};
