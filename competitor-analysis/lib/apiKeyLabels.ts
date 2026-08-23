import type { ApiKeyProvider } from "@/types/database.types";

export const PROVIDER_LABELS: Record<ApiKeyProvider, string> = {
  serpapi: "SerpApi (구글/네이버 검색결과)",
  perplexity: "Perplexity (경쟁사 리서치)",
  openai: "OpenAI (분석 리포트)",
  anthropic: "Anthropic (HTML 리포트 변환, 선택)",
};
