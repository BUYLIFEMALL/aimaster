// v1.87 (2026-10-22): 글감 출처 규칙
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadTs(file) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInThisContext(`(function (exports, require, module) { ${output}\n})`)(module.exports, () => ({}), module);
  return module.exports;
}

const s = loadTs('utils/postSource.ts');
const ME = '11111111-1111-1111-1111-111111111111';
const ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const NOW = new Date('2026-10-22T00:00:00Z');
const row = (over = {}) => ({ id: ID, user_id: ME, source_type: 'http', source_input: 'https://news.example.com/a/1', created_at: '2026-10-20T00:00:00Z', ...over });

test('본인 글감이고 30일 안이면 출처를 만든다', () => {
  const src = s.buildPostSource(row(), ME, NOW);
  assert.equal(src.candidateId, ID);
  assert.equal(src.kind, 'http');
  assert.equal(src.url, 'https://news.example.com/a/1');
  assert.equal(src.collectedAt, '2026-10-20T00:00:00.000Z');
  assert.equal(src.expiresAt, '2026-11-19T00:00:00.000Z');
});

test('다른 회원·30일 지남·잘못된 번호는 출처 없음', () => {
  assert.equal(s.buildPostSource(row({ user_id: '22222222-2222-2222-2222-222222222222' }), ME, NOW), null);
  assert.equal(s.buildPostSource(row({ created_at: '2026-09-22T00:00:00Z' }), ME, NOW), null);
  assert.equal(s.buildPostSource(row({ id: '1; drop' }), ME, NOW), null);
  assert.equal(s.buildPostSource(null, ME, NOW), null);
});

test('주소는 http(s)만, 쇼츠·RSS 종류 구분, 저장값 읽기', () => {
  assert.equal(s.buildPostSource(row({ source_input: 'javascript:alert(1)' }), ME, NOW).url, null);
  assert.equal(s.buildPostSource(row({ source_input: 'https://user:pw@x.com/' }), ME, NOW).url, null);
  assert.equal(s.buildPostSource(row({ source_input: 'https://www.youtube.com/shorts/abc' }), ME, NOW).kind, 'shorts');
  assert.equal(s.buildPostSource(row({ source_type: 'rss', source_input: '내 피드' }), ME, NOW).kind, 'rss');
  const saved = s.buildPostSource(row(), ME, NOW);
  assert.deepEqual(s.readPostSource(JSON.parse(JSON.stringify(saved))), saved);
  assert.equal(s.readPostSource({ candidateId: 'x' }), null);
  assert.equal(s.SOURCE_KIND_LABELS.shorts, '유튜브 쇼츠');
});
