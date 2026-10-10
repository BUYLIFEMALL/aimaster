const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createNaverAdapter } = require('../extension/naver-adapter.js');
const { TaskError } = require('../extension/blog-engine.js');

// 실제 adapter를 가짜 chrome(탭·프레임·디버거)에 연결해 "어느 프레임에서, 몇 번, 어떤 순서로" 동작하는지 시험한다. 실제 네이버 없음.
function setup({ frames, tabs = [], handlers = {}, loginSequence = null, startTime = 1_000_000 } = {}) {
  const log = { mutating: [], debugger: [], created: [], updated: [], insert: [] };
  const MUTATING = new Set(['focus', 'setImageFile', 'pasteLink', 'clickImageButton', 'openPublishSettings', 'tagFocus', 'categorySelect', 'categories', 'imageAi', 'dismissResume']);
  let clock = startTime;
  let nextTabId = 100;
  const tabState = new Map(tabs.map((tab) => [tab.id, { ...tab }]));
  const chrome = {
    tabs: {
      async query() { return [...tabState.values()]; },
      async get(id) { if (!tabState.has(id)) throw new Error(`No tab with id: ${id}.`); return { ...tabState.get(id) }; },
      async create(info) { const tab = { id: nextTabId++, windowId: 1, status: 'complete', url: info.url, active: true }; tabState.set(tab.id, tab); log.created.push(info.url); return { ...tab }; },
      async update(id, props) { const tab = tabState.get(id); Object.assign(tab, props); log.updated.push([id, props]); return { ...tab }; },
      async remove(id) { if (!tabState.has(id)) throw new Error(`No tab with id: ${id}.`); tabState.delete(id); log.removed = [...(log.removed || []), id]; },
    },
    windows: { async update() {} },
    debugger: {
      async attach(target) { log.debugger.push('attach'); },
      async detach() { log.debugger.push('detach'); },
      async sendCommand(_t, method, params) { if (method === 'Input.insertText') log.insert.push(params.text); if (handlers.sendCommand) await handlers.sendCommand(method, params); },
    },
    scripting: {
      async executeScript({ target, func, args, world }) {
        if (world === 'MAIN') return [{ frameId: 0, result: undefined }];
        const [command, commandArgs] = args;
        const ids = target.allFrames ? Object.keys(frames).map(Number) : target.frameIds;
        if (!target.allFrames && MUTATING.has(command)) log.mutating.push({ command, frames: ids });
        if (target.allFrames && MUTATING.has(command) && command !== 'dismissResume') log.mutating.push({ command, frames: ids, allFrames: true });
        return ids.map((frameId) => ({ frameId, result: frames[frameId](command, commandArgs, { tabState, clock }) }));
      },
    },
  };
  const adapter = createNaverAdapter({
    chrome, pageFn: () => {}, TaskError, sleep: async (ms) => { clock += ms; }, random: () => 0, now: () => clock, loginWaitMs: 30_000,
  });
  return { adapter, chrome, log, tabState };
}

const validFrame = (overrides = {}) => (command, args) => {
  if (command === 'inspect') return { status: 'valid', hasContent: false, dialogOpen: false, ...overrides.inspect };
  if (command === 'dismissResume') return { ok: true, dismissed: false };
  if (command === 'snapshot') return { ok: true, title: '', blocks: overrides.blocks ?? [] };
  if (command === 'focus') return { ok: true };
  return overrides.other?.(command, args) ?? { ok: true };
};
const emptyOther = () => () => ({ status: 'unknown', reason: 'nothing here' });
const ownTab = (extra = {}) => ({ id: 1, windowId: 1, status: 'complete', url: 'https://blog.naver.com/myblog/postwrite', active: false, ...extra });

test('opens a new tab when no empty own editor exists, and keeps a tab that already has content untouched', async () => {
  const frames = { 0: (command) => (command === 'inspect' ? { status: 'valid', hasContent: true } : { ok: true, dismissed: false }) };
  const s = setup({ frames, tabs: [ownTab()] });
  // 새 탭도 같은 가짜 프레임을 쓰므로 내용이 있다고 응답 → 비어 있지 않아 중지(기존 탭은 건드리지 않았는지가 핵심)
  await assert.rejects(() => s.adapter.prepareEditor({ blogId: 'myblog' }), (error) => error.code === 'EDITOR_NOT_EMPTY');
  assert.equal(s.log.created.length, 1);
  assert.ok(!s.log.updated.some(([id, props]) => id === 1 && props.url), 'the writer tab with content is never navigated');
});

test('reuses an existing own editor tab only when it is empty', async () => {
  const s = setup({ frames: { 0: validFrame() }, tabs: [ownTab()] });
  await s.adapter.prepareEditor({ blogId: 'myblog' });
  assert.equal(s.log.created.length, 0); assert.equal(s.adapter.state.tabId, 1);
});

test('another blog or account stops with ACCOUNT_MISMATCH', async () => {
  const s = setup({ frames: { 0: (command) => (command === 'inspect' ? { status: 'account_mismatch', reason: '다른 블로그' } : { ok: true, dismissed: false }) } });
  await assert.rejects(() => s.adapter.prepareEditor({ blogId: 'myblog' }), (error) => error.code === 'ACCOUNT_MISMATCH' && /myblog/.test(error.message));
});

test('waits for the user to log in, then continues once the editor is valid and stable', async () => {
  let polls = 0;
  const frame = (command) => {
    if (command === 'dismissResume') return { ok: true, dismissed: false };
    if (command === 'inspect') { polls += 1; return polls < 4 ? { status: 'expired', reason: '로그인 필요' } : { status: 'valid', hasContent: false }; }
    return { ok: true };
  };
  const s = setup({ frames: { 0: frame } });
  const messages = [];
  await s.adapter.prepareEditor({ blogId: 'myblog', progress: (m) => messages.push(m) });
  assert.ok(messages.some((m) => m.includes('로그인')));
});

test('gives up with a clear error when login never completes', async () => {
  const s = setup({ frames: { 0: (command) => (command === 'inspect' ? { status: 'expired', reason: '로그인 필요' } : { ok: true, dismissed: false }) } });
  await assert.rejects(() => s.adapter.prepareEditor({ blogId: 'myblog' }), (error) => error.code === 'EDITOR_PREPARATION_FAILED');
});

test('the editor must stay empty and stable for 2 seconds before it is accepted', async () => {
  let seen = 0;
  const frame = (command) => {
    if (command === 'dismissResume') return { ok: true, dismissed: false };
    if (command === 'inspect') { seen += 1; return seen === 2 ? { status: 'valid', hasContent: true } : { status: 'valid', hasContent: false }; }
    return { ok: true };
  };
  const s = setup({ frames: { 0: frame } });
  await assert.rejects(() => s.adapter.prepareEditor({ blogId: 'myblog' }), (error) => error.code === 'EDITOR_NOT_EMPTY');
});

test('changing commands run in exactly one frame even when several frames could answer', async () => {
  const frames = {
    0: (command) => (command === 'inspect' ? { status: 'unknown', reason: 'outer' } : command === 'imageUiProbe' ? { hasButton: true, hasInput: true } : command === 'focusProbe' ? { editable: false, focused: false } : { ok: true, clicked: true }),
    1: (command) => (command === 'inspect' ? { status: 'valid', hasContent: false } : command === 'imageUiProbe' ? { hasButton: true, hasInput: true } : command === 'focusProbe' ? { editable: true, focused: true } : command === 'snapshot' ? { ok: true, title: '', blocks: [] } : { ok: true, clicked: true, linked: true, inserted: true }),
    2: (command) => (command === 'inspect' ? { status: 'valid', hasContent: false } : command === 'imageUiProbe' ? { hasButton: true, hasInput: true } : command === 'focusProbe' ? { editable: true, focused: false } : { ok: true, clicked: true }),
  };
  const s = setup({ frames, tabs: [] });
  s.adapter.state.tabId = 5; s.adapter.state.blogId = 'myblog';
  s.tabState.set(5, { id: 5, windowId: 1, status: 'complete', url: 'https://blog.naver.com/myblog/postwrite' });
  await s.adapter.focusBody();
  await s.adapter.pasteLink('라벨', 'https://buylife.blog');
  for (const entry of s.log.mutating) { assert.ok(!entry.allFrames, `${entry.command} must not run on all frames`); assert.equal(entry.frames.length, 1, entry.command); }
  assert.equal(s.log.mutating.filter((e) => e.command === 'pasteLink').length, 1);
  assert.deepEqual(s.log.mutating.find((e) => e.command === 'pasteLink').frames, [1], 'paste goes only to the frame that has the caret');
});

test('typeText sends one character at a time, always detaches the debugger, and stops on cancel', async () => {
  const s = setup({ frames: { 0: validFrame() } });
  s.adapter.state.tabId = 5;
  await s.adapter.typeText('가나다', { onProgress() {}, shouldStop: () => false });
  assert.deepEqual(s.log.insert, ['가', '나', '다']); assert.deepEqual(s.log.debugger, ['attach', 'detach']);
  s.log.debugger.length = 0; s.log.insert.length = 0;
  let calls = 0;
  await assert.rejects(() => s.adapter.typeText('가나다라', { shouldStop: () => ++calls > 2 }), (error) => error.code === 'CANCELLED');
  assert.deepEqual(s.log.insert, ['가', '나']); assert.deepEqual(s.log.debugger, ['attach', 'detach']);
});

test('debugger is detached even when sending a key fails', async () => {
  const s = setup({ frames: { 0: validFrame() }, handlers: { sendCommand: async (method) => { if (method === 'Input.insertText') throw new Error('Detached while handling command.'); } } });
  s.adapter.state.tabId = 5;
  await assert.rejects(() => s.adapter.typeText('가', {}), /Detached/);
  assert.deepEqual(s.log.debugger, ['attach', 'detach']);
});

test('uploadImage clicks the button once and fails if the editor image count does not grow (no blind retry)', async () => {
  let clicks = 0; let sets = 0;
  const frame = (command) => {
    if (command === 'inspect') return { status: 'valid', hasContent: false };
    if (command === 'snapshot') return { ok: true, title: '', blocks: [] };
    if (command === 'imageUiProbe') return { hasButton: true, hasInput: true };
    if (command === 'clickImageButton') { clicks += 1; return { clicked: true }; }
    if (command === 'setImageFile') { sets += 1; return { ok: true }; }
    return { ok: true };
  };
  const s = setup({ frames: { 0: frame } });
  s.adapter.state.tabId = 5; s.adapter.state.blogId = 'myblog';
  await assert.rejects(() => s.adapter.uploadImage({ dataUrl: 'data:image/png;base64,AAAA', name: 'blog-img-01.png' }), (error) => error.code === 'IMAGE_NOT_APPLIED');
  assert.equal(clicks, 1); assert.equal(sets, 1);
});

test('uploadImage succeeds when exactly the image appears', async () => {
  const doc = { blocks: [] };
  const frame = (command, args) => {
    if (command === 'inspect') return { status: 'valid', hasContent: false };
    if (command === 'snapshot') return { ok: true, title: '', blocks: doc.blocks };
    if (command === 'imageUiProbe') return { hasButton: true, hasInput: true };
    if (command === 'clickImageButton') return { clicked: true };
    if (command === 'setImageFile') { assert.equal(args.name, 'blog-img-01-abc.png'); doc.blocks.push({ type: 'image' }); return { ok: true }; }
    return { ok: true };
  };
  const s = setup({ frames: { 0: frame } });
  s.adapter.state.tabId = 5; s.adapter.state.blogId = 'myblog';
  await s.adapter.uploadImage({ dataUrl: 'data:image/png;base64,AAAA', name: 'blog-img-01-abc.png' });
});

test('tags are typed then verified against the registered chips; an unregistered tag fails', async () => {
  const registered = [];
  const frame = (accept) => (command) => {
    if (command === 'tagState') return { ok: true, inputPresent: true, inputValue: '', registered: [...registered] };
    if (command === 'tagFocus') return { ok: true };
    return { ok: true };
  };
  const ok = setup({ frames: { 0: frame(true) }, handlers: { sendCommand: async (method, params) => { if (method === 'Input.dispatchKeyEvent' && params.type === 'keyUp') registered.push(ok.log.insert.join('').replace(/.*(?=태그)/, '')); } } });
  ok.adapter.state.tabId = 5; ok.adapter.state.settingsFrame = 0;
  const result = await ok.adapter.applyTags(['태그']);
  assert.ok(result.includes('태그'));

  registered.length = 0;
  const bad = setup({ frames: { 0: frame(false) } });
  bad.adapter.state.tabId = 5; bad.adapter.state.settingsFrame = 0;
  await assert.rejects(() => bad.adapter.applyTags(['태그']), (error) => error.code === 'TAG_FAILED');
});

test('closed tab is reported as TAB_CLOSED and a navigated tab as TAB_NAVIGATED', async () => {
  const s = setup({ frames: { 0: validFrame() } });
  s.adapter.state.blogId = 'myblog';
  await assert.rejects(() => s.adapter.ensureAlive(), (error) => error.code === 'TAB_CLOSED');
  s.adapter.state.tabId = 9; s.tabState.set(9, { id: 9, windowId: 1, status: 'complete', url: 'https://blog.naver.com/myblog/postwrite' });
  await s.adapter.ensureAlive();
  s.tabState.get(9).url = 'https://blog.naver.com/myblog/123';
  await assert.rejects(() => s.adapter.ensureAlive(), (error) => error.code === 'TAB_NAVIGATED');
  s.tabState.delete(9);
  await assert.rejects(() => s.adapter.ensureAlive(), (error) => error.code === 'TAB_CLOSED');
});

test('own editor url detection accepts only the connected blog', () => {
  const { adapter } = setup({ frames: { 0: validFrame() } });
  assert.equal(adapter.ownEditorUrl('https://blog.naver.com/myblog/postwrite', 'myblog'), true);
  assert.equal(adapter.ownEditorUrl('https://blog.naver.com/MyBlog/postwrite', 'myblog'), true);
  assert.equal(adapter.ownEditorUrl('https://blog.naver.com/other/postwrite', 'myblog'), false);
  assert.equal(adapter.ownEditorUrl('https://blog.naver.com/PostWriteForm.naver?blogId=myblog', 'myblog'), true);
  assert.equal(adapter.ownEditorUrl('https://evil.example/myblog/postwrite', 'myblog'), false);
});

test('reuse:false opens a brand new tab even when an empty own editor tab exists (category read never borrows the member tab)', async () => {
  const s = setup({ frames: { 0: validFrame() }, tabs: [ownTab()] });
  await s.adapter.prepareEditor({ blogId: 'myblog', reuse: false });
  assert.equal(s.log.created.length, 1); assert.notEqual(s.adapter.state.tabId, 1);
  const reused = setup({ frames: { 0: validFrame() }, tabs: [ownTab()] });
  await reused.adapter.prepareEditor({ blogId: 'myblog' });
  assert.equal(reused.log.created.length, 0); assert.equal(reused.adapter.state.tabId, 1);
});

test('readCategories and applyCategory run in the settings frame only; applyCategory sends id and name; closeTab removes only our tab', async () => {
  const seen = [];
  const frames = { 0: validFrame(), 2: (command, args) => { if (command === 'categories' || command === 'categorySelect') seen.push([command, args]); if (command === 'inspect') return { status: 'unknown' }; if (command === 'dismissResume') return { ok: true, dismissed: false }; return command === 'categories' ? { ok: true, categories: [{ id: '12', name: '경제 이야기' }] } : { ok: true, id: args.id, name: args.name }; } };
  const s = setup({ frames, tabs: [] });
  await s.adapter.prepareEditor({ blogId: 'myblog', reuse: false });
  s.adapter.state.settingsFrame = 2;
  assert.deepEqual(JSON.parse(JSON.stringify(await s.adapter.readCategories())), [{ id: '12', name: '경제 이야기' }]);
  assert.deepEqual(await s.adapter.applyCategory({ id: '12', name: '경제 이야기' }), { name: '경제 이야기', id: '12' });
  assert.deepEqual(JSON.parse(JSON.stringify(seen)), [['categories', {}], ['categorySelect', { id: '12', name: '경제 이야기' }]]);
  assert.ok(s.log.mutating.every((entry) => !entry.allFrames), 'category commands never run in all frames');
  const ourTab = s.adapter.state.tabId;
  await s.adapter.closeTab();
  assert.deepEqual(s.log.removed, [ourTab]); assert.equal(s.adapter.state.tabId, null);
  await s.adapter.closeTab(); // 두 번 불러도 안전
});

test('a failed category selection becomes CATEGORY_FAILED with the reason and the available names', async () => {
  const s = setup({ frames: { 0: validFrame(), 2: () => ({ ok: false, reason: '찾지 못했습니다', available: ['일상', '여행'] }) }, tabs: [] });
  await s.adapter.prepareEditor({ blogId: 'myblog', reuse: false });
  s.adapter.state.settingsFrame = 2;
  await assert.rejects(() => s.adapter.applyCategory({ id: '9', name: '없음' }), (error) => error.code === 'CATEGORY_FAILED' && /일상, 여행/.test(error.message));
  await assert.rejects(() => s.adapter.readCategories(), (error) => error.code === 'CATEGORY_LIST_FAILED');
});
