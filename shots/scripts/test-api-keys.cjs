// 최상위 규칙 검사: API 키는 로그인한 회원 본인의 것만 쓴다(운영자 환경변수·다른 회원 키로 폴백하지 않음). 네트워크 없음.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

process.env.OPENAI_API_KEY = 'OPERATOR-ENV-KEY';
process.env.SUNO_API_KEY = 'OPERATOR-ENV-KEY';
process.env.PERPLEXITY_API_KEY = 'OPERATOR-ENV-KEY';

const rows = [
  { user_id: 'member-a', provider: 'openai', api_key: 'KEY-A' },
  { user_id: 'member-b', provider: 'perplexity', api_key: 'KEY-B' },
];
function client() {
  const filters = [];
  const api = {
    from: () => api,
    select: () => api,
    eq: (c, v) => { filters.push([c, v]); return api; },
    maybeSingle: async () => ({ data: rows.find((r) => filters.every(([c, v]) => r[c] === v)) || null }),
  };
  return api;
}

const filename = path.resolve(__dirname, '../src/lib/apiKeys.ts');
const js = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const module_ = { exports: {} };
vm.runInThisContext('(function(require,module,exports){' + js + '\n})', { filename })((id) => { if (id === 'server-only') return {}; throw new Error('Unexpected import ' + id); }, module_, module_.exports);
const { resolveApiKey } = module_.exports;

(async () => {
  assert.equal(await resolveApiKey(client(), 'member-a', 'openai'), 'KEY-A', '본인 키는 그대로');
  assert.equal(await resolveApiKey(client(), 'member-a', 'perplexity'), null, '본인 키가 없으면 환경변수 키도 다른 회원 키도 쓰지 않는다');
  assert.equal(await resolveApiKey(client(), 'member-c', 'openai'), null, '키가 없는 회원은 null(등록 안내)');
  assert.equal(await resolveApiKey(client(), 'member-b', 'openai'), null, '다른 회원 키(KEY-A)로 대신하지 않는다');
  const src = fs.readFileSync(filename, 'utf8');
  assert.equal(/process\.env\.(OPENAI|ANTHROPIC|GEMINI|PERPLEXITY)/.test(src), false, '소스에 운영자 AI 키 폴백이 다시 생기면 안 됨');
  console.log('api keys ok');
})().catch((e) => { console.error(e); process.exit(1); });
