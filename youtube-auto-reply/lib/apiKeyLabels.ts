import type { ApiKeyProvider } from "@/types/database.types";

export const PROVIDER_LABELS: Record<ApiKeyProvider, string> = {
  google_client_id: "Google OAuth Client ID (유튜브 채널 연결)",
  google_client_secret: "Google OAuth Client Secret (유튜브 채널 연결)",
  openai: "OpenAI (댓글 답글 초안 생성)",
};
