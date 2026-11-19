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
