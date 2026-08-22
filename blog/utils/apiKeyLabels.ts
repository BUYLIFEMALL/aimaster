// apiKeys.ts는 "server-only"라 클라이언트 컴포넌트에서 직접 import할 수 없다.
// 라벨/마스킹처럼 순수 상수·함수만 여기로 분리해서 서버/클라이언트 양쪽에서 재사용한다
// (music/threads 등 다른 서브프로젝트와 동일한 패턴).
export type ApiKeyProvider = 'openai' | 'anthropic' | 'gemini' | 'perplexity'

export const PROVIDER_LABELS: Record<ApiKeyProvider, string> = {
  openai: 'OpenAI (GPT — 콘텐츠 생성/수집)',
  anthropic: 'Anthropic (Claude)',
  gemini: 'Google (Gemini — 이미지 자동생성)',
  perplexity: 'Perplexity (실시간 주제 수집)',
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return '••••••••'
  return `${key.slice(0, 6)}${'•'.repeat(8)}${key.slice(-4)}`
}
