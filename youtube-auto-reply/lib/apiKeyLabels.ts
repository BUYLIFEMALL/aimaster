import type { ApiKeyProvider } from "@/types/database.types";

export const PROVIDER_LABELS: Record<ApiKeyProvider, string> = {
  google_client_id: "Google OAuth Client ID (유튜브 채널 연결)",
  google_client_secret: "Google OAuth Client Secret (유튜브 채널 연결)",
  openai: "OpenAI (댓글 답글 초안 생성 — GPT 계열 모델 선택 시)",
  anthropic: "Anthropic Claude (댓글 답글 초안 생성 — Claude 모델 선택 시)",
  gemini: "Google Gemini (댓글 답글 초안 생성 — Gemini 모델 선택 시)",
  cronjob_org_api_key: "cron-job.org API 키 (댓글 모니터링 — 「내 cron-job.org」 방식에서만 필요)",
};
