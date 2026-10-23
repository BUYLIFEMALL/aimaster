// v2.18 후보(병합 A-5): 본문 이미지 위치를 소제목 단위로 옮기기. 네트워크·AI 없음.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { test } = require('node:test');
const m = { exports: {} };
new Function('require', 'module', 'exports', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/draftImages.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(require, m, m.exports);
const d = m.exports;
const { articlePlan } = require('../extension/article-plan.js');

const article = [
  '도입 문단입니다.',
  '[SECTION - 첫째]',
  '[IMAGE INSERT - 본문 1 · 첫째]',
  '첫째 문단 A',
  '첫째 문단 B',
  '[SECTION - 둘째]',
  '둘째 문단 A',
  '[IMAGE INSERT - 본문 2 · 둘째]',
  '둘째 문단 B',
  '[SECTION - 셋째]',
  '셋째 문단 A',
].join('\n');
const textLines = (s) => s.split(/\r?\n/).filter((l) => !/^\s*\[IMAGE INSERT/.test(l));
// 서버 extensionBridge처럼 N번째 표시를 숫자 N으로 바꾼 뒤 확장 배치를 본다.
const numbered = (s) => { let n = 0; return s.split('\n').map((l) => /^\s*\[IMAGE INSERT/.test(l) ? `[IMAGE INSERT - ${++n}]` : l).join('\n'); };
const sectionOfImage = (s) => { let sec = '도입'; const out = []; for (const b of articlePlan(numbered(s))) { if (b.type === 'section') sec = b.text; if (b.type === 'image') out.push(sec); } return out; };

test('down: image moves to the top of the next section; body lines unchanged', () => {
  const r = d.moveImageMarker(article, 0, 'down');
  assert.deepEqual(textLines(r.content), textLines(article));
  assert.deepEqual([r.from, r.to], [0, 0]);
  assert.match(r.content, /\[SECTION - 둘째\]\n\[IMAGE INSERT - 본문 1 · 첫째\]\n둘째 문단 A/);
  assert.deepEqual(sectionOfImage(r.content), ['둘째', '둘째']);
});
test('up: image moves to the previous section, after images already at its top', () => {
  const twoTop = article.replace('[SECTION - 둘째]\n둘째 문단 A\n[IMAGE INSERT - 본문 2 · 둘째]', '[SECTION - 둘째]\n[IMAGE INSERT - 본문 2 · 둘째]\n둘째 문단 A');
  const r = d.moveImageMarker(twoTop, 1, 'up');
  assert.match(r.content, /\[SECTION - 첫째\]\n\[IMAGE INSERT - 본문 1 · 첫째\]\n\[IMAGE INSERT - 본문 2 · 둘째\]\n첫째 문단 A/);
  assert.deepEqual([r.from, r.to], [1, 1]);
  assert.deepEqual(sectionOfImage(r.content), ['첫째', '첫째']);
});
test('passing another image swaps the order, and reorderBodyImages follows it', () => {
  const down = d.moveImageMarker(d.moveImageMarker(article, 0, 'down').content, 0, 'down');
  assert.deepEqual(sectionOfImage(down.content), ['둘째', '셋째']);
  assert.deepEqual([down.from, down.to], [0, 1]);
  const images = [{ type: 'thumbnail', url: 'https://x/t', caption: 't', prompt: '' }, { type: 'body', url: 'https://x/1', caption: '1', prompt: '' }, { type: 'body', caption: '계획', prompt: '' }, { type: 'body', url: 'https://x/2', caption: '2', prompt: '' }];
  const next = d.reorderBodyImages(images, 0, 1);
  assert.deepEqual(next.map((i) => i.caption), ['t', '2', '계획', '1']);
  assert.equal(d.bodyImageAt(next, 1).caption, '1');
  assert.equal(d.reorderBodyImages(images, 0, 5), images);
});
test('edges: intro and last section, no sections, missing slot; CRLF kept', () => {
  const r = d.moveImageMarker(article, 0, 'up');
  assert.match(r.content, /도입 문단입니다\.\n\[IMAGE INSERT - 본문 1 · 첫째\]\n\[SECTION - 첫째\]/);
  assert.deepEqual(sectionOfImage(r.content), ['도입', '둘째']);
  assert.equal(d.moveImageMarker(r.content, 0, 'up'), null);
  const last = d.moveImageMarker(article, 1, 'down');
  assert.equal(d.moveImageMarker(last.content, 1, 'down'), null);
  assert.equal(d.moveImageMarker('문단\n[IMAGE INSERT - 1]\n문단', 0, 'down'), null);
  assert.equal(d.moveImageMarker(article, 5, 'down'), null);
  const crlf = d.moveImageMarker(article.replace(/\n/g, '\r\n'), 0, 'down');
  assert.ok(crlf.content.includes('\r\n') && !/[^\r]\n/.test(crlf.content));
  assert.equal(d.countImageMarkers(article), 2);
});
