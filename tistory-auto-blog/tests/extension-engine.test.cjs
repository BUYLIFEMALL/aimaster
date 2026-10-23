const { test } = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../extension/tistory-core.js');
const { runInputTask, TaskError } = require('../extension/tistory-engine.js');

// 가짜 티스토리 편집기로 입력 엔진의 순서·검증·중지 규칙을 시험한다. 실제 티스토리·브라우저·서버 없음.
function fakeEditor(options = {}) {
  const calls = [];
  const draft = { title: '', body: '', imageCount: 0, tagCount: 0, ...(options.initialDraft || {}) };
  let cursor = null;
  let aliveChecks = 0;
  const adapter = {
    calls, draft,
    setStatus(handler) { this.status = handler; },
    async ensureAlive() { aliveChecks += 1; if (options.deadAfter && aliveChecks > options.deadAfter) throw new TaskError('TAB_CLOSED', '탭이 닫혔습니다.'); },
    async prepareEditor(args) { calls.push('prepare'); this.prepareArgs = args; if (options.prepareError) throw options.prepareError; },
    async readDraft() {
      const body = calls.includes('sync') && options.finalBody ? options.finalBody(draft.body) : draft.body;
      return { ...draft, body, imageCount: options.finalImageCount != null && calls.includes('sync') ? options.finalImageCount : draft.imageCount };
    },
    async focusTitle() { cursor = 'title'; calls.push('focusTitle'); },
    async focusBody() { cursor = 'body'; calls.push('focusBody'); },
    async typeText(text, { onProgress, shouldStop } = {}) {
      if (shouldStop && shouldStop()) throw new TaskError('CANCELLED', '중지');
      calls.push(`type:${String(text).replace(/\n/g, '⏎').slice(0, 20)}`);
      if (cursor === 'title') draft.title += text.replace(/\n/g, '');
      else if (!options.dropTyped) draft.body += text;
      onProgress?.(text.length);
      if (options.cancelAfterTyping) options.cancelAfterTyping();
    },
    async containsText(value) {
      calls.push('contains');
      const samples = Core.verificationSamples(value);
      const body = Core.compactVerificationText(draft.body);
      return samples.length === 0 || samples.some((sample) => body.includes(sample));
    },
    async insertHtml(html) { calls.push('insertHtml'); if (!options.htmlVanishes) draft.body += html.replace(/<[^>]+>/g, ' '); },
    async keepsStructure() { calls.push('keepsStructure'); return !options.structureLost; },
    async pasteImage(url, order, total) { calls.push(`image:${order}/${total}`); draft.imageCount += options.imageDouble ? 2 : 1; },
    async syncForPublish(groups) { calls.push('sync'); this.groups = groups; if (options.syncError) throw new Error('저장 원본 불일치'); },
    async closePublishSettings() { calls.push('closeSettings'); },
    async chooseCategory(name) { calls.push(`category:${name}`); if (options.categoryError) throw new Error('카테고리 선택 실패'); },
    async addTags(tags) { calls.push(`tags:${tags.length}`); if (options.tagError) throw new Error('태그 등록 실패'); return { registered: tags.length }; },
    async applyPublish(publish) { calls.push(`publish:${publish.visibility}:${publish.comment}:${publish.timing}:${publish.topic}`); this.publish = publish; return Core.needsPublishDialog(publish) ? { visibility: publish.visibility === 'private' ? '비공개' : '공개', timing: publish.timing === 'reserve' ? '예약' : '현재' } : { skipped: true, visibility: '공개', timing: '현재' }; },
  };
  return adapter;
}

const blocks = () => [
  { type: 'text', text: '첫 번째 문단입니다. 티스토리에 입력됩니다.' },
  { type: 'html', html: '<h2>소제목입니다</h2><ul><li>목록 하나</li></ul>', text: '소제목입니다 목록 하나' },
  { type: 'image', url: 'https://x/1.png', alt: '' },
  { type: 'link', text: '👉 추천링크 바로가기', url: 'https://buylife.blog' },
];

async function run(editor, overrides = {}) {
  const reports = [];
  const progress = [];
  const result = await runInputTask({
    task: { id: 7, title: '테스트 제목', blocks: blocks(), tags: ['태그1', '태그2'], publish: undefined, ...(overrides.task || {}) },
    adapter: editor,
    blogName: 'myblog',
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

test('happy path: title, paragraph, formatted block, image, link in order, verified, settings applied, ready for manual publish', async () => {
  const editor = fakeEditor();
  const { result, reports } = await run(editor, { task: { publish: { category: '경제 이야기', visibility: 'private', comment: 'deny', topic: '경제', timing: 'now' } } });
  assert.equal(result.status, 'publish_ready'); assert.equal(result.settingsApplied, true);
  assert.deepEqual(reports.map((r) => r[0]), ['completed', 'publish_ready']);
  assert.equal(editor.draft.title, '테스트 제목'); assert.equal(editor.draft.imageCount, 1);
  assert.deepEqual(editor.calls.filter((c) => /^(prepare|focusTitle|insertHtml|image:|category:|tags:|publish:|sync|closeSettings)/.test(c)),
    ['prepare', 'focusTitle', 'insertHtml', 'image:1/1', 'sync', 'closeSettings', 'category:경제 이야기', 'tags:2', 'sync', 'publish:private:deny:now:경제']);
  assert.ok(!editor.calls.some((c) => /finalPublish|saveAndPublish|publish-btn/i.test(c)), 'the final publish button is never touched');
  assert.match(result.message, /직접 누르세요/);
});

test('without any publish settings the defaults are kept: no category, no tags dialog, still ready for manual publish', async () => {
  const editor = fakeEditor();
  const { result, reports } = await run(editor, { task: { tags: [] } });
  assert.equal(result.status, 'publish_ready');
  assert.ok(!editor.calls.some((c) => c.startsWith('category:') || c.startsWith('tags:')));
  assert.equal(editor.publish.visibility, 'public'); assert.equal(editor.publish.timing, 'now');
  assert.deepEqual(reports.map((r) => r[0]), ['completed', 'publish_ready']);
});

test('the sync groups use the same text samples as the final verification', async () => {
  const editor = fakeEditor();
  await run(editor);
  assert.equal(editor.groups.length, 3);
  assert.ok(editor.groups.every((samples) => Array.isArray(samples) && samples.length >= 1));
});

test('an editor that is not empty is never written to and keeps its content', async () => {
  for (const initialDraft of [{ title: '남아 있는 제목' }, { body: '남아 있는 본문' }, { imageCount: 1 }, { tagCount: 2 }]) {
    const editor = fakeEditor({ initialDraft });
    await rejects(run(editor), 'EDITOR_NOT_EMPTY');
    assert.ok(!editor.calls.some((c) => c.startsWith('type:') || c === 'insertHtml' || c.startsWith('image:')));
  }
});

test('title that does not match stops without retyping', async () => {
  const editor = fakeEditor();
  const original = editor.typeText.bind(editor);
  editor.typeText = async (text, options) => { await original(text, options); if (editor.draft.title === '테스트 제목') editor.draft.title = '다른 제목'; };
  await rejects(run(editor), 'TITLE_MISMATCH');
  assert.equal(editor.calls.filter((c) => c.startsWith('type:')).length, 1, 'the title is typed exactly once');
});

test('a paragraph that did not land stops at once and the same paragraph is never typed again (no duplicates)', async () => {
  const editor = fakeEditor({ dropTyped: true });
  await rejects(run(editor), 'TEXT_MISMATCH');
  assert.equal(editor.calls.filter((c) => c.startsWith('type:첫 번째')).length, 1);
});

test('a formatted block whose text stays but whose structure is gone is never turned into plain text', async () => {
  const editor = fakeEditor({ structureLost: true });
  await rejects(run(editor), 'STRUCTURE_LOST');
  assert.equal(editor.calls.filter((c) => c.startsWith('type:소제목')).length, 0, 'no plain-text recovery when the text is already there');
});

test('a formatted block whose text vanished is recovered by typing once; if it still is missing the run stops', async () => {
  const recovers = fakeEditor({ htmlVanishes: true });
  const { result } = await run(recovers);
  assert.equal(result.status, 'publish_ready');
  assert.equal(recovers.calls.filter((c) => c.startsWith('type:소제목')).length, 1);
  const never = fakeEditor({ htmlVanishes: true, dropTyped: true });
  const original = never.typeText.bind(never);
  never.typeText = async (text, options) => { await original(text, options); };
  await rejects(run(never), 'TEXT_MISMATCH');
});

test('final verification catches a partial body, a wrong image count, and a changed title', async () => {
  const partial = fakeEditor({ finalBody: (body) => body.slice(0, 20) });
  const error = await rejects(run(partial), 'TEXT_MISMATCH');
  assert.match(error.message, /확인 \d+\/\d+개 문단/);
  await rejects(run(fakeEditor({ finalImageCount: 3 })), 'IMAGE_MISMATCH');
  await rejects(run(fakeEditor({ imageDouble: true })), 'IMAGE_MISMATCH');
});

test('images that could not be loaded are skipped with a warning and never pasted', async () => {
  const editor = fakeEditor();
  const list = blocks(); list[2] = { ...list[2], skip: true };
  const { result } = await run(editor, { task: { blocks: list } });
  assert.equal(result.imageSkipped, 1); assert.equal(result.imageCount, 0);
  assert.ok(result.warnings.some((w) => w.includes('건너뛰었습니다')));
  assert.ok(!editor.calls.some((c) => c.startsWith('image:')));
});

test('cancel stops at once, reports nothing, and leaves the typed content alone', async () => {
  let cancelled = false;
  const editor = fakeEditor({ cancelAfterTyping: () => { cancelled = true; } });
  const { } = {};
  await rejects(run(editor, { isCancelled: () => cancelled }), 'CANCELLED');
  assert.ok(editor.draft.title.length > 0);
});

test('a closed tab stops the run with TAB_CLOSED and nothing is typed afterwards', async () => {
  const editor = fakeEditor({ deadAfter: 3 });
  await rejects(run(editor), 'TAB_CLOSED');
  const typed = editor.calls.filter((c) => c.startsWith('type:')).length;
  assert.ok(typed <= 2);
});

test('settings failure keeps typed content as completed and never reports publish_ready', async () => {
  for (const options of [{ categoryError: true }, { tagError: true }, { syncError: false }]) {
    const editor = fakeEditor(options);
    const { result, reports } = await run(editor, { task: { publish: { category: '경제', visibility: 'public', comment: 'allow', topic: '', timing: 'now' } } });
    if (options.syncError === false) { assert.equal(result.status, 'publish_ready'); continue; }
    assert.equal(result.status, 'completed'); assert.ok(result.settingsError);
    assert.deepEqual(reports.map((r) => r[0]), ['completed']);
    assert.ok(result.warnings.some((w) => w.includes('발행 설정')));
  }
});

test('a failed save-source sync before settings stops as SYNC_FAILED and never reports completed', async () => {
  const editor = fakeEditor({ syncError: true });
  const reports = [];
  await assert.rejects(runInputTask({ task: { id: 1, title: 't', blocks: blocks(), tags: [] }, adapter: editor, blogName: 'myblog', report: async (s) => reports.push(s), sleep: async () => {}, settleTries: 2 }), (error) => error.code === 'SYNC_FAILED');
  assert.deepEqual(reports, []);
});

test('empty title or body is refused before the browser is touched', async () => {
  const editor = fakeEditor();
  await rejects(run(editor, { task: { title: '  ' } }), 'EMPTY_TITLE');
  await rejects(run(editor, { task: { blocks: [] } }), 'EMPTY_BODY');
  assert.deepEqual(editor.calls, []);
});

test('progress reports the typing characters and the stages in order', async () => {
  const editor = fakeEditor();
  const { progress } = await run(editor);
  const stages = [...new Set(progress.map((p) => p[0]))];
  assert.deepEqual(stages, ['preparing', 'typing', 'image', 'verifying', 'settings']);
});
