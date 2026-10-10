const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// 글(HTML) → 티스토리 입력 블록 변환기를 실제 코드로 시험한다. 티스토리 화면·DB 없음.
function loadTs(file, mockRequire) {
  const source = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  vm.runInThisContext(`(function (exports, require, module) { ${output}\n})`)(module.exports, mockRequire, module);
  return module.exports;
}
const requireMap = (name) => {
  if (name === 'server-only') return {};
  if (name === 'cheerio') return require('cheerio');
  if (name.endsWith('/stripImageSchema')) return stripImageSchema;
  if (name.endsWith('/duplicateTitle')) return duplicateTitle;
  throw Error(`Unexpected import: ${name}`);
};
const stripImageSchema = loadTs('utils/stripImageSchema.ts', requireMap);
const duplicateTitle = loadTs('utils/duplicateTitle.ts', requireMap);
const { htmlToInputBlocks } = loadTs('utils/extensionContent.ts', requireMap);

const SUMMARY = '<blockquote class="border-l-4 border-indigo-500 bg-indigo-50/60 text-slate-700 p-4 rounded-r-xl my-4 text-sm font-medium leading-relaxed">요약 문장입니다.</blockquote>';
const P = '<p class="leading-relaxed mb-5 text-slate-800">본문 문단입니다.</p>';
const H2 = '<h2 class="text-xl font-extrabold text-slate-900 mt-8 mb-3 pb-1 border-b border-slate-100">큰 소제목</h2>';
const H3 = '<h3 class="text-base font-bold text-slate-900 mt-6 mb-2">작은 소제목</h3>';
const UL = '<ul class="list-disc list-inside space-y-1.5 mb-4 text-slate-800"><li>첫째 항목</li><li>둘째 항목</li></ul>';
const FIGURE = '<p class="leading-relaxed mb-5 text-slate-800"><figure class="my-6 group cursor-zoom-in"><img src="https://example.com/a.jpg" alt="그림 비주얼" class="w-full rounded-2xl" /><figcaption class="text-center text-xs">📷 그림 비주얼 (클릭하여 고화질 확대)</figcaption></figure></p>';
const htmlOf = (html) => htmlToInputBlocks(html, '다른 제목').blocks.filter((block) => block.type === 'html').map((block) => block.html);

test('the summary quote box becomes a paragraph with the same look (left blue bar, light background, italic) so the Tistory theme quote glyph is not added', () => {
  const [html] = htmlOf(SUMMARY);
  assert.ok(html.startsWith('<p '), html); assert.ok(!/<blockquote/i.test(html));
  for (const part of ['border-width: 0 0 0 4px', 'border-style: solid', 'border-color: #cbd5e1', 'background-color: #eef2ff', 'padding: 1rem', 'margin-top: 1rem', 'margin-bottom: 1rem', 'font-style: italic', 'border-radius: 0 0.75rem 0.75rem 0', 'font-size: 0.875rem', 'font-weight: 500']) assert.ok(html.includes(part), `${part} missing in ${html}`);
  assert.ok(!/class=/.test(html), 'no Tailwind class leaks to Tistory');
});

test('a plain blockquote without our box classes stays a real quote', () => {
  const [html] = htmlOf('<blockquote>그냥 인용입니다.</blockquote>');
  assert.ok(html.startsWith('<blockquote'), html);
});

test('paragraphs, headings and lists keep the spacing, lines and bullet position of the web page', () => {
  const [p, h2, h3, ul] = htmlOf(`${P}${H2}${H3}${UL}`);
  assert.ok(p.includes('margin-bottom: 1.25rem') && p.includes('line-height: 1.625') && p.includes('color: #1e293b'), p);
  assert.ok(h2.includes('margin-top: 2rem') && h2.includes('margin-bottom: 0.75rem') && h2.includes('padding-bottom: 0.25rem') && h2.includes('border-width: 0 0 1px 0') && h2.includes('border-style: solid') && h2.includes('font-size: 1.25rem') && h2.includes('font-weight: 800'), h2);
  assert.ok(h3.includes('margin-top: 1.5rem') && h3.includes('margin-bottom: 0.5rem') && h3.includes('font-weight: 700'), h3);
  assert.ok(ul.includes('list-style-type: disc') && ul.includes('list-style-position: inside') && ul.includes('margin-bottom: 1rem'), ul);
  assert.equal((ul.match(/<li style="margin-bottom: 0\.375rem/g) || []).length, 2, 'every list item gets the web page spacing');
});

test('a horizontal rule is sent as a thin light line instead of the theme dots', () => {
  const blocks = htmlToInputBlocks('<p class="mb-5">앞</p><hr><p class="mb-5">뒤</p>', '다른 제목').blocks;
  const rule = blocks.find((block) => block.type === 'html' && block.text === '');
  assert.ok(rule && !/<hr/i.test(rule.html) && rule.html.includes('border-top: 1px solid #e2e8f0'), JSON.stringify(rule));
});

test('images stay separate blocks in order (captions meant for the web page are dropped) and the text blocks around them keep their order', () => {
  const blocks = htmlToInputBlocks(`${SUMMARY}${FIGURE}${H2}${P}`, '다른 제목').blocks;
  assert.deepEqual(blocks.map((block) => block.type), ['html', 'image', 'html', 'html']);
  assert.equal(blocks[1].url, 'https://example.com/a.jpg');
  assert.ok(!JSON.stringify(blocks).includes('클릭하여 고화질 확대'));
});

test('hashtag lines become tags, never body text; no class, id, event or data attribute is sent to Tistory', () => {
  const { blocks, tags } = htmlToInputBlocks(`${P}<p class="x" onclick="alert(1)" id="a" data-x="1">#태그1 #태그2</p><a class="btn" href="https://a.example/x" data-y="2">링크</a>`, '다른 제목');
  assert.deepEqual(tags, ['태그1', '태그2']);
  const all = blocks.filter((block) => block.type === 'html').map((block) => block.html).join('');
  assert.ok(!/ class=|onclick|id=|data-/.test(all), all);
});

test('the real post sample renders every block type the generator produces', () => {
  const sample = `${SUMMARY}${FIGURE}${H2}${P}${H3}${UL}<hr>`;
  const { blocks } = htmlToInputBlocks(sample, '다른 제목');
  const html = blocks.filter((block) => block.type === 'html').map((block) => block.html).join('\n');
  for (const tag of ['<h2 ', '<h3 ', '<ul ', '<li ', '<p ']) assert.ok(html.includes(tag), tag);
  assert.ok(!/class=/.test(html));
});

test('borders are drawn only on the sides that have a width and in a light gray — no dark box around the quote or the headings (v1.65 real post)', () => {
  const [quote] = htmlOf(SUMMARY);
  const [h2] = htmlOf(H2);
  // 두께를 주지 않은 변이 기본 두께로 그려지지 않도록 네 변을 모두 명시한다.
  assert.ok(quote.includes('border-width: 0 0 0 4px') && h2.includes('border-width: 0 0 1px 0'));
  assert.ok(!/border-(top|right|bottom|left)-width/.test(quote + h2), 'no partial per-side width that leaves the other sides at the default');
  assert.ok(!quote.includes('#6366f1') && quote.includes('#cbd5e1'), 'the quote bar is light gray, not the indigo accent');
  assert.ok(h2.includes('border-color: #f1f5f9'));
});
