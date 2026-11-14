import type { ApiKeyProvider } from "@/types/database.types";

// apiKeys.ts는 "server-only"라 클라이언트 컴포넌트(ApiKeyRow 등)에서 직접 import할 수
// 없다. 라벨처럼 순수 상수만 여기로 분리해서 서버/클라이언트 양쪽에서 재사용한다.
export const PROVIDER_LABELS: Record<ApiKeyProvider, string> = {
  openai: "OpenAI (GPT — 리포트 글 정리, 기본)",
  anthropic: "Anthropic (Claude — 리포트 글 정리, 주제에서 Claude 모델을 고른 경우)",
  gemini: "Google (Gemini)",
  perplexity: "Perplexity (실시간 뉴스/정보 검색)",
  kakao_rest_api_key: "카카오 REST API 키 (카카오 로그인 연동)",
  kakao_client_secret: "카카오 Client Secret (선택)",
  kakao_js_key: "카카오 JavaScript 키 (리포트 「카카오톡 공유」 버튼)",
  cronjob_org_api_key: "cron-job.org API 키 (정기 자동 생성 — 「내 cron-job.org」 방식에서만 필요)",
};
