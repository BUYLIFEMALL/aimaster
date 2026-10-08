// 선택한 AI 모델이 실제 호출 모델과 같은지 검사합니다. (유료 호출 없음)
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const sent = [];

function load() {
  const module = { exports: {} };
  const js = ts.transpileModule(fs.readFileSync(path.join(root, 'src/lib/ai/models.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mockRequire = (id) => {
    if (id === '@google/generative-ai') return { GoogleGenerativeAI: class { getGenerativeModel(o) { sent.push(['gemini', o.model]); return { generateContent: async () => ({ response: { text: () => 'ok' } }) }; } } };
    if (id === 'openai') return { default: class { constructor() { this.chat = { completions: { create: async (o) => { sent.push(['openai', o.model]); return { choices: [{ message: { content: 'ok' } }] }; } } }; } } };
    if (id === '@anthropic-ai/sdk') return { default: class { constructor() { this.messages = { create: async (o) => { sent.push(['anthropic', o.model]); return { content: [{ type: 'text', text: 'ok' }] }; } }; } } };
    return {};
  };
  new Function('module', 'exports', 'require', js)(module, module.exports, mockRequire);
  return module.exports;
}

(async () => {
  const { callAI } = load();
  const engines = fs.readFileSync(path.join(root, 'src/lib/ai/contentModels.ts'), 'utf8');
  const listed = [...engines.matchAll(/provider: "(openai|anthropic|gemini)"[\s\S]*?models: \[([\s\S]*?)\n    \],/g)]
    .flatMap((m) => [...m[2].matchAll(/value: "([^"]+)"/g)].map((v) => [m[1], v[1]]));
  assert.ok(listed.length >= 15, '화면 모델 목록을 읽지 못했습니다');
  for (const [provider, model] of listed) await callAI({ provider, apiKey: 'x', model }, 's', 'u');
  assert.deepEqual(sent, listed, '선택한 모델과 실제 호출 모델이 다릅니다');

  sent.length = 0;
  for (const p of ['openai', 'anthropic', 'gemini']) await callAI({ provider: p, apiKey: 'x' }, 's', 'u');
  const defaults = Object.fromEntries(sent);
  const first = (p) => listed.find(([q]) => q === p)[1];
  for (const p of ['openai', 'anthropic', 'gemini']) assert.equal(defaults[p], first(p), `${p} 기본 모델이 화면 기본 추천과 다릅니다`);
  console.log(`model selection ok: ${listed.length} models passed through, defaults match`);
})().catch((e) => { console.error(e); process.exit(1); });
