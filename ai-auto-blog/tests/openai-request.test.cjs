// 2026-11-19 (Master msg_77eaa7b278fe): GPT-6.2 Astra·Sol 요청 구성 회귀 시험 — 가짜 fetch, 실제 호출·키 없음.
// 공식 문서: GPT-6.2는 Chat Completions·Responses 지원, 추론 강도 none 거절, 추론 모델이라 temperature·max_tokens 거부.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function transpile(file) {
  return ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
}

function run(file, context) {
  const mod = { exports: {} };
  vm.runInNewContext(transpile(file), { module: mod, exports: mod.exports, JSON, Math, Number, String, Array, Object, Error, RegExp, Promise, ...context });
  return mod.exports;
}

function loadContentJson(fetchImpl) {
  const params = run('utils/ai/openaiRequestParams.ts', { require: () => { throw Error('no import'); } });
  return run('utils/ai/contentJson.ts', {
    fetch: fetchImpl,
    require: (name) => {
      if (name === 'server-only') return {};
      if (name === './openaiRequestParams') return params;
      if (name === './contentModels') return {};
      throw Error(`Unexpected import ${name}`);
    },
  });
}

function reply(status, body) {
  return { ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) };
}

for (const model of ['gpt-6.2-astra', 'gpt-6.2-sol']) {
  test(`${model}: Chat Completions 요청에 모델명 그대로, temperature·max_tokens·추론 강도 없음`, async () => {
    const calls = [];
    const { generateContentJson } = loadContentJson(async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body) });
      return reply(200, { choices: [{ message: { content: '{"title":"t"}' } }] });
    });
    const out = await generateContentJson({ provider: 'openai', apiKey: 'k', model, system: 's', user: 'u' });
    assert.equal(out.title, 't');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://api.openai.com/v1/chat/completions');
    const body = calls[0].body;
    assert.equal(body.model, model);
    assert.equal(body.temperature, undefined);
    assert.equal(body.max_tokens, undefined);
    assert.equal(body.reasoning_effort, undefined, '추론 강도를 보내지 않음(none 거절 회피)');
    assert.equal(body.response_format.type, 'json_object');
  });

  test(`${model}: Chat Completions가 Responses 안내로 거절하면 Responses로 한 번만 다시 보내고 추론 강도는 보내지 않음`, async () => {
    const calls = [];
    const { generateContentJson } = loadContentJson(async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body) });
      if (url.endsWith('/chat/completions')) return reply(400, { error: { message: 'This model is only supported in v1/responses' } });
      return reply(200, { output_text: '{"title":"r"}' });
    });
    const out = await generateContentJson({ provider: 'openai', apiKey: 'k', model, system: 's', user: 'u' });
    assert.equal(out.title, 'r');
    assert.deepEqual(calls.map((c) => c.url), ['https://api.openai.com/v1/chat/completions', 'https://api.openai.com/v1/responses']);
    assert.equal(calls[1].body.model, model);
    assert.equal(calls[1].body.reasoning, undefined);
    assert.equal(calls[1].body.temperature, undefined);
  });
}

test('기본 모델 GPT-6.1 Terra도 같은 규칙(온도 없음)으로 요청한다', async () => {
  let body;
  const { generateContentJson } = loadContentJson(async (_url, init) => {
    body = JSON.parse(init.body);
    return reply(200, { choices: [{ message: { content: '{"ok":true}' } }] });
  });
  await generateContentJson({ provider: 'openai', apiKey: 'k', model: 'gpt-6.1-terra', system: 's', user: 'u' });
  assert.equal(body.model, 'gpt-6.1-terra');
  assert.equal(body.temperature, undefined);
});

// ── Master msg_bd0707fc7039: 대체 호출은 엔드포인트 전환 안내가 명시된 오류에서만 ──
function countCalls(chatStatus, chatBody) {
  const calls = [];
  const { generateContentJson } = loadContentJson(async (url, init) => {
    calls.push(url);
    if (url.endsWith('/chat/completions')) return { ok: false, status: chatStatus, json: async () => ({}), text: async () => chatBody };
    return reply(200, { output_text: '{"title":"r"}' });
  });
  return generateContentJson({ provider: 'openai', apiKey: 'k', model: 'gpt-6.2-sol', system: 's', user: 'u' })
    .then(() => ({ ok: true, calls }), () => ({ ok: false, calls }));
}

test('일반 옵션 오류(unsupported_parameter 400)는 Responses를 부르지 않고 1호출로 실패', async () => {
  const body = JSON.stringify({ error: { message: "Unsupported parameter: 'response_format' is not supported with this model.", type: 'invalid_request_error', param: 'response_format', code: 'unsupported_parameter' } });
  const r = await countCalls(400, body);
  assert.equal(r.ok, false);
  assert.deepEqual(r.calls, ['https://api.openai.com/v1/chat/completions']);
});

test('옵션 이름(param)이 붙은 400은 문구에 unsupported가 있어도 대체 호출 없음', async () => {
  const body = JSON.stringify({ error: { message: "Unsupported value: 'temperature' does not support 0.65", param: 'temperature', code: null } });
  const r = await countCalls(400, body);
  assert.equal(r.calls.length, 1);
});

for (const status of [401, 403, 429, 500, 503]) {
  test(`${status} 오류는 문구와 관계없이 대체 호출 없음`, async () => {
    const r = await countCalls(status, JSON.stringify({ error: { message: 'Please use v1/responses' } }));
    assert.equal(r.ok, false);
    assert.equal(r.calls.length, 1);
  });
}

test('통신 오류(fetch 예외)는 다시 보내지 않고 실패', async () => {
  let n = 0;
  const { generateContentJson } = loadContentJson(async () => { n += 1; throw new Error('network'); });
  await assert.rejects(generateContentJson({ provider: 'openai', apiKey: 'k', model: 'gpt-6.2-sol', system: 's', user: 'u' }));
  assert.equal(n, 1);
});

test('엔드포인트 전환 안내가 명시된 400/404는 Responses로 1번만 다시 보냄', async () => {
  for (const [status, msg] of [
    [400, 'This model is only supported in v1/responses and not in v1/chat/completions.'],
    [404, 'This is not a chat model and thus not supported in the v1/chat/completions endpoint. Did you mean to use v1/completions?'],
    [400, 'Please use the Responses API for this model.'],
  ]) {
    const r = await countCalls(status, JSON.stringify({ error: { message: msg, type: 'invalid_request_error', param: null, code: null } }));
    assert.equal(r.ok, true, msg);
    assert.deepEqual(r.calls, ['https://api.openai.com/v1/chat/completions', 'https://api.openai.com/v1/responses'], msg);
  }
});

// ── Master msg_15f047c8dab7: Responses API 이름의 단순 언급과 명시 전환 권고 구분 ──
test('Responses API 이름이 단순히 언급된 400(옵션·코드 없음)은 대체 호출 없음', async () => {
  for (const msg of [
    'The Responses API offers more features. Invalid value for messages[0].role.',
    'Invalid request: see the Responses API reference for field names.',
    'Requests to v1/responses are logged separately. Your input was too long.',
  ]) {
    const r = await countCalls(400, JSON.stringify({ error: { message: msg, type: 'invalid_request_error', param: null, code: null } }));
    assert.equal(r.calls.length, 1, msg);
  }
});

test('명시 전환 권고 문구는 다양한 표현에서도 1회 전환', async () => {
  for (const msg of [
    'Use the Responses API for this model.',
    'This model is only available through the Responses API.',
    'Please call v1/responses instead.',
  ]) {
    const r = await countCalls(400, JSON.stringify({ error: { message: msg, param: null, code: null } }));
    assert.equal(r.calls.length, 2, msg);
  }
});
