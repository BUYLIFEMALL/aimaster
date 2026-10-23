// Which model provider AI uses, read from the environment on every call (keys are never cached or logged):
//   NC_AI_PROVIDER = openai | anthropic | none   explicit choice; otherwise
//   openai   when OPENAI_API_KEY is set (POST {base}/responses, GET {base}/models), else
//   anthropic  when ANTHROPIC_API_KEY is set (Claude API, optional ANTHROPIC_BASE_URL), else
//   none       AI shows its "connect a provider" state.
// `pnpm dev` (apps/server) loads apps/server/.env.local (gitignored) with `node --env-file-if-exists`; variables already
// set in the environment win over the file.

export type ProviderId = 'openai' | 'anthropic' | 'none';

export interface OpenAIConfig {
  /** e.g. https://api.openai.com/v1 (no trailing slash) */
  baseUrl: string;
  apiKey: string;
}

// ★ 이식판(AIMaster 최상위 규칙: 회원 본인 키만 사용) ★
// 원본은 서버 환경변수의 키 하나를 모든 사용자가 같이 썼다. 이식판은 운영에서 환경변수 키를 절대 읽지 않는다.
// 키는 요청마다 그 회원 본인의 키(user_api_keys)만 memberAiKeys에 넣어 쓴다(2단계에서 연결). 없으면 AI는 꺼진 상태.
// AWW_TEST_ENV_AI_KEYS=1은 원본 시험(가짜 키 + 로컬 가짜 서버) 전용이며 운영·개발 서버에는 설정하지 않는다.
import { AsyncLocalStorage } from 'node:async_hooks';

export interface MemberAiKeys {
  provider?: 'openai' | 'anthropic';
  openaiKey?: string;
  anthropicKey?: string;
}
const memberKeys = new AsyncLocalStorage<MemberAiKeys>();

/** 이 요청을 보낸 회원 본인의 AI 키로 fn을 실행한다(서버 라우트에서 회원 키를 읽은 뒤 호출). */
export function withMemberAiKeys<T>(keys: MemberAiKeys, fn: () => T): T {
  return memberKeys.run(keys, fn);
}

const ENV_KEYS_FOR_TESTS = process.env.AWW_TEST_ENV_AI_KEYS === '1' && process.env.NODE_ENV !== 'production';
const env = (name: string): string => {
  if (/(_API_KEY|_AUTH_TOKEN|_BASE_URL)$/.test(name) && !ENV_KEYS_FOR_TESTS) return '';
  return process.env[name]?.trim() ?? '';
};

export function anthropicKey(): string | null {
  const member = memberKeys.getStore()?.anthropicKey?.trim();
  if (member) return member;
  return env('ANTHROPIC_API_KEY') || null;
}

export function openaiConfig(): OpenAIConfig | null {
  const member = memberKeys.getStore()?.openaiKey?.trim();
  if (member) return { baseUrl: 'https://api.openai.com/v1', apiKey: member };
  const baseUrl = (env('OPENAI_BASE_URL') || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const apiKey = env('OPENAI_API_KEY');
  return baseUrl && apiKey ? { baseUrl, apiKey } : null;
}

let warnedValue = '';

export function providerId(): ProviderId {
  const keys = memberKeys.getStore();
  if (keys?.provider === 'openai' && keys.openaiKey) return 'openai';
  if (keys?.provider === 'anthropic' && keys.anthropicKey) return 'anthropic';
  const raw = env('NC_AI_PROVIDER').toLowerCase();
  if (raw) {
    if (raw === 'openai' || raw === 'openai-compatible') return 'openai';
    if (raw === 'anthropic' || raw === 'claude') return 'anthropic';
    if (raw !== 'none' && raw !== 'off' && warnedValue !== raw) {
      warnedValue = raw;
      console.warn(`[ai] unknown NC_AI_PROVIDER "${raw.slice(0, 40)}": Litpage AI is off (use openai, anthropic or none)`);
    }
    return 'none';
  }
  if (openaiConfig()) return 'openai';
  if (anthropicKey()) return 'anthropic';
  return 'none';
}

/** The selected provider has everything it needs to make calls. */
export function providerConfigured(p: ProviderId = providerId()): boolean {
  if (p === 'openai') return openaiConfig() !== null;
  if (p === 'anthropic') return anthropicKey() !== null;
  return false;
}

/** Environment variable holding the selected provider's key (named in admin-facing error messages). */
export function keyVariable(p: ProviderId = providerId()): string {
  return p === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY';
}

/** Every configured secret value, whichever provider is active (scrubbed from logs and error texts). */
export function providerSecrets(): string[] {
  const keys = memberKeys.getStore();
  return [env('ANTHROPIC_API_KEY'), env('OPENAI_API_KEY'), env('ANTHROPIC_AUTH_TOKEN'), keys?.openaiKey ?? '', keys?.anthropicKey ?? ''].filter((k) => k.length >= 8);
}

/** Remove anything key-like from text before it is logged or returned (configured keys, OpenAI and Anthropic keys, bearer tokens). */
export function scrub(text: string): string {
  let out = text;
  for (const k of providerSecrets()) out = out.split(k).join('[redacted]');
  return out
    .replace(/sk-ant-[A-Za-z0-9_-]{8,}/g, 'sk-ant-[redacted]')
    .replace(/sk-proj-[A-Za-z0-9_-]{8,}/g, 'sk-proj-[redacted]')
    .replace(/sk-(?!ant-|proj-)[A-Za-z0-9_-]{8,}/g, 'sk-[redacted]')
    .replace(/\b(Bearer\s+)[A-Za-z0-9._~+/=-]{12,}/gi, '$1[redacted]');
}
