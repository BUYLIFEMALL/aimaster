const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// U10 2차: 글 → 업무 워크스페이스 「받은 업무」 내용(순수 함수)
function load(file) {
  const source = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(output, { module: mod, exports: mod.exports, require: () => { throw Error('no import'); }, Date, Number, String, Object, Math });
  return mod.exports;
}
const { blogPostInboxContent, blogHtmlToMarkdown, kstDate } = load('utils/workInboxContent.ts');

const base = { id: 7, title: '  아침 루틴 5가지  ', excerpt: '하루를 바꾸는\n습관', content: '<h2>첫째</h2><p>물 한 잔&nbsp;마시기</p><img src="x.png"><ul><li>스트레칭</li></ul>', published_at: '2026-11-06T16:30:00Z', created_at: null, naver_input_status: null, naver_input_completed_at: null };

test('KST date: UTC 16:30 is next day in Korea', () => {
  assert.equal(kstDate('2026-11-06T16:30:00Z'), '2026-11-07');
  assert.equal(kstDate(null), null);
  assert.equal(kstDate('bad'), null);
});

test('HTML becomes readable markdown without images and with headings/lists', () => {
  const md = blogHtmlToMarkdown(base.content);
  assert.ok(md.includes('## 첫째'));
  assert.ok(md.includes('물 한 잔 마시기'));
  assert.ok(md.includes('- 스트레칭'));
  assert.ok(!md.includes('<') && !md.includes('x.png'));
  assert.equal(blogHtmlToMarkdown('<p>본문</p><hr><h3>🎨 생성 이미지 AI 프롬프트</h3><p>비밀 프롬프트</p>'), '본문');
});

test('not-yet-sent post: draft, written date as 예약일, summary first line (calendar memo)', () => {
  const c = blogPostInboxContent(base);
  assert.equal(c.title, '아침 루틴 5가지');
  assert.equal({ ...c.data }['채널'], '네이버 블로그');
  assert.equal(c.data['상태'], 'draft');
  assert.equal(c.data['예약일'], '2026-11-07');
  assert.equal(c.data['발행 주소'], undefined);
  assert.equal(c.bodyMd.split('\n')[0], '하루를 바꾸는 습관');
  assert.ok(c.bodyMd.includes('아직 보내지 않음'));
});

test('naver input done uses input date; failed keeps failed; empty title gets fallback', () => {
  const done = blogPostInboxContent({ ...base, naver_input_status: 'publish_ready', naver_input_completed_at: '2026-11-08T01:00:00Z' });
  assert.equal(done.data['예약일'], '2026-11-08');
  assert.equal(done.data['상태'], 'draft');
  assert.ok(done.bodyMd.includes('발행은 직접'));
  const failed = blogPostInboxContent({ ...base, title: '', naver_input_status: 'failed' });
  assert.equal(failed.data['상태'], 'failed');
  assert.equal(failed.title, '제목 없는 글');
});
