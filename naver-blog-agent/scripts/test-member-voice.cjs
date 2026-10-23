// v2.17 후보(병합 A-4): 화자 직접 입력·검사, 본인 경험 메모, 경험 질문 응답 정리. 네트워크·AI 없음.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { test } = require('node:test');
const m = { exports: {} };
new Function('require', 'module', 'exports', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/memberVoice.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(require, m, m.exports);
const v = m.exports;

test('custom persona prompt is built by the server from the member description', () => {
  const p = v.normalizePersona({ id: 'custom', name: ' 캠핑 아빠 ', badge: '아무거나', tonePrompt: '주말 오토캠핑 40대 직장인' });
  assert.equal(p.id, 'custom'); assert.equal(p.name, '캠핑 아빠'); assert.equal(p.badge, '직접 입력');
  assert.match(p.tonePrompt, /「주말 오토캠핑 40대 직장인」인 블로거/); assert.match(p.tonePrompt, /지어내지 않는다/);
  assert.throws(() => v.normalizePersona({ id: 'custom', name: '가'.repeat(21), tonePrompt: '설명' }), /20자/);
  assert.throws(() => v.normalizePersona({ id: 'custom', name: '이름', tonePrompt: '가'.repeat(201) }), /200자/);
  assert.throws(() => v.normalizePersona({ id: 'custom', name: '이름', tonePrompt: '  ' }), v.VoiceInputError);
});
test('preset personas are length-checked and passed through; missing persona is undefined', () => {
  const preset = { id: 'housewife', name: '살림 9단 주부', badge: '찐후기', tonePrompt: '너는 살림 9단 주부 블로거야.' };
  assert.deepEqual(v.normalizePersona(preset), preset);
  assert.equal(v.normalizePersona(undefined), undefined);
  assert.throws(() => v.normalizePersona({ ...preset, tonePrompt: '가'.repeat(301) }), /300자/);
  assert.throws(() => v.normalizePersona('x'), v.VoiceInputError);
});
test('experience memo: trimmed, max 1,500, blocks empty without input', () => {
  assert.equal(v.normalizeExperience('  타프 없이 비를 맞았어요 \r\n'), '타프 없이 비를 맞았어요');
  assert.throws(() => v.normalizeExperience('가'.repeat(1501)), /1500자/);
  assert.equal(v.buildExperienceBlock(''), ''); assert.equal(v.buildExperienceReviewRule(''), '');
  assert.match(v.buildExperienceBlock('타프'), /1인칭 경험은 여기 적힌 것만/);
  assert.match(v.buildExperienceReviewRule('타프'), /지어낸 문장이 있으면 WARN/);
});
test('experience questions: strings only, max 5, trimmed to 120', () => {
  assert.deepEqual(v.readExperienceQuestions({ questions: [' 언제 갔나요? ', 3, '', 'b', 'c', 'd', 'e', 'f'] }), ['언제 갔나요?', 'b', 'c', 'd', 'e']);
  assert.deepEqual(v.readExperienceQuestions(null), []);
  assert.equal(v.readExperienceQuestions({ questions: ['가'.repeat(200)] })[0].length, 120);
});
