// v2.18 후보(병합 A-7): 메모·텍스트 파일 글감 — 메모 검사, 후보에 메모 원문 근거 붙이기, 저장 형식. 네트워크·AI 없음.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { test } = require('node:test');
const load = (rel) => { const m = { exports: {} }; new Function('require', 'module', 'exports', ts.transpileModule(fs.readFileSync(path.join(__dirname, rel), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(require, m, m.exports); return m.exports; };
const memo = load('../src/lib/memoSource.ts');
const bundle = load('../src/lib/sourceBundle.ts');

test('normalizeMemo: line endings, min/max length, type', () => {
  assert.equal(memo.normalizeMemo('  첫째 줄입니다 이건 메모예요\r\n둘째 줄도 있습니다  '), '첫째 줄입니다 이건 메모예요\n둘째 줄도 있습니다');
  assert.throws(() => memo.normalizeMemo('짧음'), /20자 이상/);
  assert.throws(() => memo.normalizeMemo('가'.repeat(8001)), /8,000자/);
  assert.throws(() => memo.normalizeMemo(42), memo.MemoInputError);
});
test('memoCandidates: memo text becomes the grounding source, no external urls', () => {
  const text = '주말 오토캠핑에서 타프 없이 비를 맞았다. 다음엔 3x3 타프를 챙기기로 했다.';
  const [c] = memo.memoCandidates([{ title: '비 오는 캠핑 준비물', content: '요약', category: '캠핑', keywords: ['캠핑'], angle: '경험' }], text);
  assert.equal(c.method, 'memo'); assert.equal(c.source_input, '내 메모'); assert.deepEqual(c.source_urls, []);
  assert.equal(c.source_text, text); assert.equal(c.title, '비 오는 캠핑 준비물');
  const long = memo.memoCandidates([{ title: 't', content: 'c', category: 'x', keywords: [], angle: '' }], '가'.repeat(8000))[0];
  assert.equal(long.source_text.length, 4000);
});
test('memo candidates save as a valid member source bundle (kind memo, no urls)', () => {
  const [c] = memo.memoCandidates([{ title: 't', content: 'c', category: 'x', keywords: [], angle: '' }], '회원이 직접 겪은 일을 적은 메모입니다. 충분히 깁니다.');
  const b = bundle.sourceBundle('id-1', 'user-1', c, c.source_urls);
  assert.equal(b.kind, 'memo'); assert.deepEqual(b.urls, []); assert.equal(b.label, '내 메모');
  assert.ok(bundle.validSource(b, 'user-1')); assert.equal(bundle.validSource(b, 'user-2'), false);
});
