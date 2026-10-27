import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseHTML } from 'linkedom';
import { ANALYSIS_PROVIDERS, analysisModels, isAnalysisSelection, selectionForProvider } from '../src/lib/analysis/modelSelection.ts';
import { ModelPicker } from '../src/components/analysis/ModelPicker.tsx';
import { request, AnalysisResponseError, pendingIds, rememberPending } from '../src/lib/analysis/client.ts';

test('UI01 platform models match the server catalog; switching cannot retain another platform model', () => {
  for (const provider of ANALYSIS_PROVIDERS) {
    const selected = selectionForProvider(provider.value);
    assert.equal(isAnalysisSelection(selected), true);
    const { document } = parseHTML(renderToStaticMarkup(React.createElement(ModelPicker, { value: selected, onChange() {} })));
    const selects = document.querySelectorAll('select');
    assert.equal(selects.length, 2);
    assert.equal(selects[0].querySelectorAll('option').length, 3);
    assert.deepEqual([...selects[1].querySelectorAll('option')].map(x => x.value), analysisModels(provider.value).map(x => x.value));
    assert.equal(isAnalysisSelection({ provider: provider.value, model: 'sonar' }), false);
    for (const other of ANALYSIS_PROVIDERS.filter(x => x.value !== provider.value)) assert.equal(isAnalysisSelection({ provider: other.value, model: selected.model }), false);
  }
});
test('UI02 invalid model requires selection and busy state disables the picker', () => {
  const { document } = parseHTML(renderToStaticMarkup(React.createElement(ModelPicker, { value: { provider: 'openai', model: 'claude-sonnet-5' }, disabled: true, onChange() {} })));
  assert.equal(document.querySelector('fieldset').hasAttribute('disabled'), true);
  assert.equal(document.querySelectorAll('select')[1].getAttribute('aria-invalid'), 'true');
  assert.equal(document.querySelectorAll('select')[1].querySelector('option').value, '');
});
test('UI03 response loss/key errors preserve request ID without retry or credential fallback', async () => {
  const original = globalThis.fetch; let calls = 0;
  globalThis.fetch = async (url, init) => { calls++; assert.equal(url, '/api/analysis'); assert.equal(init.credentials, 'same-origin'); assert.equal(init.cache, 'no-store'); return Response.json({ error: 'key needed', needKey: true, jobId: 'request-id' }, { status: 400 }); };
  try { await assert.rejects(request('/api/analysis', 'profile', { id: 'request-id' }), error => error instanceof AnalysisResponseError && error.jobId === 'request-id' && error.needKey); assert.equal(calls, 1); } finally { globalThis.fetch = original; }
});
test('UI04 pending recovery is member scoped and stores request IDs only', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage'); const values = new Map();
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) } });
  try { const id = 'c0ffee00-1111-4111-8111-000000000001'; rememberPending('member-a', id); rememberPending('member-a', id); assert.deepEqual(pendingIds('member-a'), [id]); assert.deepEqual(pendingIds('member-b'), []); assert.deepEqual(JSON.parse(values.get('bnc-pending:member-a')), [id]); rememberPending('member-a', id, true); assert.deepEqual(pendingIds('member-a'), []); } finally { if (original) Object.defineProperty(globalThis, 'sessionStorage', original); else delete globalThis.sessionStorage; }
});
