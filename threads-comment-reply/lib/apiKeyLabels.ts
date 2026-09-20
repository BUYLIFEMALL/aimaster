import type { ApiKeyProvider } from "@/types/database.types";

export const PROVIDER_LABELS: Record<ApiKeyProvider, string> = {
  meta_app_id: "Threads 앱 ID (쓰레드 계정 연결)",
  meta_app_secret: "Threads 앱 시크릿 코드 (쓰레드 계정 연결)",
  openai: "OpenAI (댓글 답글 초안 생성 — GPT 계열 모델 선택 시)",
  anthropic: "Anthropic Claude (댓글 답글 초안 생성 — Claude 모델 선택 시)",
  gemini: "Google Gemini (댓글 답글 초안 생성 — Gemini 모델 선택 시)",
};
