// WS-20261117-24 E3-4 보완(Master msg_ed1c82784a1b) — 요청 옵션 maxRetries: 0이 공급자별로 실제 HTTP 시도 1번이 되는지.
// 모든 통신은 주입한 가짜 fetch(실제 네트워크·실제 키 0). Anthropic은 실제 SDK(가짜 키) + 가짜 fetch.
// 확인: 옵션 0 → 1번 / 옵션 없음 → 기존 재시도 그대로(OpenAI 3번·Gemini 2번·Anthropic SDK 3번) / 요청 본문 같음 / 중단 신호 그대로 / 기본 deps 객체 안 바뀜.
import { describe, expect, it } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import { openaiClient } from '@/litpage/server/ai/providers/openai.ts';
import { geminiClient } from '@/litpage/server/ai/providers/gemini.ts';

type Json = Record<string, any>;
/** Anthropic SSE 형식(event: 줄 + data: 줄) */
const sse = (chunks: Json[]) => chunks.map((c) => `event: ${c.type}\ndata: ${JSON.stringify(c)}\n\n`).join('');
function fakeFetch(make: (i: number) => Response) {
  const calls: { url: string; body: string; signal?: AbortSignal | null }[] = [];
  const f = (async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), body: String(init?.body ?? ''), signal: init?.signal });
    return make(calls.length - 1);
  }) as unknown as typeof fetch;
  return { f, calls };
}
const json503 = () => new Response(JSON.stringify({ error: { code: 503, status: 'UNAVAILABLE', message: 'overloaded', type: 'server_error' } }), { status: 503, headers: { 'content-type': 'application/json' } });
async function drain(stream: any) {
  try {
    for await (const _ of stream) { /* 끝까지 */ }
    await stream.finalMessage?.();
    return null;
  } catch (e) {
    return e as any;
  }
}
const PARAMS = { model: 'test-model', max_tokens: 10, messages: [{ role: 'user', content: '시험' }] } as any;

describe('OpenAI 어댑터', () => {
  const cfg = { baseUrl: 'https://openai.fake.test/v1', apiKey: 'sk-fake-not-real' };
  it('maxRetries: 0 → 503에도 HTTP 1번, 오류 그대로', async () => {
    const a = fakeFetch(json503);
    const err = await drain(openaiClient(cfg, { fetch: a.f }).beta.messages.stream(PARAMS, { maxRetries: 0 } as any));
    expect(err?.code).toBe('overloaded');
    expect(a.calls).toHaveLength(1);
  });
  it('옵션 없음 → 기존 재시도 그대로(기본 [700, 2000] → 3번)', async () => {
    const a = fakeFetch(json503);
    const deps = { fetch: a.f };
    const err = await drain(openaiClient(cfg, deps).beta.messages.stream(PARAMS));
    expect(err?.code).toBe('overloaded');
    expect(a.calls).toHaveLength(3);
    expect(deps).toEqual({ fetch: a.f }); // 기본 deps 객체를 바꾸지 않음
  }, 15_000);
  it('같은 클라이언트에서 옵션 0 요청 뒤에도 다른 요청은 기존 재시도(공유 상태 안 바뀜)·요청 본문 같음', async () => {
    const a = fakeFetch(json503);
    const c = openaiClient(cfg, { fetch: a.f, retryDelays: [1, 1] });
    await drain(c.beta.messages.stream(PARAMS, { maxRetries: 0 } as any));
    await drain(c.beta.messages.stream(PARAMS));
    expect(a.calls).toHaveLength(1 + 3);
    expect(a.calls[0].body).toBe(a.calls[1].body);
  });
  it('중단 신호는 그대로 전달', async () => {
    const a = fakeFetch(json503);
    const ac = new AbortController();
    await drain(openaiClient(cfg, { fetch: a.f }).beta.messages.stream(PARAMS, { maxRetries: 0, signal: ac.signal } as any));
    expect(a.calls[0].signal).toBeTruthy();
  });
});

describe('Gemini 어댑터', () => {
  const KEY = 'AIzaFake-not-real-0000000000000000000';
  it('maxRetries: 0 → 503에도 HTTP 1번', async () => {
    const a = fakeFetch(json503);
    const err = await drain(geminiClient(KEY, { fetch: a.f }).beta.messages.stream({ ...PARAMS, model: 'gemini-test-flash' }, { maxRetries: 0 } as any));
    expect(err?.code).toBe('overloaded');
    expect(a.calls).toHaveLength(1);
  });
  it('옵션 없음 → 기존 재시도 그대로(기본 [1500] → 2번)·요청 본문 같음', async () => {
    const a = fakeFetch(json503);
    await drain(geminiClient(KEY, { fetch: a.f }).beta.messages.stream({ ...PARAMS, model: 'gemini-test-flash' }));
    expect(a.calls).toHaveLength(2);
    const b = fakeFetch(json503);
    await drain(geminiClient(KEY, { fetch: b.f }).beta.messages.stream({ ...PARAMS, model: 'gemini-test-flash' }, { maxRetries: 0 } as any));
    expect(b.calls[0].body).toBe(a.calls[0].body);
  }, 15_000);
});

describe('Anthropic 실제 SDK(가짜 키·가짜 fetch)', () => {
  // 529 + retry-after-ms: 1 → SDK 재시도 대기를 1ms로(시험 시간 최소)
  const r529 = () => new Response(JSON.stringify({ type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } }), { status: 529, headers: { 'content-type': 'application/json', 'retry-after-ms': '1' } });
  const make = (f: typeof fetch) => new Anthropic({ apiKey: 'sk-ant-fake-not-real', authToken: null, maxRetries: 2, fetch: f, baseURL: 'https://anthropic.fake.test' });
  it('클라이언트 maxRetries: 2 그대로 + 요청 옵션 maxRetries: 0 → HTTP 1번', async () => {
    const a = fakeFetch(r529);
    const err = await drain(make(a.f).beta.messages.stream(PARAMS, { maxRetries: 0 }));
    expect(err).toBeTruthy();
    expect(a.calls).toHaveLength(1);
    expect(a.calls[0].url).toContain('anthropic.fake.test');
  });
  it('요청 옵션 없음 → SDK 기본 재시도 그대로(1 + 2 = 3번)', async () => {
    const a = fakeFetch(r529);
    const err = await drain(make(a.f).beta.messages.stream(PARAMS));
    expect(err).toBeTruthy();
    expect(a.calls).toHaveLength(3);
  });
  it('성공 응답은 1번으로 정상 처리(옵션 0이 정상 흐름을 막지 않음)', async () => {
    const ok = () => new Response(sse([
      { type: 'message_start', message: { id: 'm', type: 'message', role: 'assistant', model: 'test-model', content: [], stop_reason: null, usage: { input_tokens: 1, output_tokens: 0 } } },
      { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: '됐습니다' } },
      { type: 'content_block_stop', index: 0 },
      { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 1 } },
      { type: 'message_stop' },
    ]), { status: 200, headers: { 'content-type': 'text/event-stream' } });
    const a = fakeFetch(ok);
    const s = make(a.f).beta.messages.stream(PARAMS, { maxRetries: 0 });
    const final = await s.finalMessage();
    expect((final.content[0] as any).text).toBe('됐습니다');
    expect(a.calls).toHaveLength(1);
  });
});
