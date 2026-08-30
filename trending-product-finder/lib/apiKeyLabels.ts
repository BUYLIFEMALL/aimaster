import type { ApiKeyProvider } from "@/types/database.types";

export const PROVIDER_LABELS: Record<ApiKeyProvider, string> = {
  naver_client_id: "네이버 개발자센터 Client ID (데이터랩+쇼핑검색 공용)",
  naver_client_secret: "네이버 개발자센터 Client Secret (데이터랩+쇼핑검색 공용)",
  openai: "OpenAI (기회 점수 산정, 추천 사유 생성)",
  gemini: "Gemini (기회 점수 산정, 추천 사유 생성 — OpenAI 대체 가능)",
};
