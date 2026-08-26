import type { ApiKeyProvider } from "@/types/database.types";

export const PROVIDER_LABELS: Record<ApiKeyProvider, string> = {
  meta_app_id: "Meta App ID (인스타그램 계정 연결)",
  meta_app_secret: "Meta App Secret (인스타그램 계정 연결 + 웹훅 서명 검증)",
  openai: "OpenAI (DM 답장 초안 생성 — GPT 계열 모델 선택 시)",
  anthropic: "Anthropic Claude (DM 답장 초안 생성 — Claude 모델 선택 시)",
  gemini: "Google Gemini (DM 답장 초안 생성 — Gemini 모델 선택 시)",
};
