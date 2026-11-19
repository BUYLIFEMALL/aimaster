// 2026-11-19 BLOG-20261119-MODELS: 설정 화면 플랫폼별 모델 선택과 AI 글쓰기 화면 연결의 회귀 시험.
// 맥미니 재검수 반례 3건(P2 첫 진입 무시, P2 예전 전역값 소실, P3 저장 차단 때 성공 안내)을 재현한다.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const SELECTION = 'ai-auto-blog:model-selection';
const BY_PROVIDER = 'ai-auto-blog:model-by-provider';

function makeStorage({ blocked = false, initial = {} } = {}) {
  const map = new Map(Object.entries(initial).map(([k, v]) => [k, JSON.stringify(v)]));
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      if (blocked) throw new Error('QuotaExceededError');
      map.set(k, String(v));
    },
    json: (k) => (map.has(k) ? JSON.parse(map.get(k)) : null),
  };
}

function load(storage) {
  const file = path.resolve(__dirname, '..', 'utils/ai/contentModels.ts');
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  const requireMock = (name) => {
    if (name === '@/lib/deployment') return { IS_STANDALONE: false };
    throw Error(`Unexpected import ${name}`);
  };
  vm.runInNewContext(output, {
    module, exports: module.exports, require: requireMock,
    window: { localStorage: storage }, JSON, Math, Number, String, Array, Object, Error,
  });
  return module.exports;
}

test('P2: 새 브라우저에서 설정 화면에 저장한 OpenAI 모델이 첫 글쓰기 진입에 쓰인다', () => {
  const storage = makeStorage();
  const m = load(storage);
  assert.equal(m.savePreferredContentModel('openai', 'gpt-5.6-sol'), true);
  // 글쓰기 첫 진입: 마지막 플랫폼(없으면 기본 openai) + 같은 규칙의 유효 모델
  const provider = m.readPreferredContentProvider();
  assert.equal(provider, 'openai');
  assert.equal(m.readPreferredContentModel(provider), 'gpt-5.6-sol');
});

test('P2: 예전 전역 수동값만 있는 회원은 플랫폼을 바꿨다 돌아와도 그 값이 남는다', () => {
  const storage = makeStorage({ initial: { [SELECTION]: { contentProvider: 'openai', contentModel: 'gpt-6-luna', imageModel: 'nanobanana-pro', imageCount: 4 } } });
  const m = load(storage);
  // 첫 진입
  assert.equal(m.readPreferredContentModel(m.readPreferredContentProvider()), 'gpt-6-luna');
  // gemini로 전환 → 글쓰기 화면이 선택을 gemini로 저장
  assert.equal(m.readPreferredContentModel('gemini'), 'gemini-3.5-flash');
  storage.setItem(SELECTION, JSON.stringify({ contentProvider: 'gemini', contentModel: 'gemini-3.5-flash', imageModel: 'nanobanana-pro', imageCount: 4 }));
  // 다시 openai로
  assert.equal(m.readPreferredContentModel('openai'), 'gpt-6-luna');
  assert.equal(storage.json(BY_PROVIDER).openai, 'gpt-6-luna');
});

test('P3: 브라우저 저장이 막히면 저장 함수가 실패를 돌려준다(성공 안내 금지)', () => {
  const storage = makeStorage({ blocked: true });
  const m = load(storage);
  assert.equal(m.savePreferredContentModel('anthropic', 'claude-sonnet-5'), false);
  assert.equal(m.savePreferredImageModel('nanobanana-pro'), false);
  // 읽기는 기본값으로 계속 동작
  assert.equal(m.readPreferredContentModel('anthropic'), 'claude-haiku-4-5-20251001');
});

test('기존 경로 유지: Gemini 이미지 모델 저장은 글쓰기 선택의 나머지 값을 보존한다', () => {
  const storage = makeStorage({ initial: { [SELECTION]: { contentProvider: 'gemini', contentModel: 'gemini-3.8-flash', imageModel: 'nanobanana', imageCount: 2 } } });
  const m = load(storage);
  assert.equal(m.savePreferredImageModel('nanobanana-2-4k'), true);
  assert.deepEqual(storage.json(SELECTION), { contentProvider: 'gemini', contentModel: 'gemini-3.8-flash', imageModel: 'nanobanana-2-4k', imageCount: 2 });
  assert.equal(m.readPreferredImageModel(), 'nanobanana-2-4k');
});

test('지금 글쓰기에서 쓰는 플랫폼의 모델을 설정에서 바꾸면 글쓰기 선택도 함께 바뀌고, 다른 플랫폼은 그대로', () => {
  const storage = makeStorage({ initial: { [SELECTION]: { contentProvider: 'anthropic', contentModel: 'claude-haiku-4-5-20251001' } } });
  const m = load(storage);
  assert.equal(m.savePreferredContentModel('anthropic', 'claude-opus-5'), true);
  assert.equal(storage.json(SELECTION).contentModel, 'claude-opus-5');
  assert.equal(m.savePreferredContentModel('openai', 'gpt-4o'), true);
  assert.equal(storage.json(SELECTION).contentModel, 'claude-opus-5');
  assert.equal(m.readPreferredContentModel('openai'), 'gpt-4o');
});

test('목록에 없는 저장값·종료 모델은 기본값 또는 대체 모델로 바뀐다', () => {
  const storage = makeStorage({ initial: { [BY_PROVIDER]: { openai: 'gpt-5', gemini: 'no-such-model' } } });
  const m = load(storage);
  assert.equal(m.readPreferredContentModel('openai'), 'gpt-5.6-sol');
  assert.equal(m.readPreferredContentModel('gemini'), 'gemini-3.5-flash');
});
