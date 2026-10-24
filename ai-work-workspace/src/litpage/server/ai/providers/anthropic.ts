// Anthropic provider: the Claude API through the official SDK (ANTHROPIC_API_KEY, optional ANTHROPIC_BASE_URL — the
// e2e mock). runStream (../client.ts) speaks this SDK's streaming surface natively; other providers adapt to it.
import Anthropic, {
  APIConnectionError, APIError, APIUserAbortError, AuthenticationError, BadRequestError, InternalServerError, NotFoundError,
  PermissionDeniedError, RateLimitError,
} from '@anthropic-ai/sdk';
import { AiError } from './errors.ts';
import { keyVariable, scrub } from './config.ts';

/** Minimal surface of the SDK the runner uses (other providers and unit tests implement it). */
export interface ClaudeLike {
  beta: { messages: { stream: Anthropic['beta']['messages']['stream'] } };
}

let cached: { key: string; client: Anthropic } | null = null;

export function anthropicClient(key: string): ClaudeLike {
  if (!cached || cached.key !== key) {
    // authToken: null so a stray ANTHROPIC_AUTH_TOKEN is never sent alongside the key (that 401s)
    cached = { key, client: new Anthropic({ apiKey: key, authToken: null, maxRetries: 2 }) };
  }
  return cached.client;
}

export function cleanApiMessage(e: APIError): string {
  const m = (e.error as any)?.error?.message ?? (e.error as any)?.message ?? '';
  return typeof m === 'string' ? m.slice(0, 300) : '';
}

/** SDK error → AiError with a provider-neutral message (null when `e` isn't an SDK error). */
export function mapAnthropicError(e: unknown, model: string): AiError | null {
  if (e instanceof APIUserAbortError) return new AiError('aborted', 'Stopped.', 499);
  if (e instanceof AuthenticationError) {
    return new AiError('invalid_key', '등록한 Claude API 키가 거절됐습니다. 「API키등록·플랫폼연동」에서 본인 키를 확인해 주세요.', 400);
  }
  if (e instanceof PermissionDeniedError) return new AiError('permission', 'This API key isn’t allowed to use the configured model.', 403);
  if (e instanceof NotFoundError) return new AiError('not_found', `The model "${model}" isn’t available from the AI provider.`, 400);
  if (e instanceof RateLimitError) return new AiError('rate_limited', 'AI 비서에 요청이 몰리고 있습니다. 잠시 후 다시 시도해 주세요.', 429);
  if (e instanceof InternalServerError) return new AiError('overloaded', 'AI 비서를 잠시 쓸 수 없습니다. 잠시 후 다시 시도해 주세요.', 503);
  if (e instanceof BadRequestError) return new AiError('bad_request', `AI 비서가 이 요청을 처리하지 못했습니다. ${scrub(cleanApiMessage(e))}`.trim(), 400);
  if (e instanceof APIConnectionError) return new AiError('network', 'Couldn’t reach the AI provider. Check the server’s network connection.', 502);
  if (e instanceof APIError) {
    if (e.status === 529) return new AiError('overloaded', 'AI 비서 사용량이 많아 잠시 쓸 수 없습니다. 잠시 후 다시 시도해 주세요.', 503);
    return new AiError('unknown', 'AI 비서에 문제가 생겼습니다. 다시 시도해 주세요.', 502);
  }
  return null;
}

/** status / request id of an SDK error, for logs. */
export function anthropicErrorMeta(e: unknown): { status?: number; requestId?: string; sdk: boolean } {
  return e instanceof APIError ? { status: e.status, requestId: e.requestID ?? undefined, sdk: true } : { sdk: false };
}

export { APIUserAbortError, BadRequestError };
