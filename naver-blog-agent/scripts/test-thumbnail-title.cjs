// v2.18 후보(병합 A-6): 대표 이미지 제목 글자 — 줄 나누기·주소 바꾸기·되돌리기. 캔버스·네트워크·AI 없음.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { test } = require('node:test');
const m = { exports: {} };
new Function('require', 'module', 'exports', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/thumbnailTitle.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(require, m, m.exports);
const t = m.exports;
const measure = (s) => Array.from(s).length * 10; // 글자 하나 폭 10

test('wrapTitle: wraps by width, max 3 lines with ellipsis, empty title', () => {
  assert.deepEqual(t.wrapTitle('가나다라마바', measure, 30), ['가나다', '라마바']);
  const long = t.wrapTitle('가'.repeat(20), measure, 50);
  assert.equal(long.length, 3); assert.ok(long[2].endsWith('…')); assert.equal(Array.from(long[2]).length, 5);
  assert.deepEqual(t.wrapTitle('   ', measure, 50), []);
  assert.deepEqual(t.wrapTitle('2026년  전기차   보조금', measure, 1000), ['2026년 전기차 보조금']);
});
test('apply keeps the first original; restore brings it back; body order unchanged', () => {
  const images = [{ type: 'thumbnail', url: 'https://x/orig', caption: 't', prompt: '' }, { type: 'body', url: 'https://x/1', caption: '1', prompt: '' }, { type: 'body', url: 'https://x/2', caption: '2', prompt: '' }];
  const once = t.applyThumbnailUrl(images, 'https://x/title1');
  assert.equal(once[0].url, 'https://x/title1'); assert.equal(once[0].originalUrl, 'https://x/orig');
  const twice = t.applyThumbnailUrl(once, 'https://x/title2');
  assert.equal(twice[0].originalUrl, 'https://x/orig');
  assert.deepEqual(twice.slice(1), images.slice(1));
  const back = t.restoreThumbnailUrl(twice);
  assert.equal(back[0].url, 'https://x/orig'); assert.equal('originalUrl' in back[0], false);
  assert.deepEqual(t.restoreThumbnailUrl(images), images);
});
test('private member photos and missing thumbnails are never targeted', () => {
  const priv = [{ type: 'thumbnail', url: 'https://x/signed', storagePath: 'owner/a.jpg', caption: 't', prompt: '' }];
  assert.equal(t.canTitleThumbnail(priv[0]), false);
  assert.equal(t.applyThumbnailUrl(priv, 'https://x/new')[0].url, 'https://x/signed');
  assert.equal(t.canTitleThumbnail({ type: 'thumbnail', caption: 't', prompt: '' }), false);
  assert.equal(t.canTitleThumbnail({ type: 'body', url: 'https://x/1', caption: '1', prompt: '' }), false);
});
