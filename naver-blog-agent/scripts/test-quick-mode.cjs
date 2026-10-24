// E-3·E-4 간편 모드: AI 추천값 정리·간편 원고 범위 판정. 네트워크·AI 없음.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { test } = require('node:test');
const m = { exports: {} };
new Function('require', 'module', 'exports', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/quickMode.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(require, m, m.exports);
const q = m.exports;
const ids = ['housewife', 'single', 'tech'];

test('suggestion: preset persona kept, subs deduped and capped, empty main → null', () => {
  const s = q.readQuickSuggestion({ mainKeyword: ' 경기도 실내 체험관 ', subKeywords: ['경기도 실내 체험관', '아이와 가볼만한곳', '아이와 가볼만한곳', '비 오는 날', 'a', 'b', 'c'], category: '육아/나들이', purpose: '주말 계획', persona: { id: 'housewife' } }, ids);
  assert.equal(s.mainKeyword, '경기도 실내 체험관');
  assert.deepEqual(s.subKeywords, ['아이와 가볼만한곳', '비 오는 날', 'a', 'b', 'c']);
  assert.deepEqual(s.persona, { id: 'housewife', name: '', desc: '' });
  assert.equal(q.quickKeywords(s), '경기도 실내 체험관, 아이와 가볼만한곳, 비 오는 날, a, b, c');
  assert.equal(q.readQuickSuggestion({ subKeywords: ['x'] }, ids), null);
  assert.equal(q.readQuickSuggestion('x', ids), null);
});
test('suggestion: custom persona needs name+desc, else falls back to first preset; category default', () => {
  const c = q.readQuickSuggestion({ mainKeyword: '캠핑', persona: { id: 'custom', name: '캠핑 아빠'.repeat(5), desc: '주말 캠핑 40대' } }, ids);
  assert.equal(c.persona.id, 'custom'); assert.equal(c.persona.name.length, 20); assert.equal(c.category, '일반');
  assert.equal(q.readQuickSuggestion({ mainKeyword: '캠핑', persona: { id: 'unknown' } }, ids).persona.id, 'housewife');
});
test('E-4 scope: quick members see only quick posts; full members see all', () => {
  const quickPost = { research_summary: { mode: 'quick', naver: {} } };
  const fullPost = { research_summary: { naver: {} } };
  assert.equal(q.isQuickPost(quickPost), true);
  assert.equal(q.isQuickPost(fullPost), false);
  assert.equal(q.isQuickPost({ research_summary: null }), false);
  assert.equal(q.isQuickPost(null), false);
  assert.equal(q.scopeAllowsPost('quick', quickPost), true);
  assert.equal(q.scopeAllowsPost('quick', fullPost), false);
  assert.equal(q.scopeAllowsPost('quick', null), false);
  assert.equal(q.scopeAllowsPost('full', fullPost), true);
  assert.equal(q.scopeAllowsPost('full', quickPost), true);
});
