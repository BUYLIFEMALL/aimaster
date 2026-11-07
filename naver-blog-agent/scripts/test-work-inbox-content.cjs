// U10 2차: 원고 → 업무 워크스페이스 「받은 업무」 내용(순수 함수, 실제 TS 파일을 그대로 실행)
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { test } = require('node:test');

const js = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/workInboxContent.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const m = { exports: {} };
new Function('module', 'exports', js)(m, m.exports);
const { nbaPostInboxContent, nbaContentToMarkdown, kstDate } = m.exports;

const base = { id: '0b2f0f4e-1111-4222-8333-444455556666', title: ' 가을 캠핑 준비물 ', content: '[SECTION - 텐트 고르기]\n방수 텐트가 기본입니다.\n[IMAGE INSERT - 1]\n\n\n\n바닥 매트도 챙기세요.', tags: ['캠핑', '#가을'], category_name: '여행', status: 'draft', is_reserved: false, scheduled_at: null, published_at: null, post_url: null };

test('markers: section becomes heading, image marker removed, blank lines collapsed', () => {
  assert.equal(nbaContentToMarkdown(base.content), '## 텐트 고르기\n방수 텐트가 기본입니다.\n\n바닥 매트도 챙기세요.');
  assert.equal(kstDate('2026-11-06T16:30:00Z'), '2026-11-07');
});

test('draft without schedule has no date (no calendar button), tags and meta in body', () => {
  const c = nbaPostInboxContent(base);
  assert.equal(c.title, '가을 캠핑 준비물');
  assert.deepEqual({ ...c.data }, { 채널: '네이버 블로그', 상태: 'draft' });
  assert.ok(c.bodyMd.startsWith('## 텐트 고르기'));
  assert.ok(c.bodyMd.includes('#캠핑 #가을'));
  assert.ok(c.bodyMd.includes('- 카테고리: 여행'));
});

test('queued post sends 예약일 in KST', () => {
  const c = nbaPostInboxContent({ ...base, status: 'queued', is_reserved: true, scheduled_at: '2026-11-09T15:30:00Z' });
  assert.equal(c.data['예약일'], '2026-11-10');
  assert.equal(c.data['발행일'], undefined);
});

test('published post sends 발행일 and 발행 주소, not 예약일', () => {
  const c = nbaPostInboxContent({ ...base, status: 'published', is_reserved: true, scheduled_at: '2026-11-01T00:00:00Z', published_at: '2026-11-02T03:00:00Z', post_url: 'https://blog.naver.com/me/123' });
  assert.equal(c.data['발행일'], '2026-11-02');
  assert.equal(c.data['예약일'], undefined);
  assert.equal(c.data['발행 주소'], 'https://blog.naver.com/me/123');
  assert.equal(nbaPostInboxContent({ ...base, title: '' }).title, '제목 없는 원고');
});
