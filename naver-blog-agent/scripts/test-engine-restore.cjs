// 2026-11-19 (Master msg_841a78cd076a): 저장된 글 엔진 복원 — 플랫폼 보존, 목록에서 뺀 모델은 같은 플랫폼 기본 추천. (유료 호출 없음)
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

const js = ts.transpileModule(fs.readFileSync(path.join(root, 'src/lib/ai/contentModels.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const mod = { exports: {} };
new Function('module', 'exports', 'require', js)(mod, mod.exports, () => ({}));
const { restoreEngine, ENGINES, DEFAULT_ENGINE, defaultModelOf } = mod.exports;

const def = (p) => defaultModelOf(ENGINES.find((e) => e.provider === p));
let n = 0;
const check = (provider, model, expected, why) => {
  assert.deepEqual(restoreEngine(provider, model), expected, why);
  n += 1;
};

// 기본 추천 값 자체(다른 시험과 같은 기준)
assert.equal(def('openai'), 'gpt-6.1-terra');
assert.equal(def('anthropic'), 'claude-sonnet-5-5');
assert.equal(def('gemini'), 'gemini-3.8-flash');
assert.equal(DEFAULT_ENGINE.model, def('openai'));

// 목록에서 뺀 저장값 → 같은 플랫폼 기본 추천(플랫폼이 OpenAI로 바뀌지 않음)
check('anthropic', 'claude-haiku-4-5', { provider: 'anthropic', model: 'claude-sonnet-5-5' }, 'Claude 폐기 모델은 Claude 기본값');
check('gemini', 'gemini-3.7-flash', { provider: 'gemini', model: 'gemini-3.8-flash' }, 'Gemini 폐기 모델은 Gemini 기본값');
check('gemini', 'gemini-2.0-flash', { provider: 'gemini', model: 'gemini-3.8-flash' }, '종료된 2.0 Flash도 Gemini 기본값');
check('openai', 'gpt-4.1', { provider: 'openai', model: 'gpt-6.1-terra' }, 'OpenAI 폐기 모델은 OpenAI 기본값');
check('openai', 'gpt-4o-mini', { provider: 'openai', model: 'gpt-6.1-terra' }, 'OpenAI 폐기 모델은 OpenAI 기본값');

// 정상 저장값은 그대로(공급자별)
check('openai', 'gpt-6.2-sol', { provider: 'openai', model: 'gpt-6.2-sol' }, 'OpenAI 정상값 유지');
check('anthropic', 'claude-fable-5-2', { provider: 'anthropic', model: 'claude-fable-5-2' }, 'Claude 정상값 유지');
check('gemini', 'gemini-4-neon', { provider: 'gemini', model: 'gemini-4-neon' }, 'Gemini 정상값 유지');
check('anthropic', 'claude-sonnet-5', { provider: 'anthropic', model: 'claude-sonnet-5' }, '이전 세대지만 목록에 남은 값 유지');

// 다른 플랫폼 모델 이름을 섞어 저장한 경우 → 저장된 플랫폼 기본값(모델로 플랫폼을 바꾸지 않음)
check('gemini', 'gpt-6.2-sol', { provider: 'gemini', model: 'gemini-3.8-flash' }, '플랫폼 우선');

// 미지정·모르는 플랫폼 → null(전역 기본값으로 시작)
assert.equal(restoreEngine(undefined, undefined), null); n += 1;
assert.equal(restoreEngine('mistral', 'x'), null); n += 1;
assert.equal(restoreEngine(null, 'gpt-6.1-terra'), null); n += 1;
// 모델 없이 플랫폼만 있으면 그 플랫폼 기본값
check('anthropic', undefined, { provider: 'anthropic', model: 'claude-sonnet-5-5' }, '플랫폼만 저장');

// 두 화면이 같은 함수를 쓰는지(소스 확인)
const dash = fs.readFileSync(path.join(root, 'src/app/(dashboard)/page.tsx'), 'utf8');
const quick = fs.readFileSync(path.join(root, 'src/app/(quick)/quick/page.tsx'), 'utf8');
assert.ok(/restoreEngine\(preferences\.textProvider, preferences\.textModel\)/.test(dash), '대시보드가 restoreEngine 사용');
assert.ok(/restoreEngine\(p\?\.textProvider, p\?\.textModel\)/.test(quick), '빠른 작성이 restoreEngine 사용');
assert.ok(!/setEngine\(\{ provider: p\.textProvider, model: p\.textModel \}\)/.test(quick), '빠른 작성이 저장값을 그대로 보내지 않음');

// 사진 리뷰 선택지(2026-11-19 실제 사진 입력 확인 후 추가) — 화면 선택지 = 엔진 목록 ∩ 허용 목록
const photoSrc = fs.readFileSync(path.join(root, "src/lib/photoReview.ts"), "utf8");
const allow = Object.fromEntries([...photoSrc.matchAll(/^\s+(openai|anthropic|gemini): \[([^\]]*)\]/gm)].map((m) => [m[1], [...m[2].matchAll(/"([^"]+)"/g)].map((v) => v[1])]));
const shown = Object.fromEntries(ENGINES.map((e) => [e.provider, e.models.map((m) => m.value).filter((v) => (allow[e.provider] || []).includes(v))]));
assert.deepEqual(shown.openai, ["gpt-6.2-astra", "gpt-6.2-sol", "gpt-6.1-terra", "gpt-6-astra"], "OpenAI 사진 선택지");
assert.deepEqual(shown.anthropic, ["claude-fable-5-2", "claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"], "Claude 사진 선택지(이전 0개)");
assert.deepEqual(shown.gemini, ["gemini-4-carbon", "gemini-4-neon", "gemini-4-argon", "gemini-4-hydrogen", "gemini-3.8-flash", "gemini-3.1-pro-preview"], "Gemini 사진 선택지");
for (const p of ["openai", "anthropic", "gemini"]) assert.ok(shown[p].includes(def(p)), p + " 기본 추천 모델로 사진 리뷰 가능");
// 종료 예정 모델은 허용 목록 자체에서 삭제(화면에 안 보이는 것만으로 두지 않음)
for (const retired of ["gpt-4.1", "gpt-4o", "gpt-4o-mini", "claude-haiku-4-5"]) assert.ok(!Object.values(allow).flat().includes(retired), retired + " 삭제");
n += 5;

console.log(`engine restore ok: ${n} cases`);
