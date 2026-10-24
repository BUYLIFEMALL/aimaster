// E-5: 세 가지 포스팅 방식 ↔ 저장 값(executionMode × 예약) 변환과 안내 문장. 네트워크·AI 없음.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { test } = require('node:test');
const m = { exports: {} };
new Function('require', 'module', 'exports', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/publishChoice.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(require, m, m.exports);
const c = m.exports;

test('saved values map to exactly one of the three choices (legacy prepare+reserved stays prepare)', () => {
  assert.equal(c.choiceOf('prepare', false), 'prepare');
  assert.equal(c.choiceOf('prepare', true), 'prepare');
  assert.equal(c.choiceOf('publish', false), 'publish');
  assert.equal(c.choiceOf('publish', true), 'schedule');
  assert.deepEqual(c.PUBLISH_CHOICES.map((x) => x.value), ['prepare', 'publish', 'schedule']);
});
test('choices map back to saved values; prepare keeps the prefill-reservation option', () => {
  assert.deepEqual(c.applyChoice('publish', true), { executionMode: 'publish', reserved: false });
  assert.deepEqual(c.applyChoice('schedule', false), { executionMode: 'publish', reserved: true });
  assert.deepEqual(c.applyChoice('prepare', true), { executionMode: 'prepare', reserved: true });
  assert.deepEqual(c.applyChoice('prepare', false), { executionMode: 'prepare', reserved: false });
  for (const v of ['prepare', 'publish', 'schedule']) { const s = c.applyChoice(v, v === 'schedule'); assert.equal(c.choiceOf(s.executionMode, s.reserved), v); }
});
test('summary line states what the extension will do', () => {
  assert.match(c.choiceSummary('prepare', false), /발행 버튼은 직접/);
  assert.match(c.choiceSummary('publish', false), /바로 발행/);
  assert.match(c.choiceSummary('publish', true, '2026-10-25T14:10'), /10월 25일 14:10에 예약 발행/);
  assert.match(c.choiceSummary('publish', true, ''), /시각을 저장/);
  assert.match(c.choiceSummary('prepare', true, '2026-10-25T09:00'), /예약 시각\(10월 25일 09:00\)/);
});
