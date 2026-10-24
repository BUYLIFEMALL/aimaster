// E-3 간편 모드: AI 추천값 정리·작성 화면 넘겨받기 검사. 네트워크·AI 없음.
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
test('quick start: valid payload within 10 minutes only, image 1~5, custom needs name/desc', () => {
  const now = 1_000_000_000;
  const ok = { topic: '실내 체험관', keywords: 'a, b', category: '육아', purpose: 'p', persona: { id: 'tech', name: '', desc: '' }, imageCount: 2, at: now - 1000 };
  assert.equal(q.readQuickStart(JSON.stringify(ok), now).imageCount, 2);
  assert.equal(q.readQuickStart(JSON.stringify({ ...ok, at: now - 11 * 60_000 }), now), null);
  assert.equal(q.readQuickStart(JSON.stringify({ ...ok, imageCount: 0 }), now), null);
  assert.equal(q.readQuickStart(JSON.stringify({ ...ok, imageCount: 6 }), now), null);
  assert.equal(q.readQuickStart(JSON.stringify({ ...ok, topic: ' ' }), now), null);
  assert.equal(q.readQuickStart(JSON.stringify({ ...ok, persona: { id: 'custom', name: '이름', desc: '' } }), now), null);
  assert.equal(q.readQuickStart('{bad', now), null);
  assert.equal(q.readQuickStart(null, now), null);
});
