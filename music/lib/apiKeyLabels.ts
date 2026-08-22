import type { ApiKeyProvider } from "@/types/database.types";

// apiKeys.ts는 "server-only"라 클라이언트 컴포넌트에서 직접 import할 수 없다.
// 라벨처럼 순수 상수만 여기로 분리해서 서버/클라이언트 양쪽에서 재사용한다.
export const PROVIDER_LABELS: Record<ApiKeyProvider, string> = {
  openai: "OpenAI (GPT — 곡 기획/가사)",
  anthropic: "Anthropic (Claude)",
  gemini: "Google (나노바나나 — 앨범 커버 이미지 생성, 선택)",
  perplexity: "Perplexity",
  replicate: "Replicate (FLUX)",
  suno: "Suno (api.sunoapi.org — 곡 생성)",
  json2video: "JSON2Video",
  google_client_id: "Google OAuth Client ID",
  google_client_secret: "Google OAuth Client Secret",
};
