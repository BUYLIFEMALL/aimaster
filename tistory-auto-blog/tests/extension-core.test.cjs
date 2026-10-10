const { test } = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../extension/tistory-core.js');

test('verification samples ignore spaces, punctuation and case; long paragraphs use a front and a back sample', () => {
  assert.deepEqual(Core.verificationSamples('Hello,  World!!'), ['helloworld']);
  assert.deepEqual(Core.verificationSamples(''), []);
  const long = '가나다라마바사아자차카타파하'.repeat(10);
  const samples = Core.verificationSamples(long);
  assert.equal(samples.length, 2); assert.ok(samples.every((s) => s.length === 48));
});

test('matchTextBlocks counts paragraphs, formatted blocks and links that appear in the body text (formatting differences are tolerated)', () => {
  const blocks = [{ type: 'text', text: '첫 문단 입니다.' }, { type: 'html', html: '<h2>제목</h2>', text: '제목 목록' }, { type: 'link', text: '링크', url: 'https://a.example/x' }, { type: 'image', url: 'https://x/1.png' }];
  const ok = Core.matchTextBlocks(blocks, '첫  문단입니다\n제목\n목록\n링크 https://a.example/x');
  assert.deepEqual({ matched: ok.matched, total: ok.total, bodyEmpty: ok.bodyEmpty }, { matched: 3, total: 3, bodyEmpty: false });
  const partial = Core.matchTextBlocks(blocks, '첫 문단입니다');
  assert.equal(partial.matched, 1); assert.equal(partial.total, 3);
  assert.equal(Core.matchTextBlocks(blocks, '').bodyEmpty, true);
  assert.equal(Core.matchTextBlocks([], 'x').total, 0);
});

test('expectedStructure finds the supported semantic tags (the ones that must survive in the editor)', () => {
  assert.deepEqual(Core.expectedStructure('<h2>a</h2><p>b</p><ul><li>c</li></ul><a href="x">y</a>'), ['h2', 'ul', 'a']);
  assert.deepEqual(Core.expectedStructure('<p>plain</p>'), []);
  assert.deepEqual(Core.expectedStructure('<table><tr><td>1</td></tr></table><blockquote>q</blockquote>'), ['blockquote', 'table']);
});

test('tags are cleaned, de-duplicated and limited to 30; body hashtags are not tags', () => {
  assert.deepEqual(Core.normalizeTags(['#경제', ' 투자 ', '경제', '', '#']), ['경제', '투자']);
  assert.deepEqual(Core.normalizeTags('a, b\n#c,a'), ['a', 'b', 'c']);
  assert.equal(Core.normalizeTags(Array.from({ length: 50 }, (_, i) => `t${i}`)).length, 30);
  assert.deepEqual(Core.normalizeTags(null), []);
});

test('the publish dialog is opened only when something differs from the Tistory defaults (public, comments allowed, now, no home topic)', () => {
  const base = { visibility: 'public', comment: 'allow', topic: '', timing: 'now' };
  assert.equal(Core.needsPublishDialog(base), false);
  for (const change of [{ visibility: 'private' }, { comment: 'deny' }, { topic: '경제' }, { timing: 'reserve' }]) assert.equal(Core.needsPublishDialog({ ...base, ...change }), true);
});

test('blog names are taken from plain names, tistory addresses and urls; anything else is empty', () => {
  for (const input of ['myblog', 'MyBlog', 'myblog.tistory.com', 'https://myblog.tistory.com/', 'https://myblog.tistory.com/manage/newpost?x=1', ' my-blog ']) assert.equal(Core.normalizeBlogName(input), input.trim().toLowerCase().replace(/^https?:\/\//, '').split(/[/?#]/)[0].replace(/\.tistory\.com$/, ''));
  for (const input of ['', '   ', '내블로그', 'a b', '-bad', 'x'.repeat(51), 'https://evil.example/myblog', 'my_blog']) assert.equal(Core.normalizeBlogName(input), '', input);
});

test('only the connected blog\'s own editor address counts as the editor', () => {
  assert.equal(Core.isOwnEditorUrl('https://myblog.tistory.com/manage/newpost/?type=post', 'myblog'), true);
  assert.equal(Core.isOwnEditorUrl('https://myblog.tistory.com/manage/post/12', 'myblog'), true);
  assert.equal(Core.isOwnEditorUrl('https://MyBlog.tistory.com/manage/newpost', 'myblog'), true);
  for (const url of ['https://other.tistory.com/manage/newpost', 'https://myblog.tistory.com/', 'https://myblog.tistory.com/manage/posts/', 'http://myblog.tistory.com/manage/newpost', 'https://evil.example/manage/newpost', 'https://myblog.tistory.com.evil.example/manage/newpost', 'not a url', '']) assert.equal(Core.isOwnEditorUrl(url, 'myblog'), false, url);
  assert.equal(Core.editorUrl('myblog').startsWith('https://myblog.tistory.com/manage/newpost/'), true);
});

test('login addresses are recognised so the worker waits for the member instead of failing', () => {
  assert.equal(Core.isLoginUrl('https://accounts.kakao.com/login?continue=x'), true);
  assert.equal(Core.isLoginUrl('https://www.tistory.com/auth/login'), true);
  assert.equal(Core.isLoginUrl('https://myblog.tistory.com/manage/newpost'), false);
  assert.equal(Core.isLoginUrl('garbage'), false);
});

test('browser errors become short Korean explanations', () => {
  assert.match(Core.formatBrowserError(new Error('Another debugger is already attached'), '입력'), /다른 디버거/);
  assert.match(Core.formatBrowserError(new Error('No tab with id: 3'), '입력'), /탭이 닫혔/);
  assert.match(Core.formatBrowserError(new Error('Cannot access contents of url'), '입력'), /접근 권한/);
  assert.match(Core.formatBrowserError(new Error('boom'), '입력'), /입력 실패: boom/);
});
