// v1.16 단계 A(화면 정리): 옛 주소 연결 · 기기 허용 저장값 표시/보이는 그대로 저장 · 기본 모델 한 곳.
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { parseHTML } from 'linkedom';
import { savedPermissions, ExtensionExecutionSettings } from '../src/components/analysis/ExtensionExecutionSettings.tsx';
import { parseDefaultModel, FALLBACK_MODEL } from '../src/lib/analysis/defaultModel.ts';

const redirectOf = fn => { try { fn(); } catch (e) { return String(e.digest || e.message); } return 'no redirect'; };

test('V116-01 old addresses stay alive and lead to the new screens', async () => {
  assert.match(redirectOf((await import('../src/app/page.tsx')).default), /;\/today;/);
  assert.match(redirectOf((await import('../src/app/candidates/page.tsx')).default), /;\/neighbors\?tab=candidates;/);
  assert.match(redirectOf((await import('../src/app/reader/page.tsx')).default), /;\/settings#connection;/);
  // 서버 전용 화면은 불러오지 않고 파일만 확인(회원 확인 컴포넌트가 server-only).
  const { existsSync } = await import('node:fs');
  for (const page of ['studio', 'today', 'neighbors', 'settings']) assert.ok(existsSync(new URL(`../src/app/${page}/page.tsx`, import.meta.url)), page);
});

test('V116-02 saved device permissions are shown only while valid, unknown values dropped', () => {
  const now = Date.parse('2026-11-04T12:00:00Z');
  const d = { id: 'd1', blog_id: 'me', expires_at: '2026-12-01T00:00:00Z', kinds: ['like', 'unknown'], reads: ['incoming'], revoked_at: null, permission_expires_at: '2026-11-20T00:00:00Z' };
  assert.deepEqual(savedPermissions(d, now), { kinds: ['like'], reads: ['incoming'] });
  assert.deepEqual(savedPermissions({ ...d, revoked_at: '2026-11-03T00:00:00Z' }, now), { kinds: [], reads: [] });
  assert.deepEqual(savedPermissions({ ...d, permission_expires_at: '2026-11-01T00:00:00Z' }, now), { kinds: [], reads: [] });
  assert.deepEqual(savedPermissions(undefined, now), { kinds: [], reads: [] });
});

test('V116-03 device panel shows the saved 공감 checked and saves exactly what is visible (adding 댓글 keeps 공감)', async () => {
  const { window, document } = parseHTML('<html><body><div id="root"></div></body></html>');
  const globals = { window, self: window, document, HTMLElement: window.HTMLElement, Event: window.Event, IS_REACT_ACT_ENVIRONMENT: true }, previous = new Map();
  for (const [key, value] of Object.entries(globals)) { previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key)); Object.defineProperty(globalThis, key, { value, configurable: true, writable: true }); }
  const original = globalThis.fetch, calls = [];
  let saved = { kinds: ['like'], reads: [] };
  const device = () => ({ id: 'd1', blog_id: 'me', expires_at: '2099-01-01T00:00:00Z', kinds: saved.kinds, reads: saved.reads, revoked_at: null, permission_expires_at: '2099-01-01T00:00:00Z' });
  globalThis.fetch = async (url, options) => {
    const body = JSON.parse(options.body); calls.push(body);
    if (body.operation === 'grant_extension') { saved = { kinds: body.payload.kinds, reads: body.payload.reads }; return Response.json({ data: { saved: true } }); }
    return Response.json({ data: [device()] });
  };
  let root;
  const click = el => React.act(async () => {
    // linkedom은 클릭 기본 동작(체크 바꾸기)이 없어 기존 화면 시험처럼 값을 먼저 바꾼 뒤 이벤트를 보낸다.
    if (el.type === 'checkbox') el.checked = !el.checked;
    el.dispatchEvent(new window.Event('click', { bubbles: true }));
  });
  const box = label => [...document.querySelectorAll('label.check')].find(l => l.textContent.includes(label)).querySelector('input');
  try {
    const { createRoot } = await import('react-dom/client'); root = createRoot(document.getElementById('root'));
    await React.act(async () => root.render(React.createElement(ExtensionExecutionSettings)));
    await click([...document.querySelectorAll('button')].find(b => b.textContent === '연결된 확장 조회'));
    assert.equal(box('공감').checked, true, 'saved 공감 shows as checked');
    assert.equal(box('댓글·답방').checked, false);
    await click(box('댓글·답방'));
    await click(box('동의합니다'));
    await click([...document.querySelectorAll('button')].find(b => b.textContent === '선택한 확장 동작 허용'));
    const grant = calls.find(c => c.operation === 'grant_extension');
    assert.deepEqual(grant.payload.kinds, ['like', 'comment'], 'visible checks are saved as-is');
    assert.equal(calls.at(-1).operation, 'extension_devices', 'list is re-read after saving (no re-save)');
    assert.equal(calls.filter(c => c.operation === 'grant_extension').length, 1);
    assert.equal(box('공감').checked, true); assert.equal(box('댓글·답방').checked, true);
  } finally {
    if (root) await React.act(async () => root.unmount()); globalThis.fetch = original;
    for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  }
});

test('V116-04 the one default model is read back safely (retired ids converted, broken values fall back)', () => {
  assert.deepEqual(parseDefaultModel(JSON.stringify({ provider: 'gemini', model: 'gemini-3.7-flash' })), { provider: 'gemini', model: 'gemini-3.8-flash' });
  assert.deepEqual(parseDefaultModel(JSON.stringify({ provider: 'gemini', model: 'gemini-4-argon' })), { provider: 'gemini', model: 'gemini-4-argon' });
  assert.deepEqual(parseDefaultModel('{broken'), FALLBACK_MODEL);
  assert.deepEqual(parseDefaultModel(JSON.stringify({ provider: 'openai', model: 'gemini-3.8-flash' })), FALLBACK_MODEL);
  assert.equal(FALLBACK_MODEL.provider, 'anthropic');
});
