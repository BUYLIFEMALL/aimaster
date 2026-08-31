import type { ApiKeyProvider } from "@/types/database.types";

export const PROVIDER_LABELS: Record<ApiKeyProvider, string> = {
  naver_client_id: "네이버클라우드 API HUB Client ID (쇼핑인사이트)",
  naver_client_secret: "네이버클라우드 API HUB Client Secret (쇼핑인사이트)",
  naver_ads_api_key: "네이버 검색광고 ACCESS LICENSE (후보 상품군 추천)",
  naver_ads_secret_key: "네이버 검색광고 SECRET KEY (후보 상품군 추천)",
  naver_ads_customer_id: "네이버 검색광고 CUSTOMER ID (후보 상품군 추천)",
  aliexpress_app_key: "알리익스프레스 App Key (알리 원가 비교)",
  aliexpress_app_secret: "알리익스프레스 App Secret (알리 원가 비교)",
  aliexpress_tracking_id: "알리익스프레스 Tracking ID (알리 원가 비교)",
  openai: "OpenAI (기회 점수 산정, 추천 사유 생성)",
  gemini: "Gemini (기회 점수 산정, 추천 사유 생성 — OpenAI 대체 가능)",
};
