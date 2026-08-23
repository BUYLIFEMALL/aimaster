import type { ApiKeyProvider } from "@/types/database.types";

export const PROVIDER_LABELS: Record<ApiKeyProvider, string> = {
  serpapi: "SerpApi (구글/네이버 검색결과)",
  openai: "OpenAI (관련·롱테일 키워드 추출, 작업 지시 생성)",
};
