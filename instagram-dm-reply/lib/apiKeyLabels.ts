import type { ApiKeyProvider } from "@/types/database.types";

export const PROVIDER_LABELS: Record<ApiKeyProvider, string> = {
  meta_app_id: "Instagram 앱 ID",
  meta_app_secret: "Instagram 앱 시크릿 코드",
  openai: "OpenAI (DM 답장 초안 생성 — GPT 계열 모델 선택 시)",
  anthropic: "Anthropic Claude (DM 답장 초안 생성 — Claude 모델 선택 시)",
  gemini: "Google Gemini (DM 답장 초안 생성 — Gemini 모델 선택 시)",
};
