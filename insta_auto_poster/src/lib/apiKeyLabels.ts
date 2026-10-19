import type { ApiKeyProvider } from "@/types/database.types";

// apiKeys.ts는 "server-only"라 클라이언트 컴포넌트(PostForm 등)에서 직접 import할 수
// 없다. 라벨처럼 순수 상수만 여기로 분리해서 서버/클라이언트 양쪽에서 재사용한다.
export const PROVIDER_LABELS: Record<ApiKeyProvider, string> = {
  openai: "OpenAI (GPT — 게시글/캡션 생성)",
  anthropic: "Anthropic (Claude)",
  gemini: "Google (Gemini — 카드뉴스 이미지 생성)",
  perplexity: "Perplexity (실시간 주제 수집)",
  meta_app_id: "Instagram 앱 ID",
  meta_app_secret: "Instagram 앱 시크릿 코드",
  facebook_app_id: "Facebook 앱 ID (Facebook 페이지 방식)",
  facebook_app_secret: "Facebook 앱 시크릿 코드 (Facebook 페이지 방식)",
  cronjob_org_api_key: "cron-job.org API 키 (예약 발행 — 「내 cron-job.org」 방식에서만 필요)",
};
