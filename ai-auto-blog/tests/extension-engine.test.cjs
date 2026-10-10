const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Core = require('../extension/blog-core.js');
const { runInputTask, TaskError } = require('../extension/blog-engine.js');

// 네이버 편집기를 흉내 내는 가짜 adapter로 입력 엔진을 시험한다. 실제 네이버·유료 호출 없음.
// 가짜 편집기는 문서(제목·문단·이미지)를 갖고, 시험마다 "기존 내용 혼합·중복 입력·글자 누락·붙여넣기 무시·탭 닫힘" 같은 문제를 일부러 일으킨다.
function fakeEditor(options = {}) {
  const doc = { title: '', blocks: [] };
  if (options.existingTitle) doc.title = options.existingTitle;
  if (options.existingBody) doc.blocks.push({ type: 'paragraph', text: options.existingBody });
  const calls = [];
  let cursor = null; // 'title' | 'body'
  let closed = false;
  let typeCalls = 0;
  let aliveCalls = 0;
  let snapshots = 0;
  let pendingPaste = null;
  const addBody = (text) => {
    const parts = String(text).split('\n');
    const last = doc.blocks[doc.blocks.length - 1];
    parts.forEach((part, index) => {
      if (index === 0 && last?.type === 'paragraph') last.text += part;
      else doc.blocks.push({ type: 'paragraph', text: part });
    });
  };
  const adapter = {
    doc, calls,
    async ensureAlive() { aliveCalls += 1; if (options.foreignAtAlive && aliveCalls === options.foreignAtAlive) doc.blocks.push({ type: 'paragraph', text: '외부에서 붙여넣은 문장' }); if (closed || (options.closeAfterCalls && calls.length >= options.closeAfterCalls)) throw new TaskError('TAB_CLOSED', 'closed'); },
    async prepareEditor(args) { calls.push('prepare'); if (options.prepareError) throw options.prepareError; options.onPrepare?.(args); },
    async snapshot() { snapshots += 1; if (pendingPaste && snapshots >= pendingPaste.at) { doc.blocks.push(pendingPaste.block); pendingPaste = null; } return JSON.parse(JSON.stringify(doc)); },
    async focusTitle() { calls.push('focusTitle'); cursor = 'title'; },
    async focusBody() { calls.push('focusBody'); cursor = 'body'; },
    async typeText(text, { onProgress, shouldStop }) {
      typeCalls += 1;
      calls.push(`type:${text.length > 12 ? `${text.slice(0, 12)}…` : text}`);
      let value = text;
      if (options.dropChars && typeCalls === options.dropChars) value = value.slice(0, -3);
      if (options.duplicateAt && typeCalls === options.duplicateAt) value = value + value;
      for (let i = 0; i < value.length; i += 1) { if (shouldStop()) throw new TaskError('CANCELLED', 'stopped'); }
      if (options.cancelDuring && typeCalls === options.cancelDuring) options.cancelFlag.value = true;
      if (cursor === 'title') doc.title += value.replace(/\n/g, '');
      else addBody(value);
      if (options.foreignAfterType && typeCalls === options.foreignAfterType) doc.blocks.splice(0, 0, { type: 'paragraph', text: '다른 사람이 쓴 문장' });
      onProgress?.(value.length);
    },
    async pasteLink(label, url) {
      calls.push('paste');
      if (options.pasteMode === 'ignored') return { linked: false, inserted: false };
      // 실제 시험(v1.44)에서 나온 상황: 붙여넣기는 편집기에 들어갔지만 붙여넣은 프레임의 개수는 변하지 않아 {linked:false, inserted:false}가 돌아온다.
      if (options.pasteMode === 'invisible') { doc.blocks.push({ type: 'paragraph', text: label, links: [url] }); return { linked: false, inserted: false }; }
      // 붙여넣기 반영이 몇 번의 문서 읽기 뒤에 늦게 나타나는 경우
      if (options.pasteMode === 'delayed') { pendingPaste = { at: snapshots + 4, block: { type: 'paragraph', text: label, links: [url] } }; return { linked: false, inserted: false }; }
      if (options.pasteMode === 'multi') { for (let i = 0; i < 3; i += 1) doc.blocks.push({ type: 'paragraph', text: label }); return { linked: true, inserted: true }; }
      doc.blocks.push({ type: 'paragraph', text: label, links: [url] });
      return { linked: true, inserted: true };
    },
    async uploadImage() {
      calls.push('image');
      doc.blocks.push({ type: 'image', text: '' });
      if (options.imageDouble) doc.blocks.push({ type: 'image', text: '' });
    },
    async applyImageAi() { calls.push('imageAi'); if (options.aiError) throw new Error('토글 없음'); },
    async openPublishSettings() { calls.push('settings'); if (options.settingsError) throw new TaskError('SETTINGS_NOT_OPEN', '설정창 없음'); },
    async applyTags(tags) { calls.push(`tags:${tags.length}`); },
    async applyCategory(category) { calls.push(`category:${category.id}:${category.name}`); },
  };
  return { adapter, doc, calls, close() { closed = true; } };
}

const asset = (n) => ({ dataUrl: `data:image/png;base64,AAAA`, name: `img-${n}.png` });
const blocks = () => [
  { type: 'text', text: '첫 문단입니다.\n둘째 줄입니다.' },
  { type: 'image', url: 'https://x/1.png', alt: '' },
  { type: 'text', text: '이미지 뒤 문단입니다.' },
  { type: 'link', text: '👉 추천링크 바로가기', url: 'https://buylife.blog' },
];

async function run(editor, overrides = {}) {
  const reports = [];
  const progress = [];
  const result = await runInputTask({
    task: { id: 7, title: '테스트 제목', blocks: blocks(), tags: ['태그1', '태그2'], ...(overrides.task || {}) },
    assets: overrides.assets ?? { 1: asset(1) },
    adapter: editor.adapter,
    blogId: 'myblog',
    settings: overrides.settings ?? {},
    progress: (stage, message) => progress.push([stage, message]),
    report: async (status, error) => { reports.push([status, error]); },
    isCancelled: overrides.isCancelled ?? (() => false),
    sleep: async () => {},
    settleTries: 2,
  });
  return { result, reports, progress };
}
const rejects = async (promise, code) => {
  try { await promise; } catch (error) { assert.equal(error.code, code, error.message); return error; }
  assert.fail(`TaskError ${code} expected`);
};

test('happy path: title, text, image, link in order, verified, ready for manual publish', async () => {
  const editor = fakeEditor();
  const { result, reports } = await run(editor, { task: { category: { id: '12', name: '경제' } }, settings: { imageAi: true } });
  assert.equal(result.status, 'publish_ready'); assert.equal(result.settingsApplied, true);
  assert.deepEqual(reports.map((r) => r[0]), ['completed', 'publish_ready']);
  assert.equal(editor.doc.title, '테스트 제목');
  assert.equal(editor.doc.blocks.filter((b) => b.type === 'image').length, 1);
  assert.ok(!editor.calls.some((c) => /publish$|finalPublish/i.test(c)), 'final publish is never clicked');
  assert.ok(editor.calls.indexOf('imageAi') > editor.calls.indexOf('image'));
  assert.ok(editor.calls.includes('settings') && editor.calls.includes('tags:2') && editor.calls.includes('category:12:경제'));
});

test('without category or tags the settings layer is not opened and status stays completed', async () => {
  const editor = fakeEditor();
  const { result, reports } = await run(editor, { task: { tags: [] } });
  assert.equal(result.status, 'completed'); assert.equal(result.settingsApplied, false);
  assert.deepEqual(reports.map((r) => r[0]), ['completed']); assert.ok(!editor.calls.includes('settings'));
});

test('post hashtags are used when no panel tags are saved', async () => {
  const editor = fakeEditor();
  await run(editor);
  assert.ok(editor.calls.includes('tags:2'));
});

test('existing title or body stops before any typing and keeps the content', async () => {
  for (const existing of [{ existingTitle: 'old title' }, { existingBody: '쓰던 글' }]) {
    const editor = fakeEditor(existing);
    const before = JSON.stringify(editor.doc);
    await rejects(run(editor), 'EDITOR_NOT_EMPTY');
    assert.equal(JSON.stringify(editor.doc), before); assert.ok(!editor.calls.some((c) => c.startsWith('type')));
  }
});

test('typed text duplicated by the editor is detected and never retyped', async () => {
  const editor = fakeEditor({ duplicateAt: 2 });
  await rejects(run(editor), 'TEXT_MISMATCH');
  assert.equal(editor.calls.filter((c) => c.startsWith('type')).length, 2);
});

test('dropped characters are detected', async () => {
  await rejects(run(fakeEditor({ dropChars: 2 })), 'TEXT_MISMATCH');
});

test('content that appears from outside between steps stops the run (DOCUMENT_CHANGED)', async () => {
  await rejects(run(fakeEditor({ foreignAtAlive: 3 })), 'DOCUMENT_CHANGED');
  await rejects(run(fakeEditor({ foreignAfterType: 2 })), 'TEXT_MISMATCH');
});

test('title mismatch is detected', async () => {
  const editor = fakeEditor({ dropChars: 1 });
  await rejects(run(editor), 'TITLE_MISMATCH');
});

test('image uploaded twice is detected and not uploaded again', async () => {
  const editor = fakeEditor({ imageDouble: true });
  await rejects(run(editor), 'IMAGE_MISMATCH');
  assert.equal(editor.calls.filter((c) => c === 'image').length, 1);
});

test('missing image asset is skipped with a warning', async () => {
  const editor = fakeEditor();
  const { result } = await run(editor, { assets: {} });
  assert.equal(result.imageSkipped, 1); assert.ok(result.warnings.some((w) => w.includes('1장')));
  assert.ok(!editor.calls.includes('image'));
});

test('ignored paste falls back to typing label and url; verification passes', async () => {
  const editor = fakeEditor({ pasteMode: 'ignored' });
  const { result } = await run(editor);
  assert.equal(result.linkedCount, 0);
  assert.ok(editor.doc.blocks.some((b) => b.type === 'paragraph' && b.text.includes('https://buylife.blog')));
});

test('paste that inserts the link several times (multi-frame bug) is detected', async () => {
  await rejects(run(fakeEditor({ pasteMode: 'multi' })), 'LINK_MISMATCH');
});

test('user cancel stops the run and nothing more is typed', async () => {
  const flag = { value: false };
  const editor = fakeEditor({ cancelDuring: 2, cancelFlag: flag });
  await rejects(run(editor, { isCancelled: () => flag.value }), 'CANCELLED');
  assert.ok(!editor.calls.includes('image'));
});

test('tab closing mid-run stops with TAB_CLOSED', async () => {
  await rejects(run(fakeEditor({ closeAfterCalls: 5 })), 'TAB_CLOSED');
});

test('image AI mark failure is only a warning', async () => {
  const { result } = await run(fakeEditor({ aiError: true }), { settings: { imageAi: true } });
  assert.ok(result.warnings.some((w) => w.includes('AI 활용')));
});

test('settings failure keeps typed content as completed and never reports publish_ready', async () => {
  const editor = fakeEditor({ settingsError: true });
  const { result, reports } = await run(editor, { task: { category: { id: '12', name: '경제' }, tags: [] }, settings: {} });
  assert.equal(result.status, 'completed'); assert.ok(result.settingsError);
  assert.deepEqual(reports.map((r) => r[0]), ['completed']);
});

test('account or login errors from prepare are surfaced before touching the document', async () => {
  const editor = fakeEditor({ prepareError: new TaskError('ACCOUNT_MISMATCH', '다른 블로그') });
  await rejects(run(editor), 'ACCOUNT_MISMATCH'); assert.ok(!editor.calls.some((c) => c.startsWith('focus')));
});

test('empty title or empty body is rejected before preparing the editor', async () => {
  const a = fakeEditor(); await rejects(run(a, { task: { title: '  ' } }), 'EMPTY_TITLE'); assert.equal(a.calls.length, 0);
  const b = fakeEditor(); await rejects(run(b, { task: { blocks: [] } }), 'EMPTY_BODY');
});

// ---- 순수 규칙 ----
test('unitsFromSnapshot merges paragraphs, drops previews and empty paragraphs', () => {
  const units = Core.unitsFromSnapshot([{ type: 'paragraph', text: '가 나' }, { type: 'paragraph', text: '' }, { type: 'paragraph', text: '다' }, { type: 'linkPreview', text: 'x' }, { type: 'image' }, { type: 'paragraph', text: '라' }]);
  assert.deepEqual(units, [{ type: 'text', text: '가나다' }, { type: 'image' }, { type: 'text', text: '라' }]);
});
test('compareUnits flags extra, missing, reordered and different text', () => {
  const expected = [{ type: 'text', text: 'abc' }, { type: 'image' }];
  assert.equal(Core.compareUnits(expected, [{ type: 'text', text: 'abc' }, { type: 'image' }]).ok, true);
  assert.equal(Core.compareUnits(expected, [{ type: 'text', text: 'abcabc' }, { type: 'image' }]).ok, false);
  assert.equal(Core.compareUnits(expected, [{ type: 'image' }, { type: 'text', text: 'abc' }]).ok, false);
  assert.equal(Core.compareUnits(expected, [{ type: 'text', text: 'abc' }]).ok, false);
  assert.equal(Core.compareUnits(expected, [...expected, { type: 'text', text: 'x' }]).ok, false);
  assert.equal(Core.compareUnits([], [{ type: 'other', text: '' }]).ok, false);
});
test('the old containment check would pass duplicates; exact comparison does not', () => {
  const doc = Core.unitsFromSnapshot([{ type: 'paragraph', text: 'P1' }, { type: 'paragraph', text: 'P2' }, { type: 'paragraph', text: 'P1' }, { type: 'paragraph', text: 'P2' }]);
  assert.ok(doc[0].text.includes('P1P2')); // 포함 검사는 통과
  assert.equal(Core.compareUnits([{ type: 'text', text: 'P1P2' }], doc).ok, false);
});
test('imageFileName is unique per image and stable', () => {
  const a = Core.imageFileName(0, 'https://x/a.png', 'image/png'); const b = Core.imageFileName(1, 'https://x/a.png', 'image/png');
  assert.notEqual(a, b); assert.equal(a, Core.imageFileName(0, 'https://x/a.png', 'image/png')); assert.match(a, /^blog-img-01-[a-z0-9]+\.png$/);
  assert.match(Core.imageFileName(2, 'u', 'image/jpeg'), /\.jpg$/);
});
test('parseTagInput and recommended tags keep the shared rules', () => {
  assert.deepEqual(Core.parseTagInput('#a, b, a ,, c'), ['a', 'b', 'c']);
  assert.ok(Core.buildRecommendedTags({ topic: '', keywords: ['알래스카'], title: '', body: '' }).includes('알래스카'));
});

test('paste that worked but is invisible to the paste frame is not typed a second time (real v1.44 failure)', async () => {
  const editor = fakeEditor({ pasteMode: 'invisible' });
  const { result } = await run(editor);
  assert.equal(result.linkedCount, 1, 'linked count comes from the editor document');
  const labelCount = editor.doc.blocks.filter((b) => b.type === 'paragraph' && b.text.includes('추천링크 바로가기')).length;
  assert.equal(labelCount, 1);
  assert.ok(!editor.calls.some((c) => c.startsWith('type:👉') || c.includes('https://buylife.blog')), 'no fallback typing happened');
});

test('a paste that appears a little later is still recognised before any fallback typing', async () => {
  const editor = fakeEditor({ pasteMode: 'delayed' });
  const { result } = await run(editor);
  assert.equal(result.linkedCount, 1);
  assert.equal(editor.doc.blocks.filter((b) => b.type === 'paragraph' && b.text.includes('추천링크 바로가기')).length, 1);
});

test('ignored paste still falls back to typing exactly once', async () => {
  const editor = fakeEditor({ pasteMode: 'ignored' });
  await run(editor);
  assert.equal(editor.doc.blocks.filter((b) => b.type === 'paragraph' && b.text.includes('https://buylife.blog')).length, 1);
});

test('countLinks reads linked hrefs from the editor document', () => {
  const blocks = [{ type: 'paragraph', text: 'a', links: ['https://buylife.blog/'] }, { type: 'paragraph', text: 'b', links: ['https://other.example'] }, { type: 'image' }];
  assert.equal(Core.countLinks(blocks, 'https://buylife.blog'), 1);
  assert.equal(Core.countLinks(blocks, 'https://nothing.example'), 0);
  assert.equal(Core.countLinks(undefined, 'x'), 0);
});

test('the cursor is not re-clicked after text or a link (only at the body start and right after an image)', async () => {
  const editor = fakeEditor();
  await run(editor, { task: { blocks: [
    { type: 'text', text: '첫 문단입니다.\n둘째 줄입니다.' },
    { type: 'link', text: '👉 첫 링크', url: 'https://a.example' },
    { type: 'text', text: '링크 뒤 문단입니다.' },
    { type: 'image', url: 'https://x/1.png', alt: '' },
    { type: 'text', text: '이미지 뒤 문단입니다.' },
    { type: 'link', text: '👉 마지막 링크', url: 'https://buylife.blog' },
  ], tags: [] }, assets: { 3: asset(3) } });
  const focusCalls = editor.calls.filter((c) => c === 'focusBody').length;
  assert.equal(focusCalls, 2, 'focusBody only before the first block and after the image');
  const at = (prefix) => editor.calls.findIndex((c) => c.startsWith(prefix));
  const pasteIndexes = editor.calls.map((c, i) => (c === 'paste' ? i : -1)).filter((i) => i >= 0);
  for (const i of pasteIndexes) assert.notEqual(editor.calls[i - 1] === 'focusBody' && editor.calls[i - 2]?.startsWith('type:') , true, 'no focus between typed text and the link paste');
  assert.ok(at('type:') > 0);
});

test('image AI mark is off by default and only applied when the member turned it on', async () => {
  const off = fakeEditor();
  await run(off);
  assert.ok(!off.calls.includes('imageAi'), 'default: the AI mark is not touched');
  const explicitOff = fakeEditor();
  await run(explicitOff, { settings: { imageAi: false } });
  assert.ok(!explicitOff.calls.includes('imageAi'));
  const on = fakeEditor();
  await run(on, { settings: { imageAi: true } });
  assert.ok(on.calls.includes('imageAi'));
  const noImages = fakeEditor();
  await run(noImages, { settings: { imageAi: true }, assets: {} });
  assert.ok(!noImages.calls.includes('imageAi'), 'nothing to mark when no image was placed');
});

test('category and tags come only from the task: a malformed category is ignored, the saved settings never override', async () => {
  const bad = fakeEditor();
  const { result } = await run(bad, { task: { category: { id: 'x', name: '경제' }, tags: [] }, settings: { category: '다른', tags: ['설정태그'] } });
  assert.equal(result.status, 'completed'); assert.ok(!bad.calls.includes('settings'), 'nothing to apply: the settings layer stays closed');
  const both = fakeEditor();
  await run(both, { task: { category: { id: '3', name: '일상' }, tags: ['a', 'b', 'c'] }, settings: { category: '무시', tags: ['무시'] } });
  assert.ok(both.calls.includes('category:3:일상') && both.calls.includes('tags:3'));
});
