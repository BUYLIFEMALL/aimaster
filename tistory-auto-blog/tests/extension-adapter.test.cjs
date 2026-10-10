const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createTistoryAdapter } = require('../extension/tistory-adapter.js');
const { TaskError } = require('../extension/tistory-engine.js');

// 실제 adapter를 가짜 chrome(탭·프레임·디버거)에 연결해 "어느 탭을 열고, 무엇을 기다리고, 언제 멈추는지"를 시험한다. 실제 티스토리 없음.
// 편집기 안에서 도는 주입 함수(TinyMCE 삽입·태그 칩·발행 설정창)는 가짜 화면에서 실행할 수 없어 여기서는 다루지 않는다 — 그 부분은 실제 티스토리 화면에서 확인한다.
function setup({ probes = null, tabs = [], scripting = null, loginWaitMs = 30_000, startTime = 1_000_000, dialog = null } = {}) {
  const log = { created: [], updated: [], removed: [], debugger: [], insert: [], keys: [], windows: [], dialogCommands: [] };
  const listeners = [];
  let clock = startTime;
  let nextTabId = 100;
  const tabState = new Map(tabs.map((tab) => [tab.id, { ...tab }]));
  let probeCalls = 0;
  const chrome = {
    tabs: {
      async get(id) { if (!tabState.has(id)) throw new Error(`No tab with id: ${id}.`); return { ...tabState.get(id) }; },
      async create(info) { const tab = { id: nextTabId++, windowId: 1, status: 'complete', url: info.url, active: true }; tabState.set(tab.id, tab); log.created.push(info.url); return { ...tab }; },
      async update(id, props) {
        const tab = tabState.get(id); if (!tab) throw new Error(`No tab with id: ${id}.`); log.updated.push([id, props]); if (props.url && !String(props.url).includes('SHOULD_STAY')) Object.assign(tab, props);
        // 티스토리가 글쓰기 화면을 열 때 브라우저 기본 확인창을 띄우는 상황을 흉내 낸다(디버거가 붙어 있을 때만 이벤트가 전달된다).
        if (dialog && props.url && /\/manage\/newpost/.test(props.url)) listeners.forEach((fn) => fn({ tabId: id }, 'Page.javascriptDialogOpening', { message: dialog }));
        return { ...tab };
      },
      async remove(id) { if (!tabState.has(id)) throw new Error(`No tab with id: ${id}.`); tabState.delete(id); log.removed.push(id); },
    },
    windows: { async update(id, props) { log.windows.push([id, props]); } },
    debugger: {
      async attach() { log.debugger.push('attach'); },
      async detach() { log.debugger.push('detach'); },
      onEvent: { addListener(fn) { listeners.push(fn); }, removeListener(fn) { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); } },
      async sendCommand(_t, method, params) { if (method === 'Page.handleJavaScriptDialog') log.dialogCommands.push(params); if (method === 'Input.insertText') log.insert.push(params.text); if (method === 'Input.dispatchKeyEvent') log.keys.push(`${params.type}:${params.key}`); },
    },
    scripting: {
      async executeScript(details) {
        if (details.target.allFrames) { const next = typeof probes === 'function' ? probes(probeCalls++, { tabState, clock }) : probes; if (next instanceof Error) throw next; return next; }
        return scripting ? scripting(details) : [{ frameId: 0, result: true }];
      },
    },
  };
  const adapter = createTistoryAdapter({ chrome, TaskError, sleep: async (ms) => { clock += ms; }, random: () => 0, now: () => clock, loginWaitMs, probeTimeoutMs: 50 });
  return { adapter, chrome, log, tabState, clock: () => clock };
}

const emptyEditor = () => [
  { frameId: 0, result: { hasBody: false, bodyText: '', bodyImages: 0, hasTitle: true, titleValue: '', tagChips: 0, layerOpen: false } },
  { frameId: 3, result: { hasBody: true, bodyText: '\n', bodyImages: 0, hasTitle: false, titleValue: '', tagChips: 0, layerOpen: false } },
];
const editorWith = (patch = {}, bodyPatch = {}) => {
  const frames = emptyEditor();
  Object.assign(frames[0].result, patch);
  Object.assign(frames[1].result, bodyPatch);
  return frames;
};

test('prepareEditor always opens a brand new tab on the own blog and returns once the empty editor has been stable for 2 seconds', async () => {
  const s = setup({ probes: emptyEditor, tabs: [{ id: 1, windowId: 1, status: 'complete', url: 'https://myblog.tistory.com/manage/newpost/?type=post', active: false }] });
  await s.adapter.prepareEditor({ blogName: 'myblog' });
  assert.equal(s.log.created.length, 1); assert.equal(s.log.created[0], 'about:blank', 'the tab starts blank so the debugger can be attached before Tistory loads');
  assert.ok(s.log.updated.some(([, props]) => /^https:\/\/myblog\.tistory\.com\/manage\/newpost\//.test(props.url || '')), 'then it navigates to the own blog editor');
  assert.notEqual(s.adapter.state.tabId, 1, 'the member\'s existing tab is never borrowed');
  assert.equal(s.adapter.state.bodyFrame, 3);
  assert.ok(s.clock() - 1_000_000 >= 2000, 'waited for the editor to stay empty');
});

test('login: waits while the member signs in, then continues on the editor', async () => {
  const s = setup({ probes: emptyEditor });
  const messages = [];
  let sleeps = 0;
  const originalGet = s.chrome.tabs.get;
  s.chrome.tabs.get = async (id) => {
    const tab = await originalGet(id);
    sleeps += 1;
    if (sleeps <= 3) return { ...tab, url: 'https://accounts.kakao.com/login?continue=x' };
    return tab;
  };
  await s.adapter.prepareEditor({ blogName: 'myblog', progress: (m) => messages.push(m) });
  assert.ok(messages.some((m) => m.includes('로그인이 필요합니다')));
  assert.equal(s.adapter.state.bodyFrame, 3);
});

test('a login that never completes ends with a clear error', async () => {
  const s = setup({ probes: emptyEditor, loginWaitMs: 5_000 });
  s.chrome.tabs.get = async (id) => ({ id, windowId: 1, status: 'complete', url: 'https://accounts.kakao.com/login' });
  await assert.rejects(() => s.adapter.prepareEditor({ blogName: 'myblog' }), (error) => error.code === 'EDITOR_PREPARATION_FAILED');
});

test('an editor that already has content is never written to (EDITOR_NOT_EMPTY)', async () => {
  for (const [patch, bodyPatch] of [[{ titleValue: '남아 있는 제목' }, {}], [{}, { bodyText: '남아 있는 본문' }], [{}, { bodyImages: 1 }], [{ tagChips: 2 }, {}]]) {
    const s = setup({ probes: () => editorWith(patch, bodyPatch) });
    await assert.rejects(() => s.adapter.prepareEditor({ blogName: 'myblog' }), (error) => error.code === 'EDITOR_NOT_EMPTY');
  }
});

test('the editor must stay empty and stable for 2 seconds: a dialog or a missing editor resets the timer', async () => {
  const s = setup({ probes: (call) => (call < 2 ? editorWith({ layerOpen: true }) : call < 4 ? [] : emptyEditor()) });
  await s.adapter.prepareEditor({ blogName: 'myblog' });
  assert.ok(s.clock() - 1_000_000 >= 3000, 'accepted only after the dialog closed and the editor stayed empty');
});

test('a blog the account cannot open stops with ACCOUNT_MISMATCH instead of typing anywhere', async () => {
  const redirectedAway = setup({ probes: emptyEditor });
  redirectedAway.chrome.tabs.get = async (id) => ({ id, windowId: 1, status: 'complete', url: 'https://www.tistory.com/' });
  await assert.rejects(() => redirectedAway.adapter.prepareEditor({ blogName: 'myblog' }), (error) => error.code === 'ACCOUNT_MISMATCH' && /myblog\.tistory\.com/.test(error.message));
  assert.ok(redirectedAway.log.updated.filter(([, props]) => props.url).length <= 5, 'it retries only a few times');
  const otherSite = setup({ probes: emptyEditor });
  otherSite.chrome.tabs.get = async (id) => ({ id, windowId: 1, status: 'complete', url: 'https://evil.example/manage/newpost' });
  await assert.rejects(() => otherSite.adapter.prepareEditor({ blogName: 'myblog' }), (error) => error.code === 'ACCOUNT_MISMATCH');
});

test('a confirmation dialog that blocks page inspection is waited for, then reported as a preparation failure', async () => {
  const s = setup({ probes: () => new Error('응답 없음'), loginWaitMs: 6_000 });
  const messages = [];
  await assert.rejects(() => s.adapter.prepareEditor({ blogName: 'myblog', progress: (m) => messages.push(m) }), (error) => error.code === 'EDITOR_PREPARATION_FAILED');
  assert.ok(messages.some((m) => m.includes('확인 대화상자')));
});

test('cancel while preparing stops at once', async () => {
  const s = setup({ probes: emptyEditor });
  await assert.rejects(() => s.adapter.prepareEditor({ blogName: 'myblog', isCancelled: () => true }), (error) => error.code === 'CANCELLED');
});

test('closed tab is TAB_CLOSED and a navigated tab is TAB_NAVIGATED', async () => {
  const s = setup({ probes: emptyEditor });
  s.adapter.state.blogName = 'myblog';
  await assert.rejects(() => s.adapter.ensureAlive(), (error) => error.code === 'TAB_CLOSED');
  s.adapter.state.tabId = 9; s.tabState.set(9, { id: 9, windowId: 1, status: 'complete', url: 'https://myblog.tistory.com/manage/newpost/?type=post' });
  await s.adapter.ensureAlive();
  s.tabState.get(9).url = 'https://myblog.tistory.com/manage/posts/';
  await assert.rejects(() => s.adapter.ensureAlive(), (error) => error.code === 'TAB_NAVIGATED');
  s.tabState.delete(9);
  await assert.rejects(() => s.adapter.ensureAlive(), (error) => error.code === 'TAB_CLOSED');
});

test('typeText sends one character at a time, Enter for line breaks, always detaches the debugger, and stops on cancel', async () => {
  const s = setup({ probes: emptyEditor });
  s.adapter.state.tabId = 5;
  const progress = [];
  await s.adapter.typeText('가나\n다', { onProgress: (count) => progress.push(count) });
  assert.deepEqual(s.log.insert, ['가', '나', '다']); assert.deepEqual(s.log.keys, ['keyDown:Enter', 'keyUp:Enter']);
  assert.equal(progress.reduce((a, b) => a + b, 0), 4);
  assert.deepEqual(s.log.debugger, ['attach', 'detach']);
  let stop = false;
  const stopper = setup({ probes: emptyEditor });
  stopper.adapter.state.tabId = 5;
  const pending = stopper.adapter.typeText('abcdef', { shouldStop: () => { const value = stop; stop = true; return value; } });
  await assert.rejects(() => pending, (error) => error.code === 'CANCELLED');
  assert.ok(stopper.log.insert.length <= 2, 'stopped right after the stop request');
  assert.equal(stopper.log.debugger.at(-1), 'detach', 'the debugger is released even when the run stops');
});

test('typing speed follows the human-pace rule (70-170 ms per character)', async () => {
  const waits = [];
  const s = setup({ probes: emptyEditor });
  s.adapter.state.tabId = 5;
  const adapter = createTistoryAdapter({ chrome: s.chrome, TaskError, sleep: async (ms) => { waits.push(ms); }, random: () => 0.5, now: () => 0 });
  adapter.state.tabId = 5;
  await adapter.typeText('abc');
  assert.ok(waits.length >= 3 && waits.every((ms) => ms >= 70 && ms <= 700));
});

test('with default publish settings the publish dialog is never opened (no browser call at all)', async () => {
  let calls = 0;
  const s = setup({ probes: emptyEditor, scripting: () => { calls += 1; return [{ frameId: 0, result: true }]; } });
  s.adapter.state.tabId = 5;
  const result = await s.adapter.applyPublish({ visibility: 'public', comment: 'allow', topic: '', timing: 'now', reserveDate: '', reserveTime: '' });
  assert.equal(result.skipped, true); assert.equal(calls, 0);
});

test('readCategories returns unique names and refuses an empty list; closeTab removes only our tab and is safe to call twice', async () => {
  let call = 0;
  const s = setup({ probes: emptyEditor, scripting: () => { call += 1; return call === 1 ? [{ frameId: 0, result: true }] : [{ frameId: 0, result: ['경제 이야기', '일상'] }]; } });
  await s.adapter.prepareEditor({ blogName: 'myblog' });
  assert.deepEqual(await s.adapter.readCategories(), ['경제 이야기', '일상']);
  const ourTab = s.adapter.state.tabId;
  await s.adapter.closeTab();
  assert.deepEqual(s.log.removed, [ourTab]); assert.equal(s.adapter.state.tabId, null);
  await s.adapter.closeTab();
  let again = 0;
  const empty = setup({ probes: emptyEditor, scripting: () => { again += 1; return again === 1 ? [{ frameId: 0, result: true }] : [{ frameId: 0, result: [] }]; } });
  await empty.adapter.prepareEditor({ blogName: 'myblog' });
  await assert.rejects(() => empty.adapter.readCategories(), (error) => error.code === 'CATEGORY_LIST_FAILED');
});

test('the adapter never touches the final publish button', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  for (const file of ['tistory-adapter.js', 'tistory-engine.js', 'background.js']) {
    const source = fs.readFileSync(path.resolve(__dirname, '..', 'extension', file), 'utf8');
    const code = source.split('\n').filter((line) => !line.trim().startsWith('//')).join('\n');
    assert.ok(!/#publish-btn/.test(code), `${file} must not select #publish-btn`);
  }
});

test('the "saved draft — continue writing?" confirm box is cancelled automatically so the run starts on an empty new post (v1.60 real run)', async () => {
  const message = '2026. 10. 10. 21:36에 저장된 글이 있습니다.\n이어서 작성하시겠습니까?';
  const s = setup({ probes: emptyEditor, dialog: message });
  const notes = [];
  await s.adapter.prepareEditor({ blogName: 'myblog', progress: (m) => notes.push(m) });
  assert.deepEqual(s.log.dialogCommands, [{ accept: false }], 'cancel, never confirm (confirming would load the old draft)');
  assert.ok(notes.some((m) => m.includes('빈 새 글로 시작')));
  assert.equal(s.adapter.state.bodyFrame, 3);
  assert.equal(s.log.debugger.at(-1), 'detach', 'the debugger is released when preparation ends');
});

test('other browser dialogs are never touched by the guard', async () => {
  const s = setup({ probes: emptyEditor, dialog: '정말 이 페이지를 떠나시겠습니까?' });
  await s.adapter.prepareEditor({ blogName: 'myblog' });
  assert.deepEqual(s.log.dialogCommands, []);
});

test('a failure to attach the guard does not stop the run (the member can still press cancel)', async () => {
  const s = setup({ probes: emptyEditor });
  s.chrome.debugger.attach = async () => { throw new Error('Another debugger is already attached to the tab'); };
  s.chrome.debugger.detach = async () => { throw new Error('not attached'); };
  await s.adapter.prepareEditor({ blogName: 'myblog' });
  assert.equal(s.adapter.state.bodyFrame, 3);
});
