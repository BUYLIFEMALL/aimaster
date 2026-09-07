import type { ApiKeyProvider } from "@/types/database.types";

// apiKeys.ts는 "server-only"라 클라이언트 컴포넌트(ApiKeyRow 등)에서 직접 import할 수
// 없다. 라벨처럼 순수 상수만 여기로 분리해서 서버/클라이언트 양쪽에서 재사용한다.
export const PROVIDER_LABELS: Record<ApiKeyProvider, string> = {
  openai: "OpenAI (GPT — 콘텐츠 생성)",
  anthropic: "Anthropic (Claude)",
  gemini: "Google (Gemini)",
  perplexity: "Perplexity (실시간 뉴스/정보 검색)",
};
