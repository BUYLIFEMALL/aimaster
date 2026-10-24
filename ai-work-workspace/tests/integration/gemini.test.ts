// U4: Gemini 제공자 — 요청 변환·스트림 글자·도구 호출 왕복(생각 서명)·오류 문구·재시도·키가 주소에 안 들어감·
// 모델 목록(기본 Flash·빠른 작업 Flash-Lite)·모델별 제공자 선택. 모두 가짜 fetch로 돌며 실제 Google 서버에는 가지 않는다(비용 없음).
import { afterEach, describe, expect, it } from 'vitest';
import { buildGeminiRequest } from '@/litpage/server/ai/providers/geminiTranslate.ts';
import { geminiClient, geminiError } from '@/litpage/server/ai/providers/gemini.ts';
import { parseGeminiModels, pickGemini, setGeminiModelsFetch, warmGeminiModels } from '@/litpage/server/ai/providers/geminiModels.ts';
import { availableProviders, providerForModel, scrub, withMemberAiKeys } from '@/litpage/server/ai/providers/config.ts';
import * as models from '@/litpage/server/ai/models.ts';

type Json = Record<string, any>;
const KEY = 'AIzaSyTest-member-own-key-0123456789';

function sse(chunks: Json[]): string {
  return chunks.map((c) => `data: ${JSON.stringify(c)}\r\n\r\n`).join('');
}
function streamOf(text: string, size = 23): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    pull(ctrl) {
      if (i >= text.length) return ctrl.close();
      ctrl.enqueue(enc.encode(text.slice(i, i + size)));
      i += size;
    },
  });
}

interface Call { url: string; headers: Record<string, string>; body: Json }
function fakeFetch(responses: (() => Response)[]) {
  const calls: Call[] = [];
  const f = (async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) });
    const next = responses.shift();
    if (!next) throw new Error('no more fake responses');
    return next();
  }) as unknown as typeof fetch;
  return { f, calls };
}
const ok = (chunks: Json[]) => () => new Response(streamOf(sse(chunks)), { status: 200, headers: { 'content-type': 'text/event-stream' } });
const fail = (status: number, error: Json) => () => new Response(JSON.stringify({ error }), { status, headers: { 'content-type': 'application/json' } });

async function collect(stream: any) {
  const events: Json[] = [];
  for await (const ev of stream) events.push(ev);
  return { events, final: await stream.finalMessage() };
}

const textOf = (events: Json[]) => events.filter((e) => e.delta?.type === 'text_delta').map((e) => e.delta.text).join('');

describe('Gemini 요청 변환(U4)', () => {
  it('지시문·도구·글자 수 한도를 Gemini 형식으로 바꾸고 웹 검색은 뺀다', () => {
    const r = buildGeminiRequest({
      model: 'gemini-3-flash',
      system: [{ type: 'text', text: '당신은 AI 비서입니다.' }],
      max_tokens: 200_000,
      messages: [{ role: 'user', content: '안녕하세요' }],
      tools: [
        { name: 'create_page', description: '페이지 만들기', input_schema: { type: 'object', properties: { title: { type: 'string' } } } },
        { type: 'web_search_20260209', name: 'web_search' },
        { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 3 },
      ],
      output_config: { effort: 'low' },
    }, 'gemini-3-flash');
    expect(r.body.systemInstruction).toEqual({ parts: [{ text: '당신은 AI 비서입니다.' }] });
    expect(r.body.contents).toEqual([{ role: 'user', parts: [{ text: '안녕하세요' }] }]);
    expect(r.body.tools[0].functionDeclarations.map((d: Json) => d.name)).toEqual(['create_page', 'web_fetch']);
    expect(r.body.generationConfig).toEqual({ maxOutputTokens: 65_536, thinkingConfig: { thinkingLevel: 'low' } });
    expect(r.webSearchDropped).toBe(true);
    expect(r.webFetch?.maxUses).toBe(3);
  });

  it('Gemini 2.x 모델에는 thinkingLevel을 보내지 않는다', () => {
    const r = buildGeminiRequest({ messages: [{ role: 'user', content: 'x' }], max_tokens: 100 }, 'gemini-2.5-flash');
    expect(r.body.generationConfig).toEqual({ maxOutputTokens: 100 });
  });
});

describe('Gemini 스트림(U4)', () => {
  it('글자 조각을 원본 이벤트로 바꾸고, 키는 주소가 아니라 머리글로만 보낸다', async () => {
    const { f, calls } = fakeFetch([ok([
      { candidates: [{ content: { role: 'model', parts: [{ text: '올해는 ' }] } }], modelVersion: 'gemini-test-flash' },
      { candidates: [{ content: { role: 'model', parts: [{ text: '2026년입니다.' }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 5, thoughtsTokenCount: 2 } },
    ])]);
    const client = geminiClient(KEY, { fetch: f });
    const { events, final } = await collect(client.beta.messages.stream({ model: 'gemini-test-flash', max_tokens: 100, messages: [{ role: 'user', content: '올해는?' }] } as any));
    expect(textOf(events)).toBe('올해는 2026년입니다.');
    expect(events[0].type).toBe('message_start');
    expect(events.at(-1)?.type).toBe('message_stop');
    expect(final.stop_reason).toBe('end_turn');
    expect(final.usage).toMatchObject({ input_tokens: 12, output_tokens: 7 });
    expect(calls[0].url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-test-flash:streamGenerateContent?alt=sse');
    expect(calls[0].url).not.toContain(KEY);
    expect(calls[0].headers['x-goog-api-key']).toBe(KEY);
  });

  it('도구 호출은 tool_use로 끝나고, 생각 서명이 다음 요청의 functionCall에 그대로 돌아간다', async () => {
    const { f } = fakeFetch([ok([
      { candidates: [{ content: { role: 'model', parts: [{ functionCall: { name: 'create_page', args: { title: '회의록' } }, thoughtSignature: 'sig-abc' }] }, finishReason: 'STOP' }] },
    ])]);
    const client = geminiClient(KEY, { fetch: f });
    const tools = [{ name: 'create_page', description: '페이지 만들기', input_schema: { type: 'object', properties: { title: { type: 'string' } } } }];
    const { final } = await collect(client.beta.messages.stream({ model: 'gemini-test-flash', max_tokens: 100, tools, messages: [{ role: 'user', content: '회의록 페이지 만들어 줘' }] } as any));
    expect(final.stop_reason).toBe('tool_use');
    const tu = final.content.find((b: Json) => b.type === 'tool_use');
    expect(tu).toMatchObject({ name: 'create_page', input: { title: '회의록' }, _gemini: { signature: 'sig-abc' } });

    const next = buildGeminiRequest({
      tools,
      messages: [
        { role: 'user', content: '회의록 페이지 만들어 줘' },
        { role: 'assistant', content: final.content },
        { role: 'user', content: [{ type: 'tool_result', tool_use_id: tu.id, content: '만들었습니다' }] },
      ],
    }, 'gemini-test-flash');
    expect(next.body.contents[1]).toEqual({ role: 'model', parts: [{ functionCall: { name: 'create_page', args: { title: '회의록' } }, thoughtSignature: 'sig-abc' }] });
    expect(next.body.contents[2]).toEqual({ role: 'user', parts: [{ functionResponse: { name: 'create_page', response: { result: '만들었습니다' } } }] });
  });

  it('안전 차단은 refusal로 끝낸다', async () => {
    const { f } = fakeFetch([ok([{ candidates: [{ finishReason: 'SAFETY' }] }])]);
    const { final } = await collect(geminiClient(KEY, { fetch: f }).beta.messages.stream({ model: 'gemini-test-flash', max_tokens: 10, messages: [{ role: 'user', content: 'x' }] } as any));
    expect(final.stop_reason).toBe('refusal');
  });

  it('일시 장애(503)는 한 번만 다시 보내고, 키 거절은 다시 보내지 않고 한국어로 안내한다', async () => {
    const a = fakeFetch([fail(503, { code: 503, status: 'UNAVAILABLE', message: 'overloaded' }), ok([{ candidates: [{ content: { parts: [{ text: '됐습니다' }] }, finishReason: 'STOP' }] }])]);
    const r = await collect(geminiClient(KEY, { fetch: a.f, retryDelays: [1] }).beta.messages.stream({ model: 'gemini-test-flash', max_tokens: 10, messages: [{ role: 'user', content: 'x' }] } as any));
    expect(textOf(r.events)).toBe('됐습니다');
    expect(a.calls).toHaveLength(2);

    const b = fakeFetch([fail(400, { code: 400, status: 'INVALID_ARGUMENT', message: `API key not valid. key=${KEY}` })]);
    const stream = geminiClient(KEY, { fetch: b.f, retryDelays: [1] }).beta.messages.stream({ model: 'gemini-test-flash', max_tokens: 10, messages: [{ role: 'user', content: 'x' }] } as any);
    const err = await collect(stream).catch((e) => e);
    expect(err.code).toBe('invalid_key');
    expect(err.message).toContain('Gemini API 키가 거절됐습니다');
    expect(JSON.stringify(err)).not.toContain(KEY);
    expect(b.calls).toHaveLength(1);
  });

  it('오류 코드 매핑: 한도 초과·모델 없음', () => {
    expect(geminiError(429, { error: { status: 'RESOURCE_EXHAUSTED', message: 'quota' } }).code).toBe('rate_limited');
    expect(geminiError(404, { error: { status: 'NOT_FOUND', message: 'model' } }, { model: 'gemini-x' }).code).toBe('not_found');
  });

  it('기록에 남는 글에서 Gemini 키 모양을 가린다', () => {
    expect(scrub('key AIzaSyAbcdefghijklmnopqrstuvwxyz012')).toBe('key AIza[redacted]');
    expect(scrub('new AQ.Ab8RN6abcdefghijklmnopqrstu end')).toBe('new AQ.[redacted] end');
  });
});

describe('Gemini 모델 목록과 제공자 선택(U4)', () => {
  const LIST = {
    models: [
      { name: 'models/gemini-2.5-flash', displayName: 'Gemini 2.5 Flash', supportedGenerationMethods: ['generateContent', 'countTokens'] },
      { name: 'models/gemini-2.5-flash-lite', displayName: 'Gemini 2.5 Flash-Lite', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-2.5-pro', displayName: 'Gemini 2.5 Pro', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-3-flash-preview', displayName: 'Gemini 3 Flash Preview', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-2.5-flash-image', displayName: 'Nano Banana', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-2.5-flash-preview-tts', displayName: 'TTS', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-embedding-001', displayName: 'Embedding', supportedGenerationMethods: ['embedContent'] },
      { name: 'models/gemini-flash-latest', displayName: 'alias', supportedGenerationMethods: ['generateContent'] },
    ],
  };
  afterEach(() => setGeminiModelsFetch(null));

  it('글 생성 모델만 남기고, 추천은 정식판(Flash·Flash-Lite·Pro)', () => {
    const list = parseGeminiModels(LIST);
    expect(list.map((m) => m.slug)).toEqual(['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro']);
    expect(pickGemini(list, 'flash')?.slug).toBe('gemini-2.5-flash');
    expect(pickGemini(list, 'flash-lite')?.slug).toBe('gemini-2.5-flash-lite');
  });

  it('Gemini 키만 있으면 기본·빠른 작업 = 가장 저렴한 Flash-Lite, 목록 요청에 키는 머리글로만', async () => {
    const seen: { url: string; key: string }[] = [];
    setGeminiModelsFetch((async (url: string, init: RequestInit) => {
      seen.push({ url: String(url), key: (init.headers as Record<string, string>)['x-goog-api-key'] });
      return new Response(JSON.stringify(LIST), { status: 200 });
    }) as unknown as typeof fetch);
    await withMemberAiKeys({ geminiKey: KEY, provider: 'gemini' }, async () => {
      await warmGeminiModels();
      expect(models.autoModel()).toBe('gemini-2.5-flash-lite');
      expect(models.fastModel()).toBe('gemini-2.5-flash-lite');
      expect(models.offeredModels(false).filter((m) => m.group === 'recommended').map((m) => m.id)).toEqual(['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro']);
      expect(models.requestModel({ model: 'claude-sonnet-5-5' })).toBe('gemini-2.5-flash-lite'); // Claude 키가 없으면 Claude 모델을 쓰지 않음
    });
    expect(seen).toHaveLength(1);
    expect(seen[0].url).not.toContain(KEY);
    expect(seen[0].key).toBe(KEY);
  });

  it('Claude·Gemini 키가 둘 다 있으면 두 회사 모델이 함께 보이고, 고른 모델의 회사 키를 쓴다', async () => {
    setGeminiModelsFetch((async () => new Response(JSON.stringify(LIST), { status: 200 })) as unknown as typeof fetch);
    await withMemberAiKeys({ anthropicKey: 'sk-ant-member-own-key-000000000', geminiKey: KEY, provider: 'anthropic' }, async () => {
      await warmGeminiModels();
      expect(availableProviders()).toEqual(['anthropic', 'gemini']);
      const ids = models.offeredModels(false).map((m) => m.id);
      expect(ids).toContain('claude-sonnet-5-5');
      expect(ids).toContain('gemini-2.5-flash');
      expect(models.autoModel()).toBe('claude-sonnet-5-5'); // 자동은 Claude 먼저
      expect(providerForModel('gemini-2.5-flash')).toBe('gemini');
      expect(providerForModel('claude-haiku-5-5')).toBe('anthropic');
      expect(providerForModel('gpt-5')).toBeNull(); // OpenAI 키 없음
      expect(models.requestModel({ model: 'gemini-2.5-pro' })).toBe('gemini-2.5-pro');
    });
  });

  it('회원마다 본인 키로 받은 모델 목록만 보인다(다른 회원 목록이 남지 않음)', async () => {
    const A = 'AIzaSyMember-A-own-key-0000000000000';
    const B = 'AIzaSyMember-B-own-key-1111111111111';
    setGeminiModelsFetch((async (_url: string, init: RequestInit) => {
      const key = (init.headers as Record<string, string>)['x-goog-api-key'];
      const only = key === A ? 'gemini-2.5-flash' : 'gemini-2.5-flash-lite';
      return new Response(JSON.stringify({ models: LIST.models.filter((m) => m.name === `models/${only}`) }), { status: 200 });
    }) as unknown as typeof fetch);
    await withMemberAiKeys({ geminiKey: A, provider: 'gemini' }, () => warmGeminiModels());
    await withMemberAiKeys({ geminiKey: B, provider: 'gemini' }, () => warmGeminiModels());
    const idsA = withMemberAiKeys({ geminiKey: A, provider: 'gemini' }, () => models.offeredModels(false).map((m) => m.id));
    const idsB = withMemberAiKeys({ geminiKey: B, provider: 'gemini' }, () => models.offeredModels(false).map((m) => m.id));
    const idsA2 = withMemberAiKeys({ geminiKey: A, provider: 'gemini' }, () => models.offeredModels(false).map((m) => m.id));
    expect(idsA).toContain('gemini-2.5-flash');
    expect(idsA).not.toContain('gemini-2.5-flash-lite');
    expect(idsB).toContain('gemini-2.5-flash-lite');
    expect(idsB).not.toContain('gemini-2.5-flash');
    expect(idsA2).toEqual(idsA);
  });

  it('더 새로운 Flash-Lite가 있어도 기본은 가장 저렴한 2.5 Flash-Lite', async () => {
    const withNewer = { models: [...LIST.models, { name: 'models/gemini-3.5-flash-lite', displayName: 'Gemini 3.5 Flash Lite', supportedGenerationMethods: ['generateContent'] }] };
    setGeminiModelsFetch((async () => new Response(JSON.stringify(withNewer), { status: 200 })) as unknown as typeof fetch);
    await withMemberAiKeys({ geminiKey: 'AIzaSyNewer-lite-member-key-00000000', provider: 'gemini' }, async () => {
      await warmGeminiModels();
      expect(models.autoModel()).toBe('gemini-2.5-flash-lite');
      expect(models.offeredModels(false).map((m) => m.id)).toContain('gemini-3.5-flash-lite');
    });
  });

  it('회원 OpenAI 키 목록에서는 채팅 모델만 남기고 추천은 3개', async () => {
    const { setOpenAIModelsFetch } = await import('@/litpage/server/ai/providers/openaiModels.ts');
    setOpenAIModelsFetch((async () => new Response(JSON.stringify({ data: ['tts-1', 'omni-moderation-latest', 'gpt-realtime', 'gpt-4o-transcribe', 'gpt-5.4-2026-03-05', 'text-embedding-3-small', 'gpt-5-mini', 'gpt-5.6', 'gpt-4.1', 'o4-mini', 'gpt-image-1'].map((id) => ({ id, object: 'model' })) }), { status: 200 })) as unknown as typeof fetch);
    await withMemberAiKeys({ openaiKey: 'sk-member-own-openai-key-0000000000', provider: 'openai' }, async () => {
      await models.warmModelLists();
      const offered = models.offeredModels(false);
      expect(offered.map((m) => m.id).sort()).toEqual(['gpt-4.1', 'gpt-5-mini', 'gpt-5.6', 'o4-mini']);
      expect(offered.filter((m) => m.group === 'recommended')).toHaveLength(3);
    });
    setOpenAIModelsFetch(null);
  });

  it('목록을 못 받으면 Google 공식 별칭으로 진행한다', async () => {
    setGeminiModelsFetch((async () => new Response('{}', { status: 500 })) as unknown as typeof fetch);
    await withMemberAiKeys({ geminiKey: 'AIzaSyOther-member-key-000000000000', provider: 'gemini' }, async () => {
      await warmGeminiModels();
      expect(models.autoModel()).toBe('gemini-flash-lite-latest');
      expect(models.fastModel()).toBe('gemini-flash-lite-latest');
    });
  });
});
