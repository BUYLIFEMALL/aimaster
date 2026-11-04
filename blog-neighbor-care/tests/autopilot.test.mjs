// v1.18 단계 C-2 자동 운영 — 시작하기 저장 입력 검사, 문장 실패 원인 구분, 확장의 통합 동의·전체 일시정지·자동 시작.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createReaderController, SITE } from '../extension/background.mjs';
import { createWorkHandler } from '../src/lib/work-api.ts';
import { messageFailure } from '../src/lib/messages/api.ts';
import { ProviderFailure } from '../src/lib/analysis/provider.ts';
import { AnalysisInputError } from '../src/lib/analysis/contracts.ts';
import { callCeilingUsd } from '../src/components/analysis/AutopilotPanel.tsx';

const TOKEN = 'a'.repeat(64), DEVICE = '11111111-1111-4111-8111-111111111111';
function setup(server) {
  const local = { token: TOKEN }, session = {}, calls = [];
  const storage = data => ({ setAccessLevel: async () => {}, get: async key => ({ [key]: data[key] }), set: async x => Object.assign(data, x), remove: async key => { delete data[key]; } });
  const browser = { storage: { local: storage(local), session: storage(session) }, runtime: { id: 'a'.repeat(32), getURL: p => `chrome-extension://${'a'.repeat(32)}/${p}`, getManifest: () => ({ version_name: 'v1.18' }) },
    tabs: { query: async () => [{ id: 7, windowId: 8, url: `${SITE}/today` }], get: async () => ({ id: 7, windowId: 8, url: `${SITE}/today` }) }, windows: { get: async () => ({ state: 'normal' }) } };
  const fetcher = async (url, init) => {
    const { operation } = JSON.parse(init.body); calls.push(operation);
    if (url === `${SITE}/api/execution/extension`) {
      if (operation === 'autopilot_pause') { server.paused = true; return Response.json({ data: { ...server } }); }
      if (operation === 'autopilot_status') return Response.json({ data: { ...server } });
      return Response.json({ data: { phase: 'idle' } });
    }
    if (operation === 'whoami') return Response.json({ data: { deviceId: DEVICE, blogId: 'my-blog' } });
    return Response.json({ data: { phase: 'idle' } });
  };
  const handle = createReaderController(browser, fetcher);
  const popup = { id: browser.runtime.id, url: browser.runtime.getURL('popup.html') }, web = { id: browser.runtime.id, tab: { url: `${SITE}/today` } };
  return { handle, popup, web, local, calls };
}
const why = async p => { try { await p; return ''; } catch (e) { return String(e?.message ?? e); } };
const seoulMinute = () => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map(x => [x.type, x.value])); return Number(p.hour) * 60 + Number(p.minute); };
const on = { consented: true, paused: false, mode: 'auto', enabled: true, schedule: { startMinute: 0, endMinute: 0 } };

test('AP-E1 the program\'s one-time consent (server record) lets the web start traversal without asking again in the popup', async () => {
  const s = setup({ ...on });
  assert.doesNotMatch(await why(s.handle({ type: 'traversal_start' }, s.web)), /처음 한 번 동의|일시정지/);
  assert.deepEqual(s.local.runConsent.scopes, ['traversal']);
  const t = setup({ ...on, consented: false });
  assert.match(await why(t.handle({ type: 'traversal_start' }, t.web)), /시작하기.*처음 한 번 동의/);
});
test('AP-E2 while paused, nothing starts — not from the web button and not by itself', async () => {
  const s = setup({ ...on, paused: true });
  assert.match(await why(s.handle({ type: 'traversal_start' }, s.web)), /전체 일시정지 중/);
  assert.equal((await s.handle.autopilotTick()).reason, 'off');
});
test('AP-E3 the popup pause records the pause on the server and stops this PC; the web cannot call it', async () => {
  const s = setup({ ...on });
  await assert.rejects(s.handle({ type: 'autopilot_pause' }, s.web));
  const r = await s.handle({ type: 'autopilot_pause' }, s.popup);
  assert.equal(r.paused, true); assert.equal(r.saved, true); assert.ok(s.calls.includes('autopilot_pause'));
});
test('AP-E4 automatic start: only in auto mode inside the time window, at most once a day (a failed start is not retried the same day)', async () => {
  const s = setup({ ...on });
  const first = await s.handle.autopilotTick();
  assert.equal(first.reason, 'start_failed', 'the fixture has no alarms, so the traversal itself cannot start');
  assert.ok(s.local.autopilotDay); assert.ok(s.local.autopilotNote.message);
  assert.equal((await s.handle.autopilotTick()).reason, 'done_today');
  const m = seoulMinute(), out = setup({ ...on, schedule: { startMinute: (m + 60) % 1440, endMinute: (m + 120) % 1440 } });
  assert.equal((await out.handle.autopilotTick()).reason, 'outside_window'); assert.equal(out.local.autopilotDay, undefined);
  const review = setup({ ...on, mode: 'review' });
  assert.equal((await review.handle.autopilotTick()).reason, 'off');
});

const workRequest = (operation, payload) => new Request('https://bnc.test/api/work', { method: 'POST', headers: { origin: 'https://bnc.test', host: 'bnc.test', 'content-type': 'application/json' }, body: JSON.stringify({ operation, payload }) });
const valid = { mode: 'auto', tasks: ['like', 'comment'], like_cap: 30, comment_cap: 3, interval_minutes: 60, start_minute: 540, end_minute: 1320, expected_revision: 4, device_id: DEVICE, confirmed: true };
test('AP-W1 saving 「시작하기」 needs the consent, known tasks, a comment cap of at most 10 and a valid time window', async () => {
  const seen = [];
  const handler = createWorkHandler({ authorize: async () => ({ allowed: true, userId: 'u' }), execute: async (u, op, p) => { seen.push([op, p]); return { data: { ok: true }, error: null }; } });
  assert.equal((await handler(workRequest('save_autopilot', valid))).status, 200);
  assert.deepEqual(seen[0], ['save_autopilot', valid]);
  for (const bad of [{ ...valid, confirmed: false }, { ...valid, comment_cap: 11 }, { ...valid, tasks: ['like', 'request'] }, { ...valid, tasks: [] }, { ...valid, interval_minutes: 45 }, { ...valid, device_id: 'x' }, { ...valid, extra: 1 }])
    assert.equal((await handler(workRequest('save_autopilot', bad))).status, 400);
  for (const op of ['autopilot', 'pause_autopilot', 'resume_autopilot', 'revoke_autopilot']) assert.equal((await handler(workRequest(op, {}))).status, 200);
  assert.equal(seen.length, 5);
});
test('AP-W2 a stale save is refused with a re-check message; the duplicate notice is one sentence', async () => {
  const fail = message => createWorkHandler({ authorize: async () => ({ allowed: true, userId: 'u' }), execute: async () => ({ data: null, error: { message } }) });
  const stale = await (await fail('BNC_STALE_REVISION')(workRequest('save_autopilot', valid))).json();
  assert.match(stale.error, /다시 조회/);
  const dup = await (await fail('BNC_DUPLICATE_ACTION')(workRequest('create', { account_id: DEVICE, neighbor_id: 'n', post_id: '1', kind: 'like' }))).json();
  assert.equal(dup.error, '이 글에 같은 작업이 이미 있습니다. 작업 기록에서 확인해 주세요.');
});
test('AP-M1 message failures say why: key, billing, limit, model, no response, incomplete, quality, storage', () => {
  const p = (reason, status, code) => messageFailure(new ProviderFailure(reason, status, code), true).code;
  assert.equal(p('http_rejected', 401, 'authentication_required'), 'key_rejected');
  assert.equal(p('http_rejected', 402, 'billing_required'), 'billing');
  assert.equal(p('http_rejected', 429, 'rate_limited'), 'rate_limited');
  assert.equal(p('http_rejected', 404, 'model_unavailable'), 'model');
  assert.equal(p('transport'), 'no_response');
  assert.equal(p('response_incomplete'), 'incomplete');
  assert.equal(messageFailure(new AnalysisInputError(), true).code, 'quality');
  assert.equal(messageFailure(new AnalysisInputError(), false).code, 'storage');
  assert.equal(messageFailure(new Error('storage'), true).code, 'storage');
  assert.doesNotMatch(JSON.stringify(messageFailure(new ProviderFailure('http_rejected', 401, 'authentication_required'), true)), /sk-|Bearer/);
});
test('AP-C1 the daily AI ceiling shown in 시작하기 uses the price table per call (input 12,000 + output 6,000 tokens)', () => {
  assert.equal(callCeilingUsd({ provider: 'anthropic', model: 'claude-sonnet-5-5', inputUsdPerMillion: 3, outputUsdPerMillion: 15 }), 0.126);
});
