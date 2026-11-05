import type { ApiKeyProvider } from "@/types/database.types";

export const PROVIDER_LABELS: Record<ApiKeyProvider, string> = {
  serpapi: "SerpApi (구글/네이버 검색결과)",
  perplexity: "Perplexity (경쟁사 리서치)",
  openai: "OpenAI (분석 리포트·키워드 확장)",
  anthropic: "Anthropic (HTML 리포트 변환, 선택)",
  naver_client_id: "네이버 검색 Client ID (제휴 타깃 찾기)",
  naver_client_secret: "네이버 검색 Client Secret (제휴 타깃 찾기)",
};
