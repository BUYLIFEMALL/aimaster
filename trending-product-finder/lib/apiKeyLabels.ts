import type { ApiKeyProvider } from "@/types/database.types";

export const PROVIDER_LABELS: Record<ApiKeyProvider, string> = {
  naver_client_id: "네이버클라우드 API HUB Client ID (쇼핑인사이트)",
  naver_client_secret: "네이버클라우드 API HUB Client Secret (쇼핑인사이트)",
  openai: "OpenAI (기회 점수 산정, 추천 사유 생성)",
  gemini: "Gemini (기회 점수 산정, 추천 사유 생성 — OpenAI 대체 가능)",
};
