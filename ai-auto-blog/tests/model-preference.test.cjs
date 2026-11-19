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

// blocked: 모든 쓰기 실패 / blockedKeys: 그 키만 쓰기 실패 / raw: 손상된 문자열을 그대로 넣음
function makeStorage({ blocked = false, blockedKeys = [], initial = {}, raw = {} } = {}) {
  const map = new Map([
    ...Object.entries(initial).map(([k, v]) => [k, JSON.stringify(v)]),
    ...Object.entries(raw),
  ]);
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      if (blocked || blockedKeys.includes(k)) throw new Error('QuotaExceededError');
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
  assert.equal(m.savePreferredContentModel('openai', 'gpt-5.6-sol'), 'saved');
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
  assert.equal(m.readPreferredContentModel('gemini'), 'gemini-3.8-flash');
  storage.setItem(SELECTION, JSON.stringify({ contentProvider: 'gemini', contentModel: 'gemini-3.8-flash', imageModel: 'nanobanana-pro', imageCount: 4 }));
  // 다시 openai로
  assert.equal(m.readPreferredContentModel('openai'), 'gpt-6-luna');
  assert.equal(storage.json(BY_PROVIDER).openai, 'gpt-6-luna');
});

test('P3: 브라우저 저장이 막히면 저장 함수가 실패를 돌려준다(성공 안내 금지)', () => {
  const storage = makeStorage({ blocked: true });
  const m = load(storage);
  assert.equal(m.savePreferredContentModel('anthropic', 'claude-sonnet-5'), 'failed');
  assert.equal(m.savePreferredImageModel('nanobanana-pro'), 'failed');
  // 읽기는 기본값으로 계속 동작
  assert.equal(m.readPreferredContentModel('anthropic'), 'claude-sonnet-5-5');
});

test('기존 경로 유지: Gemini 이미지 모델 저장은 글쓰기 선택의 나머지 값을 보존한다', () => {
  const storage = makeStorage({ initial: { [SELECTION]: { contentProvider: 'gemini', contentModel: 'gemini-3.8-flash', imageModel: 'nanobanana', imageCount: 2 } } });
  const m = load(storage);
  assert.equal(m.savePreferredImageModel('nanobanana-2-4k'), 'saved');
  assert.deepEqual(storage.json(SELECTION), { contentProvider: 'gemini', contentModel: 'gemini-3.8-flash', imageModel: 'nanobanana-2-4k', imageCount: 2 });
  assert.equal(m.readPreferredImageModel(), 'nanobanana-2-4k');
});

test('지금 글쓰기에서 쓰는 플랫폼의 모델을 설정에서 바꾸면 글쓰기 선택도 함께 바뀌고, 다른 플랫폼은 그대로', () => {
  const storage = makeStorage({ initial: { [SELECTION]: { contentProvider: 'anthropic', contentModel: 'claude-haiku-4-5-20251001' } } });
  const m = load(storage);
  assert.equal(m.savePreferredContentModel('anthropic', 'claude-opus-5'), 'saved');
  assert.equal(storage.json(SELECTION).contentModel, 'claude-opus-5');
  assert.equal(m.savePreferredContentModel('openai', 'gpt-6-luna'), 'saved');
  assert.equal(storage.json(SELECTION).contentModel, 'claude-opus-5');
  assert.equal(m.readPreferredContentModel('openai'), 'gpt-6-luna');
});

test('목록에 없는 저장값·종료 모델은 기본값 또는 대체 모델로 바뀐다', () => {
  const storage = makeStorage({ initial: { [BY_PROVIDER]: { openai: 'gpt-5', gemini: 'no-such-model' } } });
  const m = load(storage);
  assert.equal(m.readPreferredContentModel('openai'), 'gpt-5.6-sol');
  assert.equal(m.readPreferredContentModel('gemini'), 'gemini-3.8-flash');
});

// ── 2차 재검수 반례(Master msg_2888acb4d0d4) ──
test('P2: 마지막 선택 기록만 손상돼도 플랫폼별 기억으로 첫 진입 모델을 고른다', () => {
  const storage = makeStorage({ raw: { [SELECTION]: '{깨진 json' }, initial: { [BY_PROVIDER]: { openai: 'gpt-6-astra' } } });
  const m = load(storage);
  const init = m.readInitialModelSelection();
  assert.equal(init.contentProvider, 'openai');
  assert.equal(init.contentModel, 'gpt-6-astra');
  assert.equal(init.imageModel, 'nanobanana-2-2k');
  assert.equal(init.imageCount, 3);
});

test('플랫폼별 기억만 손상돼도 마지막 선택(플랫폼·모델·이미지·장수)은 그대로 살린다', () => {
  const storage = makeStorage({
    raw: { [BY_PROVIDER]: 'not-json' },
    initial: { [SELECTION]: { contentProvider: 'anthropic', contentModel: 'claude-opus-5', imageModel: 'nanobanana-pro', imageCount: 5 } },
  });
  const m = load(storage);
  const init = m.readInitialModelSelection();
  assert.equal(init.contentProvider, 'anthropic');
  assert.equal(init.contentModel, 'claude-opus-5');
  assert.equal(init.imageModel, 'nanobanana-pro');
  assert.equal(init.imageCount, 5);
});

test('둘 다 손상되면 기본값으로 시작하고, 새로 저장하면 손상값을 정상값으로 덮어 복구한다', () => {
  const storage = makeStorage({ raw: { [SELECTION]: '[[', [BY_PROVIDER]: '{' } });
  const m = load(storage);
  const init = m.readInitialModelSelection();
  assert.equal(init.contentProvider, 'openai');
  assert.equal(init.contentModel, 'gpt-6.1-terra');
  assert.equal(init.imageModel, 'nanobanana-2-2k');
  assert.equal(init.imageCount, 3);
  assert.equal(m.savePreferredContentModel('gemini', 'gemini-3.8-flash'), 'saved');
  assert.equal(m.readPreferredContentModel('gemini'), 'gemini-3.8-flash');
});

test('P3: 플랫폼별 기억은 저장되고 마지막 선택만 실패하면 partial — 글쓰기 화면은 새 모델을 쓴다', () => {
  const storage = makeStorage({ blockedKeys: [SELECTION], initial: { [SELECTION]: { contentProvider: 'openai', contentModel: 'gpt-4.1' } } });
  const m = load(storage);
  assert.equal(m.savePreferredContentModel('openai', 'gpt-6.1-sol'), 'partial');
  const init = m.readInitialModelSelection();
  assert.equal(init.contentProvider, 'openai');
  assert.equal(init.contentModel, 'gpt-6.1-sol');
});

test('플랫폼별 기억 저장이 실패하면 failed이고 마지막 선택도 건드리지 않는다(두 값이 어긋나지 않음)', () => {
  const storage = makeStorage({ blockedKeys: [BY_PROVIDER], initial: { [SELECTION]: { contentProvider: 'openai', contentModel: 'gpt-4.1' } } });
  const m = load(storage);
  assert.equal(m.savePreferredContentModel('openai', 'gpt-6.1-sol'), 'failed');
  assert.equal(storage.json(SELECTION).contentModel, 'gpt-4.1');
  assert.equal(m.readInitialModelSelection().contentModel, 'gpt-6.1-terra');
});

test('다른 플랫폼 모델은 한 플랫폼을 저장해도 그대로 유지된다', () => {
  const storage = makeStorage({ initial: { [BY_PROVIDER]: { anthropic: 'claude-opus-5-5', gemini: 'gemini-3.6-flash' } } });
  const m = load(storage);
  assert.equal(m.savePreferredContentModel('openai', 'gpt-6-luna'), 'saved');
  assert.equal(m.readPreferredContentModel('anthropic'), 'claude-opus-5-5');
  assert.equal(m.readPreferredContentModel('gemini'), 'gemini-3.6-flash');
});

// ── 2026-11-19 주인님 지시: 최신 모델순 선택 + 플랫폼별 모델 업그레이드 ──
test('플랫폼마다 최신 모델이 맨 위에 오고, 기본 모델은 모델 선택표의 중가 균형 모델이다', () => {
  const m = load(makeStorage());
  const first = (p) => Array.from(m.getContentModels(p), (x) => x.value); // 다른 실행 환경 배열이라 이쪽 배열로 복사
  assert.deepEqual(first('openai').slice(0, 4), ['gpt-6.2-astra', 'gpt-6.2-sol', 'gpt-6.1-terra', 'gpt-6.1-sol']);
  assert.deepEqual(first('anthropic').slice(0, 4), ['claude-fable-5-2', 'claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5']);
  assert.deepEqual(first('gemini').slice(0, 4), ['gemini-4-carbon', 'gemini-4-neon', 'gemini-4-argon', 'gemini-4-hydrogen']);
  assert.equal(m.getDefaultContentModel('openai'), 'gpt-6.1-terra');
  assert.equal(m.getDefaultContentModel('anthropic'), 'claude-sonnet-5-5');
  assert.equal(m.getDefaultContentModel('gemini'), 'gemini-3.8-flash');
  // 미리보기는 맨 아래, 기본값으로 쓰지 않음
  const gem = m.getContentModels('gemini');
  assert.equal(gem[gem.length - 1].lifecycle, 'preview');
});

test('종료 예정·자동 연결 모델은 목록에 없고, 저장돼 있던 값은 대체 모델로 읽힌다', () => {
  const m = load(makeStorage());
  const all = m.CONTENT_MODEL_OPTIONS.map((x) => x.value);
  for (const gone of ['gpt-4.1', 'gpt-4o', 'gpt-4o-mini', 'claude-haiku-4-5-20251001', 'gemini-3.5-flash', 'gemini-3.7-flash']) {
    assert.ok(!all.includes(gone), gone);
  }
  assert.equal(m.resolveContentModel('openai', 'gpt-4.1'), 'gpt-6.1-terra');
  assert.equal(m.resolveContentModel('openai', 'gpt-4o-mini'), 'gpt-6-luna');
  assert.equal(m.resolveContentModel('anthropic', 'claude-haiku-4-5-20251001'), 'claude-haiku-5-5');
  assert.equal(m.resolveContentModel('anthropic', 'claude-fable-5'), 'claude-fable-5-2');
  assert.equal(m.resolveContentModel('gemini', 'gemini-3.5-flash'), 'gemini-3.6-flash');
  assert.equal(m.resolveContentModel('gemini', 'gemini-3.7-flash'), 'gemini-3.8-flash');
});
