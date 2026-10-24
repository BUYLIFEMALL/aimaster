// 이식판(U4): Gemini 제공자 — POST https://generativelanguage.googleapis.com/v1beta/models/{모델}:streamGenerateContent?alt=sse
// runStream이 쓰는 ClaudeLike 모양(client.beta.messages.stream(params, { signal }) → Anthropic 스트림 이벤트 + finalMessage)을
// 구현한다(변환은 geminiTranslate.ts). web_fetch는 OpenAI 어댑터와 같은 서버 읽기(webFetch.ts·safefetch.ts)로 직접 읽고
// 같은 스트림 안에서 대화를 이어 간다. 키는 회원 본인 키(memberAiKeys)이며 주소가 아니라 x-goog-api-key 머리글로만 보내고,
// 오류 문구·기록에서는 가린다.
import type { ClaudeLike } from './anthropic.ts';
import { scrub } from './config.ts';
import { abortError, AiError, ProviderError } from './errors.ts';
import { buildGeminiRequest, GeminiTranslator, type GeminiRequest, type PendingGeminiFetch } from './geminiTranslate.ts';
import { readSse } from './sse.ts';
import { fetchWebPage, type WebFetcher } from './webFetch.ts';

type Json = Record<string, any>;

export const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export interface GeminiDeps {
  fetch?: typeof fetch;
  webFetch?: WebFetcher;
  /** 실패한 요청을 다시 보내기 전 대기(ms) — 유료 생성 중복을 줄이려고 한 번만 */
  retryDelays?: number[];
  idleMs?: number;
}

const DEFAULT_RETRIES = [1_500];
const MAX_FETCH_ROUNDS = 8;

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(abortError());
    }, { once: true });
  });
}

/** Gemini 오류({ error: { code, message, status } }) → 원본 오류 코드 + 한국어 문구 */
export function geminiError(httpStatus: number | undefined, payload: unknown, meta: { model?: string } = {}): ProviderError {
  const p = (payload && typeof payload === 'object' ? payload : {}) as Json;
  const e = (Array.isArray(p) ? p[0]?.error : p.error) ?? p;
  const status = String(e?.status ?? '');
  const raw = typeof e?.message === 'string' ? e.message : typeof payload === 'string' ? payload : '';
  const detail = scrub(raw).replace(/\s+/g, ' ').trim().slice(0, 300);
  const st = httpStatus ?? (Number(e?.code) || undefined);
  const extra = { httpStatus: st, detail };
  if (/API[ _]?key|API_KEY_INVALID|PERMISSION_DENIED|UNAUTHENTICATED/i.test(`${status} ${detail}`) || st === 401 || st === 403) {
    return new ProviderError('invalid_key', '등록한 Gemini API 키가 거절됐습니다. 「API키등록·플랫폼연동」에서 본인 키를 확인해 주세요.', 400, extra);
  }
  if (st === 429 || status === 'RESOURCE_EXHAUSTED') {
    return new ProviderError('rate_limited', 'Gemini 사용 한도에 도달했습니다(무료 등급 키는 분당·일일 한도가 있습니다). 잠시 후 다시 시도해 주세요.', 429, extra);
  }
  if (/no longer available to new users/i.test(detail)) {
    // 2026-10-24 운영 시험: 목록에 보여도 새 사용자에게는 막힌 옛 모델(예: gemini-2.5-flash-lite)
    return new ProviderError('not_found', `Gemini 모델 ${meta.model ? `"${meta.model}"` : ''}은(는) Google이 새 사용자에게 더 이상 제공하지 않습니다. 모델 목록에서 다른 Gemini 모델(예: 최신 Flash-Lite)을 골라 주세요.`, 400, extra);
  }
  if (st === 404 || status === 'NOT_FOUND') {
    return new ProviderError('not_found', `Gemini 모델 ${meta.model ? `"${meta.model}"` : ''}을(를) 쓸 수 없습니다. 다른 모델을 골라 주세요.`, 400, extra);
  }
  if (/token count|too long|exceeds the maximum/i.test(detail)) {
    return new ProviderError('bad_request', '대화가 너무 길어 이 모델로 처리할 수 없습니다. 새 채팅을 시작하거나 첨부를 줄여 주세요.', 400, extra);
  }
  if (st === 400 || status === 'INVALID_ARGUMENT' || status === 'FAILED_PRECONDITION') {
    return new ProviderError('bad_request', `AI 비서가 이 요청을 처리하지 못했습니다. ${detail}`.trim(), 400, extra);
  }
  if ((st && st >= 500) || /UNAVAILABLE|INTERNAL|DEADLINE_EXCEEDED/.test(status)) {
    return new ProviderError('overloaded', 'AI 비서를 잠시 쓸 수 없습니다. 잠시 후 다시 시도해 주세요.', 503, extra);
  }
  return new ProviderError('unknown', 'AI 비서에 문제가 생겼습니다. 다시 시도해 주세요.', 502, extra);
}

const retryable = (e: ProviderError) => e.code === 'overloaded' || e.code === 'network';

class GeminiMessageStream {
  private gen: AsyncGenerator<Json> | null = null;
  private final: Json | null = null;
  private failure: unknown = null;

  constructor(private key: string, private params: Json, private signal: AbortSignal | undefined, private deps: GeminiDeps) {}

  [Symbol.asyncIterator](): AsyncGenerator<Json> {
    if (!this.gen) this.gen = this.run();
    return this.gen;
  }

  async finalMessage(): Promise<Json> {
    if (!this.final && !this.failure) {
      const it = this[Symbol.asyncIterator]();
      try {
        while (!(await it.next()).done) { /* drain */ }
      } catch (e) {
        this.failure ??= e;
      }
    }
    if (this.failure) throw this.failure;
    return this.final!;
  }

  private async *run(): AsyncGenerator<Json> {
    try {
      const model = String(this.params.model ?? '').replace(/^models\//, '');
      const req = buildGeminiRequest(this.params, model);
      const tr = new GeminiTranslator(req.names, model);
      yield* tr.start();
      let contents = req.body.contents as Json[];
      let fetches = 0;
      for (let round = 0; ; round++) {
        yield* this.respond({ ...req.body, contents }, tr, model);
        const pending = tr.takeFetches();
        const extra: Json[] = [];
        for (const call of pending) {
          const result = fetches++ < (req.webFetch?.maxUses ?? 0) ? await this.readPage(call, req) : { url: call.url, error: 'max_uses_exceeded' };
          if (this.signal?.aborted) throw abortError();
          const r = tr.fetchResult(call, result);
          yield* r.events;
          extra.push(...r.turn);
        }
        if (!pending.length || tr.hasToolUse() || round + 1 >= MAX_FETCH_ROUNDS) break;
        contents = [...contents, ...extra];
      }
      const fin = tr.finalMessage();
      yield { type: 'message_delta', delta: { stop_reason: fin.stop_reason, stop_sequence: null }, usage: { output_tokens: fin.usage.output_tokens } };
      yield { type: 'message_stop' };
      this.final = fin;
    } catch (e) {
      this.failure = this.signal?.aborted && !(e instanceof AiError && e.code === 'aborted') ? abortError() : e;
      throw this.failure;
    }
  }

  private async readPage(call: PendingGeminiFetch, req: GeminiRequest) {
    const reader = this.deps.webFetch ?? fetchWebPage;
    return reader({ url: call.url, allowedDomains: req.webFetch?.allowedDomains, blockedDomains: req.webFetch?.blockedDomains, knownUrls: req.knownUrls, maxChars: req.webFetch?.maxChars ?? 80_000 }, this.signal);
  }

  /** 요청 하나(아무것도 내보내기 전이면 한 번 재시도) */
  private async *respond(body: Json, tr: GeminiTranslator, model: string): AsyncGenerator<Json> {
    const delays = this.deps.retryDelays ?? DEFAULT_RETRIES;
    for (let attempt = 0; ; attempt++) {
      tr.beginRound();
      try {
        yield* this.attempt(body, tr, model);
        tr.endRound();
        return;
      } catch (e) {
        if (this.signal?.aborted) throw abortError();
        const canRetry = e instanceof ProviderError && retryable(e) && !tr.emittedThisRound && attempt < delays.length;
        if (!canRetry) throw e;
        await sleep(delays[attempt], this.signal);
      }
    }
  }

  private async *attempt(body: Json, tr: GeminiTranslator, model: string): AsyncGenerator<Json> {
    const ac = new AbortController();
    const onAbort = () => ac.abort();
    this.signal?.addEventListener('abort', onAbort, { once: true });
    const idleMs = this.deps.idleMs ?? (Number(process.env.NC_AI_IDLE_TIMEOUT_MS) || 180_000);
    let idle = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        idle = true;
        ac.abort();
      }, idleMs);
    };
    const tooSlow = () => new ProviderError('overloaded', 'AI 비서 응답이 너무 오래 걸렸습니다. 다시 시도해 주세요.', 504, { detail: 'idle timeout' });
    try {
      arm();
      let res: Response;
      try {
        res = await (this.deps.fetch ?? fetch)(`${GEMINI_BASE}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`, {
          method: 'POST',
          headers: { 'x-goog-api-key': this.key, 'content-type': 'application/json', accept: 'text/event-stream' },
          body: JSON.stringify(body),
          signal: ac.signal,
        });
      } catch (e) {
        if (this.signal?.aborted) throw abortError();
        if (idle) throw tooSlow();
        throw new ProviderError('network', 'Gemini에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.', 502, { detail: scrub(String((e as Error)?.cause ?? (e as Error)?.message ?? e)).slice(0, 200) });
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        let payload: unknown = text;
        try {
          payload = JSON.parse(text);
        } catch {
          /* plain text */
        }
        throw geminiError(res.status, payload, { model });
      }
      if (!res.body) throw new ProviderError('unknown', 'AI 비서에 문제가 생겼습니다. 다시 시도해 주세요.', 502, { detail: 'empty response body' });
      for await (const ev of readSse(timed(res.body as unknown as AsyncIterable<Uint8Array>, arm))) {
        if (!ev.data) continue;
        let data: Json;
        try {
          data = JSON.parse(ev.data);
        } catch {
          continue;
        }
        if (data.error) throw geminiError(undefined, data, { model });
        for (const out of tr.handle(data)) yield out;
      }
      if (!tr.ended) {
        if (this.signal?.aborted) throw abortError();
        if (idle) throw tooSlow();
        throw new ProviderError('overloaded', 'Gemini 연결이 중간에 끊겼습니다. 다시 시도해 주세요.', 502, { detail: 'stream ended before finishReason' });
      }
    } catch (e) {
      if (this.signal?.aborted) throw abortError();
      if (idle && !(e instanceof ProviderError)) throw tooSlow();
      if (e instanceof AiError) throw e;
      throw new ProviderError('network', 'Gemini에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.', 502, { detail: scrub(String((e as Error)?.message ?? e)).slice(0, 200) });
    } finally {
      clearTimeout(timer);
      this.signal?.removeEventListener('abort', onAbort);
    }
  }
}

async function* timed(body: AsyncIterable<Uint8Array>, onChunk: () => void): AsyncGenerator<Uint8Array> {
  for await (const chunk of body) {
    onChunk();
    yield chunk;
  }
}

/** 회원 본인 Gemini 키로 동작하는 ClaudeLike 클라이언트 */
export function geminiClient(key: string, deps: GeminiDeps = {}): ClaudeLike {
  const stream = (params: Json, opts?: { signal?: AbortSignal }) => new GeminiMessageStream(key, params, opts?.signal, deps);
  return { beta: { messages: { stream: stream as unknown as ClaudeLike['beta']['messages']['stream'] } } };
}
