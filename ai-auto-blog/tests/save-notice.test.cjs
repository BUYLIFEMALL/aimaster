// 2026-11-19 BLOG-20261119-MODELS(Master msg_963f5dc087ca): 설정 카드 저장 안내 타이머 — 가짜 시계 시험.
// 반례: 이전 성공 타이머가 1.5초 안에 생긴 최신 실패 안내를 지웠다.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load() {
  const file = path.resolve(__dirname, '..', 'app/settings/saveNotice.ts');
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(output, { module: mod, exports: mod.exports, setTimeout() { throw Error('real timer used'); }, clearTimeout() {} });
  return mod.exports;
}

function fakeClock() {
  let now = 0;
  let seq = 0;
  const timers = new Map();
  return {
    schedule: (fn, ms) => { const id = ++seq; timers.set(id, { at: now + ms, fn }); return id; },
    cancel: (id) => timers.delete(id),
    advance(ms) {
      now += ms;
      for (const [id, t] of [...timers].sort((a, b) => a[1].at - b[1].at)) {
        if (t.at <= now && timers.has(id)) { timers.delete(id); t.fn(); }
      }
    },
    pending: () => timers.size,
  };
}

function setup() {
  const { createSaveNotice, SAVED_NOTICE_MS } = load();
  const clock = fakeClock();
  const shown = [];
  const notice = createSaveNotice((v) => shown.push(v), clock.schedule, clock.cancel);
  return { notice, clock, shown, current: () => shown[shown.length - 1], MS: SAVED_NOTICE_MS };
}

test('성공 직후(1.5초 안) 실패가 오면 실패 안내가 남는다', () => {
  const { notice, clock, current, MS } = setup();
  notice.report('saved');
  clock.advance(500);
  notice.report('failed');
  clock.advance(MS * 2);
  assert.equal(current(), 'failed');
  assert.equal(clock.pending(), 0);
});

test('성공 직후 부분 저장이 오면 부분 저장 안내가 남는다', () => {
  const { notice, clock, current, MS } = setup();
  notice.report('saved');
  clock.advance(1000);
  notice.report('partial');
  clock.advance(MS * 2);
  assert.equal(current(), 'partial');
});

test('반복 성공은 마지막 성공부터 1.5초 뒤에 한 번만 사라진다', () => {
  const { notice, clock, shown, current, MS } = setup();
  notice.report('saved');
  clock.advance(1000);
  notice.report('saved');
  clock.advance(1000); // 첫 성공 기준 2초 — 아직 남아 있어야 함
  assert.equal(current(), 'saved');
  clock.advance(MS - 1000);
  assert.equal(current(), null);
  assert.equal(shown.filter((v) => v === null).length, 1);
  assert.equal(clock.pending(), 0);
});

test('성공 하나만 있으면 1.5초 뒤 사라지고, 실패는 스스로 사라지지 않는다', () => {
  const a = setup();
  a.notice.report('saved');
  a.clock.advance(a.MS - 1);
  assert.equal(a.current(), 'saved');
  a.clock.advance(1);
  assert.equal(a.current(), null);

  const b = setup();
  b.notice.report('failed');
  b.clock.advance(b.MS * 10);
  assert.equal(b.current(), 'failed');
  assert.equal(b.clock.pending(), 0);
});

test('화면이 사라지면 남은 타이머를 정리한다', () => {
  const { notice, clock, shown } = setup();
  notice.report('saved');
  notice.dispose();
  clock.advance(10000);
  assert.deepEqual(shown, ['saved']);
  assert.equal(clock.pending(), 0);
});
