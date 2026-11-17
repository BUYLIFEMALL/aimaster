// T-07(2026-11-17): 작업 목록·대시보드 공용 진행 중 작업 갱신(activeJobsPoller) — 가짜 타이머 + 지연 응답.
// 실제 TS 파일을 그대로 변환해 실행한다. 네트워크·DB·React 없음.
const { test, mock, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const js = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/jobs/activeJobsPoller.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const m = { exports: {} };
new Function('module', 'exports', 'require', js)(m, m.exports, require);
const { createActiveJobsPoller, POLL_INTERVAL_MS } = m.exports;

const flush = () => new Promise((r) => setImmediate(r));
function deferred() {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}

beforeEach(() => mock.timers.enable({ apis: ['setInterval', 'setTimeout'] }));
afterEach(() => mock.timers.reset());

// fetchStatus 가짜: answer(id) → 결과 또는 deferred. 호출 기록과 받은 signal을 남긴다.
function harness({ ids, answer, visible = () => true }) {
  const calls = [];
  const signals = [];
  let transitions = 0;
  const stops = [];
  const poller = createActiveJobsPoller({
    ids,
    fetchStatus: (id, signal) => { calls.push(id); signals.push(signal); return Promise.resolve(answer(id)); },
    onTransition: () => { transitions++; },
    onStop: (reason) => stops.push(reason),
    isVisible: visible,
  });
  return { poller, calls, signals, stops, get transitions() { return transitions; } };
}
async function tick(ms) { mock.timers.tick(ms); await flush(); await flush(); }

test('주기는 기존과 같은 5초', () => assert.equal(POLL_INTERVAL_MS, 5000));

test('진행 중 작업이 없으면 요청 0', async () => {
  const h = harness({ ids: [], answer: () => ({ kind: 'ok', status: 'running' }) });
  h.poller.start();
  await tick(30_000);
  assert.equal(h.calls.length, 0);
});

test('5초마다 진행 중 작업마다 한 번씩, 5초 전에는 0', async () => {
  const h = harness({ ids: ['a', 'b'], answer: () => ({ kind: 'ok', status: 'running' }) });
  h.poller.start();
  await tick(4_999);
  assert.equal(h.calls.length, 0);
  await tick(1);
  assert.deepEqual(h.calls, ['a', 'b']);
  await tick(5_000);
  assert.equal(h.calls.length, 4);
  assert.equal(h.transitions, 0);
  h.poller.stop();
});

test('하나라도 끝나면 refresh 한 번 뒤 멈춤', async () => {
  const h = harness({ ids: ['a', 'b'], answer: (id) => ({ kind: 'ok', status: id === 'b' ? 'completed' : 'running' }) });
  h.poller.start();
  await tick(5_000);
  assert.equal(h.transitions, 1);
  assert.deepEqual(h.stops, ['transitioned']);
  await tick(20_000);
  assert.equal(h.calls.length, 2, '멈춘 뒤 요청 0');
  assert.equal(h.transitions, 1);
});

test('숨은 탭이면 그 회차 요청 0, 다시 보이면 다음 회차부터', async () => {
  let shown = false;
  const h = harness({ ids: ['a'], answer: () => ({ kind: 'ok', status: 'running' }), visible: () => shown });
  h.poller.start();
  await tick(15_000);
  assert.equal(h.calls.length, 0);
  shown = true;
  await tick(5_000);
  assert.equal(h.calls.length, 1);
  h.poller.stop();
});

test('앞 요청이 안 끝나면 다음 회차는 건너뜀(겹침 0)', async () => {
  const d = deferred();
  let first = true;
  const h = harness({ ids: ['a'], answer: () => { if (first) { first = false; return d.promise; } return { kind: 'ok', status: 'running' }; } });
  h.poller.start();
  await tick(5_000);
  await tick(5_000);
  await tick(5_000);
  assert.equal(h.calls.length, 1, '응답을 기다리는 동안 더 보내지 않음');
  d.resolve({ kind: 'ok', status: 'running' });
  await flush();
  await tick(5_000);
  assert.equal(h.calls.length, 2);
  h.poller.stop();
});

for (const label of ['401', '403', '404']) {
  test(`${label}(로그아웃·계정 전환·남의 작업) → 영구 멈춤, refresh 0`, async () => {
    const h = harness({ ids: ['a'], answer: () => ({ kind: 'stop' }) });
    h.poller.start();
    await tick(5_000);
    assert.deepEqual(h.stops, ['unauthorized']);
    await tick(30_000);
    assert.equal(h.calls.length, 1);
    assert.equal(h.transitions, 0);
  });
}

test('네트워크·5xx 일시 실패는 즉시 재시도 없이 다음 5초 회차에만 다시', async () => {
  let n = 0;
  const h = harness({ ids: ['a'], answer: () => (++n === 1 ? { kind: 'error' } : { kind: 'ok', status: 'running' }) });
  h.poller.start();
  await tick(5_000);
  assert.equal(h.calls.length, 1);
  await tick(4_999);
  assert.equal(h.calls.length, 1, '실패 직후 바로 다시 보내지 않음');
  await tick(1);
  assert.equal(h.calls.length, 2);
  assert.equal(h.stops.length, 0);
  h.poller.stop();
});

test('fetchStatus가 던져도 일시 실패로 보고 다음 회차', async () => {
  let n = 0;
  const calls = [];
  const p = createActiveJobsPoller({
    ids: ['a'],
    fetchStatus: async (id) => { calls.push(id); if (++n === 1) throw new TypeError('fetch failed'); return { kind: 'ok', status: 'running' }; },
    onTransition: () => {},
    isVisible: () => true,
  });
  p.start();
  await tick(5_000);
  await tick(5_000);
  assert.equal(calls.length, 2);
  p.stop();
});

test('언마운트(stop) 뒤 늦게 온 완료 응답 → refresh 0, signal 중단됨', async () => {
  const d = deferred();
  const h = harness({ ids: ['a'], answer: () => d.promise });
  h.poller.start();
  await tick(5_000);
  h.poller.stop();
  assert.equal(h.signals[0].aborted, true);
  d.resolve({ kind: 'ok', status: 'completed' });
  await flush();
  await tick(20_000);
  assert.equal(h.transitions, 0);
  assert.equal(h.calls.length, 1);
});

test('ID 세대가 바뀌면 이전 세대의 늦은 응답은 무시, 새 세대만 동작', async () => {
  const d = deferred();
  const oldGen = harness({ ids: ['a'], answer: () => d.promise });
  oldGen.poller.start();
  await tick(5_000);
  oldGen.poller.stop(); // 화면이 새 ID 세트로 바뀜
  const newGen = harness({ ids: ['b'], answer: () => ({ kind: 'ok', status: 'running' }) });
  newGen.poller.start();
  d.resolve({ kind: 'ok', status: 'completed' });
  await flush();
  await tick(5_000);
  assert.equal(oldGen.transitions, 0);
  assert.deepEqual(newGen.calls, ['b']);
  assert.equal(newGen.transitions, 0);
  newGen.poller.stop();
});

test('stop 두 번·start 두 번에도 타이머는 하나', async () => {
  const h = harness({ ids: ['a'], answer: () => ({ kind: 'ok', status: 'running' }) });
  h.poller.start();
  h.poller.start();
  await tick(5_000);
  assert.equal(h.calls.length, 1);
  h.poller.stop();
  h.poller.stop();
  await tick(20_000);
  assert.equal(h.calls.length, 1);
});
