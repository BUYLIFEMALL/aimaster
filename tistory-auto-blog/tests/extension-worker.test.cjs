const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Core = require('../extension/tistory-core.js');

// 실제 background.js(작업기)를 가짜 chrome·가짜 서버·가짜 티스토리 편집기로 실행한다. 실제 티스토리·서버·유료 호출 없음.
const extensionDir = path.resolve(__dirname, '..', 'extension');

function makeAdapter(options = {}) {
  const draft = { title: '', body: '', imageCount: 0, tagCount: 0 };
  let cursor = null;
  const calls = [];
  const adapter = {
    state: { tabId: 77, shouldStop: () => false }, calls, draft,
    setStatus() {}, ownEditorUrl: () => true,
    async ensureAlive() {},
    async prepareEditor(args) { calls.push('prepare'); adapter.prepareArgs = args; if (options.prepareError) throw options.prepareError; },
    async readDraft() { return JSON.parse(JSON.stringify(draft)); },
    async focusTitle() { cursor = 'title'; }, async focusBody() { cursor = 'body'; },
    async typeText(text, { onProgress } = {}) { if (cursor === 'title') draft.title += text.replace(/\n/g, ''); else draft.body += text; onProgress?.(text.length); },
    async containsText(value) { const samples = Core.verificationSamples(value); const body = Core.compactVerificationText(draft.body); return samples.length === 0 || samples.some((sample) => body.includes(sample)); },
    async insertHtml(html) { calls.push('insertHtml'); draft.body += html.replace(/<[^>]+>/g, ' '); },
    async keepsStructure() { return true; },
    async pasteImage(url) { calls.push(`image:${url}`); draft.imageCount += 1; },
    async syncForPublish() { calls.push('sync'); },
    async closePublishSettings() {}, async chooseCategory(name) { calls.push(`category:${name}`); }, async addTags(tags) { calls.push(`tags:${tags.length}`); return { registered: tags.length }; },
    async applyPublish(publish) { calls.push(`publish:${publish.visibility}`); return { visibility: '공개', timing: '현재' }; },
    async readCategories() { calls.push('readCategories'); if (options.categoriesError) throw options.categoriesError; return ['경제 이야기', '일상']; },
    async closeTab() { calls.push('closeTab'); },
    async cleanup() {},
  };
  return adapter;
}

function loadWorker({ storage = {}, routes = {}, adapterOptions = {} } = {}) {
  const store = { ...storage };
  const listeners = {};
  const requests = [];
  const intervals = [];
  const events = { notifications: [], tabUpdates: [], windowUpdates: [] };
  const ctx = {
    console: { error() {}, log() {} }, Promise, Date, JSON, Math, URL, Uint8Array, ArrayBuffer, Symbol, Intl, Set, Map, Error, String, Number, Array, Object, RegExp, parseInt, isFinite, encodeURIComponent, setTimeout, clearTimeout,
    btoa: (value) => Buffer.from(value, 'binary').toString('base64'),
    AbortSignal: { timeout: () => undefined },
    setInterval: (fn) => { intervals.push(fn); return intervals.length; },
    clearInterval: (id) => { intervals[id - 1] = null; },
    fetch: async (url, init = {}) => {
      const pathName = String(url).replace('https://tistory-auto-blog-pearl.vercel.app', '');
      requests.push({ path: pathName, method: init.method || 'GET', body: init.body ? JSON.parse(init.body) : null });
      if (/^https:\/\/x\/missing/.test(url)) return { ok: false, status: 404, blob: async () => ({}) };
      if (/^https:\/\/x\/nohead/.test(url) && init.method === 'HEAD') return { ok: false, status: 405, blob: async () => ({}) };
      if (/^https:\/\/x\//.test(url)) return { ok: true, status: 200, blob: async () => ({ type: 'image/png', arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }) };
      const key = Object.keys(routes).find((candidate) => pathName.startsWith(candidate));
      const handler = key ? routes[key] : () => ({ status: 404, body: {} });
      const response = await (typeof handler === 'function' ? handler(requests[requests.length - 1]) : handler);
      return { ok: response.status < 400, status: response.status, json: async () => response.body };
    },
    chrome: {
      storage: { local: {
        async get(keys) { const list = Array.isArray(keys) ? keys : [keys]; const out = {}; for (const key of list) if (key in store) out[key] = JSON.parse(JSON.stringify(store[key])); return out; },
        async set(values) { for (const [key, value] of Object.entries(values)) store[key] = JSON.parse(JSON.stringify(value)); },
        async remove(keys) { for (const key of Array.isArray(keys) ? keys : [keys]) delete store[key]; },
      } },
      runtime: { onMessage: { addListener(fn) { listeners.message = fn; } }, onStartup: { addListener() {} }, onInstalled: { addListener() {} } },
      alarms: { create() { return Promise.resolve(); }, onAlarm: { addListener() {} } },
      sidePanel: { setPanelBehavior: () => Promise.resolve() },
      action: { setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {} },
      tabs: { query: async () => [], update: async (id, props) => { events.tabUpdates.push([id, props]); return { id, windowId: 5 }; } },
      windows: { update: async (id, props) => { events.windowUpdates.push([id, props]); } },
      notifications: { create: async (id, options) => { events.notifications.push({ id, options }); }, clear: async () => {}, onClicked: { addListener(fn) { listeners.notificationClick = fn; } } },
    },
  };
  ctx.self = ctx;
  vm.createContext(ctx);
  ctx.importScripts = (...files) => files.forEach((file) => vm.runInContext(fs.readFileSync(path.join(extensionDir, file), 'utf8'), ctx, { filename: file }));
  const adapter = makeAdapter(adapterOptions);
  // background.js는 로드 시 importScripts → 실제 adapter 팩토리를 가짜로 교체해야 하므로 로드 후 교체한다.
  vm.runInContext(fs.readFileSync(path.join(extensionDir, 'background.js'), 'utf8'), ctx, { filename: 'background.js' });
  ctx.TistoryAdapter.createTistoryAdapter = () => adapter;
  const send = (message, sender = {}) => new Promise((resolve) => listeners.message(message, sender, resolve));
  const settled = async (predicate, tries = 200) => { for (let i = 0; i < tries; i += 1) { if (predicate()) return true; await new Promise((r) => setTimeout(r, 5)); } return false; };
  const heartbeats = () => intervals.slice(1).filter(Boolean);
  return { store, requests, adapter, send, settled, ctx, heartbeats, events, click: (id) => listeners.notificationClick(id) };
}

const task = (extra = {}) => ({ id: 11, runId: 'run-aaa', title: '제목입니다', handoffAt: 'now', tags: ['태그'], publish: { category: '경제 이야기', visibility: 'public', comment: 'allow', topic: '', timing: 'now', reserveDate: '', reserveTime: '' }, blocks: [{ type: 'text', text: '본문입니다. 티스토리에 입력됩니다.' }, { type: 'image', url: 'https://x/a.png', alt: '' }], ...extra });
const ack = (req) => ({ status: 200, body: { success: true, persisted: true, status: req.body.status, postId: 11 } });
const base = { tistoryAutoBlogToken: 'pat_x', tistoryBlogName: 'myblog' };
const resultCalls = (w) => w.requests.filter((r) => r.path.includes('/input-result')).map((r) => r.body.status);
const servesOnce = (value) => { let served = false; return () => { if (served) return { status: 200, body: { task: null } }; served = true; return { status: 200, body: { task: value } }; }; };

test('auto flow: claims a task, types it, reports completed then publish_ready after server acknowledgement, with the run id', async () => {
  const w = loadWorker({ storage: base, routes: { '/api/extension/task': servesOnce(task()), '/api/extension/posts/': ack } });
  await w.send({ type: 'pump' });
  assert.ok(await w.settled(() => w.store.tistoryTaskState?.final));
  assert.equal(w.store.tistoryTaskState.outcome, 'publish_ready');
  assert.deepEqual(resultCalls(w), ['completed', 'publish_ready']);
  assert.ok(w.requests.filter((r) => r.path.includes('/input-result')).every((r) => r.body.runId === 'run-aaa'), 'every report carries the run id');
  assert.equal(w.store.tistoryPendingResult, undefined); assert.equal(w.store.tistoryActiveTask, undefined);
  assert.equal(w.adapter.draft.title, '제목입니다');
  assert.ok(w.adapter.calls.includes('category:경제 이야기') && w.adapter.calls.includes('tags:1') && w.adapter.calls.includes('publish:public'), 'the settings sent from the web are applied');
  assert.equal(w.adapter.prepareArgs.blogName, 'myblog');
});

test('without a saved blog name the worker never claims a task', async () => {
  const w = loadWorker({ storage: { tistoryAutoBlogToken: 'pat_x' }, routes: { '/api/extension/task': () => ({ status: 200, body: { task: task() } }) } });
  await w.send({ type: 'pump' }); await new Promise((r) => setTimeout(r, 30));
  assert.equal(w.requests.filter((r) => r.path.includes('/task')).length, 0);
  const invalid = loadWorker({ storage: { tistoryAutoBlogToken: 'pat_x', tistoryBlogName: '내 블로그' }, routes: { '/api/extension/task': () => ({ status: 200, body: { task: task() } }) } });
  await invalid.send({ type: 'pump' }); await new Promise((r) => setTimeout(r, 30));
  assert.equal(invalid.requests.filter((r) => r.path.includes('/task')).length, 0, 'an invalid saved name is treated as missing');
});

test('a result the server did not confirm is kept and only the report is retried later', async () => {
  let fail = true;
  const w = loadWorker({ storage: base, routes: { '/api/extension/task': servesOnce(task({ publish: undefined, tags: [] })), '/api/extension/posts/': (req) => (fail ? { status: 503, body: { error: 'down' } } : ack(req)) } });
  await w.send({ type: 'pump' });
  assert.ok(await w.settled(() => w.store.tistoryTaskState?.final));
  assert.equal(w.store.tistoryPendingResult.status, 'publish_ready');
  assert.ok(w.store.tistoryTaskState.reportNote);
  const typedBefore = JSON.stringify(w.adapter.draft);
  fail = false;
  await w.send({ type: 'pump' });
  assert.ok(await w.settled(() => w.store.tistoryPendingResult === undefined));
  assert.equal(JSON.stringify(w.adapter.draft), typedBefore, 'retrying the report never types again');
});

test('HTTP 200 without persisted confirmation is not treated as saved', async () => {
  const w = loadWorker({ storage: base, routes: { '/api/extension/task': servesOnce(task({ publish: undefined, tags: [] })), '/api/extension/posts/': () => ({ status: 200, body: { success: true } }) } });
  await w.send({ type: 'pump' });
  assert.ok(await w.settled(() => w.store.tistoryTaskState?.final));
  assert.ok(w.store.tistoryPendingResult);
});

test('server 409 ends the retry loop with an explanation instead of retrying forever', async () => {
  const w = loadWorker({ storage: base, routes: { '/api/extension/task': servesOnce(task({ publish: undefined, tags: [] })), '/api/extension/posts/': () => ({ status: 409, body: { error: '상태 충돌' } }) } });
  await w.send({ type: 'pump' });
  assert.ok(await w.settled(() => w.store.tistoryTaskState?.final && w.store.tistoryPendingResult === undefined));
  assert.match(w.store.tistoryTaskState.reportNote, /기록하지 않았습니다/);
});

test('worker restart in the middle of typing reports an interruption with the run id and never retypes', async () => {
  const w = loadWorker({ storage: { ...base, tistoryActiveTask: { id: 11, runId: 'run-zzz', title: '제목', stage: 'typing' } }, routes: { '/api/extension/task': () => ({ status: 200, body: { task: null } }), '/api/extension/posts/': ack } });
  await w.send({ type: 'pump' });
  assert.ok(await w.settled(() => w.store.tistoryActiveTask === undefined));
  assert.deepEqual(resultCalls(w), ['failed']);
  const report = w.requests.find((r) => r.path.includes('/input-result')).body;
  assert.match(report.error, /EXTENSION_INTERRUPTED/); assert.equal(report.runId, 'run-zzz');
  assert.equal(w.adapter.calls.length, 0);
});

test('restart after typing was already verified does not mark the post failed', async () => {
  const w = loadWorker({ storage: { ...base, tistoryActiveTask: { id: 11, title: '제목', stage: 'settings' } }, routes: { '/api/extension/task': () => ({ status: 200, body: { task: null } }), '/api/extension/posts/': ack } });
  await w.send({ type: 'pump' });
  assert.ok(await w.settled(() => w.store.tistoryActiveTask === undefined));
  assert.deepEqual(resultCalls(w), []);
});

test('an editor that is not empty fails the post with a code and keeps the content', async () => {
  const { TaskError } = require('../extension/tistory-engine.js');
  const w = loadWorker({ storage: base, routes: { '/api/extension/task': servesOnce(task()), '/api/extension/posts/': ack } });
  w.adapter.prepareEditor = async () => { throw new w.ctx.TistoryEngine.TaskError('EDITOR_NOT_EMPTY', '비어 있지 않음'); };
  await w.send({ type: 'pump' });
  assert.ok(await w.settled(() => w.store.tistoryTaskState?.final));
  assert.equal(w.store.tistoryTaskState.outcome, 'failed');
  assert.match(w.requests.find((r) => r.path.includes('/input-result')).body.error, /^\[EDITOR_NOT_EMPTY\]/);
  assert.ok(TaskError);
});

test('images that no longer exist are skipped with a warning before typing starts (HEAD falls back to GET)', async () => {
  const blocks = [{ type: 'text', text: '본문입니다. 티스토리에 입력됩니다.' }, { type: 'image', url: 'https://x/missing.png' }, { type: 'image', url: 'https://x/nohead.png' }, { type: 'image', url: 'https://x/ok.png' }];
  const w = loadWorker({ storage: base, routes: { '/api/extension/task': servesOnce(task({ blocks, publish: undefined, tags: [] })), '/api/extension/posts/': ack } });
  await w.send({ type: 'pump' });
  assert.ok(await w.settled(() => w.store.tistoryTaskState?.final));
  assert.equal(w.store.tistoryTaskState.outcome, 'publish_ready');
  assert.deepEqual(w.adapter.calls.filter((c) => c.startsWith('image:')), ['image:https://x/nohead.png', 'image:https://x/ok.png']);
  assert.ok(w.store.tistoryTaskState.warnings.some((message) => message.includes('건너뛰었습니다')));
});

test('cancel when idle is harmless; cancel while running stops the run as cancelled without a failure notification', async () => {
  const idle = loadWorker({ storage: base, routes: { '/api/extension/task': () => ({ status: 200, body: { task: null } }) } });
  assert.equal((await idle.send({ type: 'cancel' })).idle, true);
  const w = loadWorker({ storage: base, routes: { '/api/extension/task': servesOnce(task()), '/api/extension/posts/': ack } });
  let release; const gate = new Promise((resolve) => { release = resolve; });
  w.adapter.prepareEditor = async () => { await gate; };
  await w.send({ type: 'pump' });
  assert.ok(await w.settled(() => w.store.tistoryActiveTask));
  assert.equal((await w.send({ type: 'cancel' })).ok, true);
  release();
  assert.ok(await w.settled(() => w.store.tistoryTaskState?.final));
  assert.equal(w.store.tistoryTaskState.outcome, 'cancelled');
  assert.equal(w.events.notifications.length, 0);
});

test('heartbeat: while typing the worker extends the lease; a superseded answer stops the run and explains it', async () => {
  const w = loadWorker({ storage: base, routes: {
    '/api/extension/task': servesOnce(task({ publish: undefined, tags: [] })),
    '/api/extension/posts/': (req) => (req.path.endsWith('/heartbeat') ? { status: 409, body: { superseded: true } } : { status: 409, body: { error: 'superseded' } }),
  } });
  let release; const gate = new Promise((resolve) => { release = resolve; });
  w.adapter.prepareEditor = async () => { await gate; };
  await w.send({ type: 'pump' });
  assert.ok(await w.settled(() => w.heartbeats().length === 1), 'a heartbeat timer is running');
  w.heartbeats()[0]();
  assert.ok(await w.settled(() => w.requests.some((r) => r.path.endsWith('/heartbeat') && r.body.runId === 'run-aaa')));
  await new Promise((r) => setTimeout(r, 20));
  release();
  assert.ok(await w.settled(() => w.store.tistoryTaskState?.final));
  assert.equal(w.store.tistoryTaskState.outcome, 'cancelled'); assert.match(w.store.tistoryTaskState.message, /웹에서/);
  assert.equal(w.heartbeats().length, 0, 'the heartbeat timer is cleared when the run ends');
});

test('notifications: ready, completed and failed are announced once; a click returns to the Tistory tab; it can be turned off', async () => {
  const ready = loadWorker({ storage: base, routes: { '/api/extension/task': servesOnce(task()), '/api/extension/posts/': ack } });
  await ready.send({ type: 'pump' });
  assert.ok(await ready.settled(() => ready.events.notifications.length === 1));
  assert.match(ready.events.notifications[0].options.title, /발행 직전 준비 완료/);
  await ready.click(ready.events.notifications[0].id);
  assert.ok(await ready.settled(() => ready.events.tabUpdates.some(([id, props]) => id === 77 && props.active === true)));
  const failed = loadWorker({ storage: base, routes: { '/api/extension/task': servesOnce(task()), '/api/extension/posts/': ack }, adapterOptions: { prepareError: new Error('boom') } });
  await failed.send({ type: 'pump' });
  assert.ok(await failed.settled(() => failed.events.notifications.length === 1));
  assert.match(failed.events.notifications[0].options.title, /입력 중단/);
  const off = loadWorker({ storage: { ...base, tistoryNotify: false }, routes: { '/api/extension/task': servesOnce(task()), '/api/extension/posts/': ack } });
  await off.send({ type: 'pump' });
  assert.ok(await off.settled(() => off.store.tistoryTaskState?.final));
  assert.equal(off.events.notifications.length, 0);
  await ready.click('unknown-id');
});

// ---- 카테고리 목록 읽기: 티스토리 입력기 사이트 화면의 요청만, 새 탭에서 읽고 닫는다 ----
const siteSender = { url: 'https://tistory-auto-blog-pearl.vercel.app/posts/1', tab: { id: 31, windowId: 4 } };
test('categories: a request from the site reads the list in a fresh tab, closes it and returns to the site tab', async () => {
  const w = loadWorker({ storage: base });
  const response = await w.send({ type: 'categories' }, siteSender);
  assert.deepEqual(JSON.parse(JSON.stringify(response)), { blogName: 'myblog', categories: ['경제 이야기', '일상'] });
  assert.deepEqual(w.adapter.calls, ['prepare', 'readCategories', 'closeTab']);
  assert.ok(w.events.tabUpdates.some(([id, props]) => id === 31 && props.active === true), 'focus returns to the site tab');
  assert.equal(w.adapter.draft.title, '', 'nothing is typed or selected');
});

test('categories: requests that do not come from the site are refused and nothing opens', async () => {
  const w = loadWorker({ storage: base });
  for (const sender of [{}, { url: 'chrome-extension://abc/sidepanel.html' }, { url: 'https://evil.example/https://tistory-auto-blog-pearl.vercel.app/' }, { url: 'https://tistory-auto-blog-pearl.vercel.app.evil.example/' }]) {
    assert.match((await w.send({ type: 'categories' }, sender)).error, /허용되지 않은/);
  }
  assert.deepEqual(w.adapter.calls, []);
});

test('categories: refused without a token or blog name and while an input task is running; the tab is closed even when reading fails', async () => {
  const noName = loadWorker({ storage: { tistoryAutoBlogToken: 'pat_x' } });
  assert.match((await noName.send({ type: 'categories' }, siteSender)).error, /블로그 이름/); assert.ok(!noName.adapter.calls.includes('prepare'));
  const noToken = loadWorker({ storage: { tistoryBlogName: 'myblog' } });
  assert.match((await noToken.send({ type: 'categories' }, siteSender)).error, /연동 토큰/);
  const failing = loadWorker({ storage: base, adapterOptions: { categoriesError: new Error('목록 없음') } });
  assert.match((await failing.send({ type: 'categories' }, siteSender)).error, /목록 없음/);
  assert.ok(failing.adapter.calls.includes('closeTab'), 'the tab we opened is closed after a failure');
  const w = loadWorker({ storage: base, routes: { '/api/extension/task': servesOnce(task({ publish: undefined, tags: [] })), '/api/extension/posts/': ack } });
  let release; const gate = new Promise((resolve) => { release = resolve; });
  w.adapter.prepareEditor = async () => { await gate; };
  await w.send({ type: 'pump' });
  assert.ok(await w.settled(() => w.store.tistoryActiveTask));
  assert.match((await w.send({ type: 'categories' }, siteSender)).error, /작업이 끝난 뒤/);
  release();
  assert.ok(await w.settled(() => w.store.tistoryTaskState?.final));
});

test('the web bridge only answers its own origin and only ping/categories; it never passes the token or typing commands', () => {
  const source = fs.readFileSync(path.join(extensionDir, 'web-bridge.js'), 'utf8');
  assert.match(source, /location\.origin !== "https:\/\/tistory-auto-blog-pearl\.vercel\.app"/);
  assert.match(source, /event\.origin !== location\.origin/);
  assert.ok(!/tistoryAutoBlogToken|storage\.local|"start"|"fill"/.test(source));
});

// ---- 홈주제 목록: 확장이 확인해 둔 실제 목록을 사이트 화면에만 돌려준다 (v1.67) ----
test('topics: the stored real home-topic list is returned only to the site and opens nothing', async () => {
  const w = loadWorker({ storage: { ...base, tistoryHomeTopics: { names: ['일상', 'IT 인터넷'], at: 5 } } });
  assert.deepEqual(JSON.parse(JSON.stringify(await w.send({ type: 'topics' }, siteSender))), { topics: ['일상', 'IT 인터넷'], at: 5 });
  for (const sender of [{}, { url: 'chrome-extension://abc/sidepanel.html' }, { url: 'https://tistory-auto-blog-pearl.vercel.app.evil.example/' }]) {
    assert.match((await w.send({ type: 'topics' }, sender)).error, /허용되지 않은/);
  }
  assert.deepEqual(w.adapter.calls, []);
  const empty = loadWorker({ storage: base });
  assert.deepEqual(JSON.parse(JSON.stringify(await empty.send({ type: 'topics' }, siteSender))), { topics: [], at: 0 });
});
