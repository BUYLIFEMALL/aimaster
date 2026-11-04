// v1.18 C-2 「🤖 자동 운영」 카드: 처음엔 시작하기 3단계, 저장은 한 번에, 저장 뒤엔 요약·일시정지.
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { parseHTML } from 'linkedom';
import { AutopilotPanel } from '../src/components/analysis/AutopilotPanel.tsx';

const DEVICE = '11111111-1111-4111-8111-111111111111';
const base = { consented: false, consentedAt: null, paused: false, tasks: ['like', 'comment'], mode: 'review', enabled: false, likeCap: 100, commentCap: 30, revision: 4, liveAllowed: true,
  schedule: { intervalMinutes: 60, startMinute: 540, endMinute: 1320 }, nextDueAt: null, today: { like: 2, comment: 1, request: 0 }, waiting: 3,
  attention: { uncertainJobs: 0, resultCheck: false, messageUncertain: 0, notEnabled: false } };
async function mount(state) {
  const { window, document } = parseHTML('<html><body><div id="root"></div></body></html>');
  const globals = { window, self: window, document, HTMLElement: window.HTMLElement, Event: window.Event, IS_REACT_ACT_ENVIRONMENT: true }, previous = new Map();
  for (const [k, v] of Object.entries(globals)) { previous.set(k, Object.getOwnPropertyDescriptor(globalThis, k)); Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true }); }
  const original = globalThis.fetch, calls = [];
  globalThis.fetch = async (url, options) => {
    const { operation, payload } = JSON.parse(options.body); calls.push([url, operation, payload]);
    if (operation === 'autopilot') return Response.json({ data: state });
    if (operation === 'extension_devices') return Response.json({ data: [{ id: DEVICE, blog_id: 'my-blog', revoked_at: null }] });
    if (operation === 'list') return Response.json({ data: [{ kind: 'profile', state: 'succeeded' }] });
    if (operation === 'status') return Response.json({ quotes: [{ provider: 'anthropic', model: 'claude-sonnet-5-5', inputUsdPerMillion: 3, outputUsdPerMillion: 15 }] });
    if (operation === 'save_autopilot') { Object.assign(state, { consented: true, mode: payload.mode, enabled: true }); return Response.json({ data: state }); }
    if (operation === 'pause_autopilot') { state.paused = true; return Response.json({ data: state }); }
    return Response.json({ data: state });
  };
  const { createRoot } = await import('react-dom/client'); const root = createRoot(document.getElementById('root'));
  await React.act(async () => root.render(React.createElement(AutopilotPanel)));
  const button = text => [...document.querySelectorAll('button')].find(b => b.textContent.includes(text));
  const click = async el => React.act(async () => el.dispatchEvent(new window.Event('click', { bubbles: true })));
  const restore = async () => { await React.act(async () => root.unmount()); globalThis.fetch = original; for (const [k, d] of previous) { if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k]; } };
  return { document, window, calls, button, click, restore };
}
test('AU01 first visit shows the 3 steps with defaults filled in, refuses to save without the consent, then saves everything in one request', async () => {
  const state = structuredClone(base), u = await mount(state);
  try {
    const text = u.document.body.textContent;
    assert.match(text, /1단계 · 확장 연결 ✅/); assert.match(text, /2단계 · 내 블로그 글 1개 ✅/); assert.match(text, /3단계/);
    assert.match(text, /하루 최대 약 0\.378달러/, 'comment cap 3 × one-call ceiling');
    await u.click(u.button('저장하고'));
    assert.match(u.document.body.textContent, /통합 동의를 확인해 주세요/); assert.equal(u.calls.filter(c => c[1] === 'save_autopilot').length, 0);
    const consent = [...u.document.querySelectorAll('input[type=checkbox]')].at(-1); consent.checked = true;
    await u.click(consent);
    await u.click(u.button('저장하고'));
    const saves = u.calls.filter(c => c[1] === 'save_autopilot');
    assert.equal(saves.length, 1);
    assert.deepEqual(saves[0][2], { mode: 'auto', tasks: ['like', 'comment'], like_cap: 30, comment_cap: 3, interval_minutes: 60, start_minute: 540, end_minute: 1320, expected_revision: 4, device_id: DEVICE, confirmed: true });
    assert.match(u.document.body.textContent, /켜짐 · 자동 모드/);
  } finally { await u.restore(); }
});
test('AU02 after setup only the summary shows: today\'s counts, attention items and one pause button', async () => {
  const state = { ...structuredClone(base), consented: true, mode: 'auto', enabled: true, attention: { uncertainJobs: 1, resultCheck: false, messageUncertain: 0, notEnabled: false } }, u = await mount(state);
  try {
    const text = u.document.body.textContent;
    assert.match(text, /오늘 한 일 · 공감 2 · 댓글 1/); assert.match(text, /확인이 필요한 것 1/); assert.doesNotMatch(text, /3단계/);
    await u.click(u.button('전체 일시정지'));
    assert.ok(u.calls.some(c => c[1] === 'pause_autopilot')); assert.match(u.document.body.textContent, /전체 일시정지 중/); assert.ok(u.button('다시 시작'));
  } finally { await u.restore(); }
});
