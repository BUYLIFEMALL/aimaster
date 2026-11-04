// v1.15: 12월 Gemini 2.5 종료 대비 모델 교체(옛 저장값 변환) + 30일 열외 회원의 「무기한 보관」 표시.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { AI_MODEL_OPTIONS, DEFAULT_MODEL_BY_PROVIDER, currentAiModel } from '../src/lib/analysis/models.ts';
import { generation } from '../src/lib/analysis/contracts.ts';
import { generateJson } from '../src/lib/analysis/provider.ts';
import { retention, isUnlimitedRetention } from '../src/lib/analysis/client.ts';

const profileInput = model => ({ id: randomUUID(), provider: 'gemini', model, externalAiConfirmed: true, materialIds: [randomUUID()],
  preferences: { requiredTopics: [], excludedTopics: [], region: '', scale: 'any', styleSamples: [] } });

test('V115-01 Gemini choices no longer offer retiring 2.5 / auto-redirected 3.7 models', () => {
  const gemini = AI_MODEL_OPTIONS.filter(o => o.provider === 'gemini').map(o => o.value);
  assert.deepEqual(gemini, ['gemini-3.5-flash-lite', 'gemini-3.8-flash']);
  assert.equal(DEFAULT_MODEL_BY_PROVIDER.gemini, 'gemini-3.5-flash-lite');
});

test('V115-02 saved retired model values are converted before validation and before the call', async () => {
  assert.equal(currentAiModel('gemini-2.5-pro'), 'gemini-3.8-flash');
  assert.equal(currentAiModel('gemini-2.5-flash'), 'gemini-3.8-flash');
  assert.equal(currentAiModel('gemini-2.5-flash-lite'), 'gemini-3.5-flash-lite');
  assert.equal(currentAiModel('gemini-3.7-flash'), 'gemini-3.8-flash');
  assert.equal(currentAiModel('claude-haiku-4-5'), 'claude-haiku-4-5');
  assert.equal(generation('profile', profileInput('gemini-3.7-flash')).input.model, 'gemini-3.8-flash');
  assert.equal(generation('profile', profileInput('gemini-2.5-flash-lite')).input.model, 'gemini-3.5-flash-lite');
  assert.throws(() => generation('profile', profileInput('gemini-1.0-unknown')));
  let calledUrl = '';
  await assert.rejects(generateJson('gemini', 'gemini-2.5-pro', 'fixture-key', 's', 'u', async url => { calledUrl = String(url); throw new Error('stop'); }));
  assert.match(calledUrl, /\/models\/gemini-3\.8-flash:generateContent$/);
});

test('V115-03 exempt members see 「무기한 보관」; normal members still see the 30-day date', () => {
  assert.equal(isUnlimitedRetention('9999-12-31T00:00:00+00:00'), true);
  assert.equal(retention('9999-12-31T00:00:00+00:00', '자료 보관 기한'), '무기한 보관');
  assert.equal(isUnlimitedRetention('2026-12-04T03:00:00+00:00'), false);
  assert.match(retention('2026-12-04T03:00:00+00:00', '자료 보관 기한'), /^자료 보관 기한 2026\. 12\. 4\./);
  assert.equal(isUnlimitedRetention('not-a-date'), false);
});
