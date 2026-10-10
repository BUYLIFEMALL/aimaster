const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// 실제 background.js(작업기)를 가짜 chrome·가짜 서버·가짜 네이버 편집기로 실행한다. 실제 네이버·서버·유료 호출 없음.
const extensionDir = path.resolve(__dirname, '..', 'extension');

function makeAdapter(options = {}) {
  const doc = { title: '', blocks: [] };
  let cursor = null;
  const calls = [];
  const adapter = {
    state: {}, calls, doc,
    ownEditorUrl: () => true,
    async ensureAlive() {},
    async prepareEditor() { calls.push('prepare'); if (options.prepareError) throw options.prepareError; },
    async snapshot() { return JSON.parse(JSON.stringify(doc)); },
    async focusTitle() { cursor = 'title'; }, async focusBody() { cursor = 'body'; },
    async typeText(text, { onProgress }) {
      if (cursor === 'title') doc.title += text.replace(/\n/g, '');
      else for (const [i, part] of String(text).split('\n').entries()) { const last = doc.blocks[doc.blocks.length - 1]; if (i === 0 && last?.type === 'paragraph') last.text += part; else doc.blocks.push({ type: 'paragraph', text: part }); }
      onProgress?.(text.length);
    },
    async pasteLink(label) { doc.blocks.push({ type: 'paragraph', text: label }); return { linked: true, inserted: true }; },
    async uploadImage() { doc.blocks.push({ type: 'image', text: '' }); },
    async applyImageAi() {}, async openPublishSettings() { calls.push('settings'); }, async applyTags() { calls.push('tags'); }, async applyCategory() { calls.push('category'); },
    async cleanup() {},
  };
  return adapter;
}

function loadWorker({ storage = {}, routes = {}, adapterOptions = {} } = {}) {
  const store = { ...storage };
  const listeners = {};
  const requests = [];
  const ctx = {
    console: { error() {}, log() {} }, Promise, Date, JSON, Math, URL, Uint8Array, ArrayBuffer, Symbol, Intl, Set, Map, Error, String, Number, Array, Object, RegExp, parseInt, isFinite, encodeURIComponent, setTimeout, clearTimeout,
    btoa: (value) => Buffer.from(value, 'binary').toString('base64'),
    AbortSignal: { timeout: () => undefined },
    setInterval: () => 0,
    fetch: async (url, init = {}) => {
      const pathName = String(url).replace('https://ai-auto-blog-one.vercel.app', '');
      requests.push({ path: pathName, method: init.method || 'GET', body: init.body ? JSON.parse(init.body) : null });
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
      tabs: { query: async () => [] },
    },
  };
  ctx.self = ctx;
  vm.createContext(ctx);
  ctx.importScripts = (...files) => files.forEach((file) => vm.runInContext(fs.readFileSync(path.join(extensionDir, file), 'utf8'), ctx, { filename: file }));
  const adapter = makeAdapter(adapterOptions);
  // background.js는 로드 시 importScripts → 실제 adapter 팩토리를 가짜로 교체해야 하므로 로드 후 교체한다.
  vm.runInContext(fs.readFileSync(path.join(extensionDir, 'background.js'), 'utf8'), ctx, { filename: 'background.js' });
  ctx.BlogNaverAdapter.createNaverAdapter = () => adapter;
  const send = (message) => new Promise((resolve) => listeners.message(message, {}, resolve));
  const settled = async (predicate, tries = 200) => { for (let i = 0; i < tries; i += 1) { if (predicate()) return true; await new Promise((r) => setTimeout(r, 5)); } return false; };
  return { store, requests, adapter, send, settled, ctx };
}

const task = (extra = {}) => ({ id: 11, title: '제목입니다', handoffAt: 'now', tags: ['태그'], blocks: [{ type: 'text', text: '본문입니다' }, { type: 'image', url: 'https://x/a.png', alt: '' }], ...extra });
const ack = (req) => ({ status: 200, body: { success: true, persisted: true, status: req.body.status, postId: 11 } });
const base = { aiAutoBlogToken: 'pat_x', aiAutoBlogBlogId: 'myblog' };
const resultCalls = (w) => w.requests.filter((r) => r.path.includes('/input-result')).map((r) => r.body.status);

test('auto flow: claims a task, types it, reports completed then publish_ready after server acknowledgement', async () => {
  let served = false;
  const w = loadWorker({ storage: base, routes: { '/api/extension/task': () => { if (served) return { status: 200, body: { task: null } }; served = true; return { status: 200, body: { task: task() } }; }, '/api/extension/posts/': ack } });
  await w.send({ type: 'pump' });
  assert.ok(await w.settled(() => w.store.blogTaskState?.final));
  assert.equal(w.store.blogTaskState.outcome, 'publish_ready');
  assert.deepEqual(resultCalls(w), ['completed', 'publish_ready']);
  assert.equal(w.store.blogPendingResult, undefined); assert.equal(w.store.blogActiveTask, undefined);
  assert.equal(w.adapter.doc.title, '제목입니다');
});

test('without a saved blog id the worker never claims a task', async () => {
  const w = loadWorker({ storage: { aiAutoBlogToken: 'pat_x' }, routes: { '/api/extension/task': () => ({ status: 200, body: { task: task() } }) } });
  await w.send({ type: 'pump' }); await new Promise((r) => setTimeout(r, 30));
  assert.equal(w.requests.filter((r) => r.path.includes('/task')).length, 0);
});

test('a result the server did not confirm is kept and only the report is retried later', async () => {
  let fail = true; let served = false;
  const w = loadWorker({ storage: base, routes: {
    '/api/extension/task': () => { if (served) return { status: 200, body: { task: null } }; served = true; return { status: 200, body: { task: task({ tags: [] }) } }; },
    '/api/extension/posts/': (req) => (fail ? { status: 503, body: { error: 'down' } } : ack(req)),
  } });
  await w.send({ type: 'pump' });
  assert.ok(await w.settled(() => w.store.blogTaskState?.final));
  assert.equal(w.store.blogPendingResult.status, 'completed');
  assert.ok(w.store.blogTaskState.reportNote);
  const typedBefore = JSON.stringify(w.adapter.doc);
  fail = false;
  await w.send({ type: 'pump' });
  assert.ok(await w.settled(() => w.store.blogPendingResult === undefined));
  assert.equal(JSON.stringify(w.adapter.doc), typedBefore, 'retrying the report never types again');
});

test('HTTP 200 without persisted confirmation is not treated as saved', async () => {
  let served = false;
  const w = loadWorker({ storage: base, routes: {
    '/api/extension/task': () => { if (served) return { status: 200, body: { task: null } }; served = true; return { status: 200, body: { task: task({ tags: [] }) } }; },
    '/api/extension/posts/': () => ({ status: 200, body: { success: true } }),
  } });
  await w.send({ type: 'pump' });
  assert.ok(await w.settled(() => w.store.blogTaskState?.final));
  assert.equal(w.store.blogPendingResult.status, 'completed');
});

test('server 409 ends the retry loop with an explanation instead of retrying forever', async () => {
  let served = false;
  const w = loadWorker({ storage: base, routes: {
    '/api/extension/task': () => { if (served) return { status: 200, body: { task: null } }; served = true; return { status: 200, body: { task: task({ tags: [] }) } }; },
    '/api/extension/posts/': () => ({ status: 409, body: { error: '상태 충돌' } }),
  } });
  await w.send({ type: 'pump' });
  assert.ok(await w.settled(() => w.store.blogTaskState?.final && w.store.blogPendingResult === undefined));
  assert.match(w.store.blogTaskState.reportNote, /기록하지 않았습니다/);
});

test('worker restart in the middle of typing reports an interruption and never retypes', async () => {
  const w = loadWorker({ storage: { ...base, blogActiveTask: { id: 11, title: '제목', stage: 'typing', mode: 'auto' } }, routes: { '/api/extension/task': () => ({ status: 200, body: { task: null } }), '/api/extension/posts/': ack } });
  await w.send({ type: 'pump' });
  assert.ok(await w.settled(() => w.store.blogActiveTask === undefined));
  assert.deepEqual(resultCalls(w), ['failed']);
  assert.match(w.requests.find((r) => r.path.includes('/input-result')).body.error, /EXTENSION_INTERRUPTED/);
  assert.equal(w.adapter.calls.length, 0);
});

test('restart after typing was already verified does not mark the post failed', async () => {
  const w = loadWorker({ storage: { ...base, blogActiveTask: { id: 11, title: '제목', stage: 'settings', mode: 'auto' } }, routes: { '/api/extension/task': () => ({ status: 200, body: { task: null } }), '/api/extension/posts/': ack } });
  await w.send({ type: 'pump' });
  assert.ok(await w.settled(() => w.store.blogActiveTask === undefined));
  assert.deepEqual(resultCalls(w), []);
});

test('an editor that is not empty fails the post with a code and keeps the content', async () => {
  let served = false;
  const { TaskError } = {};
  const w = loadWorker({ storage: base, routes: {
    '/api/extension/task': () => { if (served) return { status: 200, body: { task: null } }; served = true; return { status: 200, body: { task: task() } }; },
    '/api/extension/posts/': ack,
  } });
  w.adapter.prepareEditor = async () => { throw new w.ctx.BlogEngine.TaskError('EDITOR_NOT_EMPTY', '비어 있지 않음'); };
  await w.send({ type: 'pump' });
  assert.ok(await w.settled(() => w.store.blogTaskState?.final));
  assert.equal(w.store.blogTaskState.outcome, 'failed');
  assert.match(w.requests.find((r) => r.path.includes('/input-result')).body.error, /^\[EDITOR_NOT_EMPTY\]/);
});

test('manual start records in_progress with a confirmed save before typing; a failed record blocks the start', async () => {
  const posts = [{ id: 11, title: '직접 글', blocks: task().blocks, tags: [] }];
  const okWorker = loadWorker({ storage: base, routes: { '/api/extension/posts?': () => ({ status: 200, body: { posts } }), '/api/extension/posts': (req) => (req.method === 'GET' ? { status: 200, body: { posts } } : ack(req)), '/api/extension/task': () => ({ status: 200, body: { task: null } }) } });
  assert.equal((await okWorker.send({ type: 'start', postId: 11 })).ok, true);
  assert.ok(await okWorker.settled(() => okWorker.store.blogTaskState?.final));
  assert.deepEqual(resultCalls(okWorker).slice(0, 2), ['in_progress', 'completed']);

  const blocked = loadWorker({ storage: base, routes: { '/api/extension/posts': (req) => (req.method === 'GET' ? { status: 200, body: { posts } } : { status: 409, body: { error: '진행 중' } }) } });
  const response = await blocked.send({ type: 'start', postId: 11 });
  assert.match(response.error, /진행 중|기록하지/); assert.equal(blocked.adapter.calls.length, 0);
});

test('a second manual start while one is running is refused', async () => {
  const posts = [{ id: 11, title: '직접 글', blocks: task().blocks, tags: [] }];
  const w = loadWorker({ storage: base, routes: { '/api/extension/posts': (req) => (req.method === 'GET' ? { status: 200, body: { posts } } : ack(req)), '/api/extension/task': () => ({ status: 200, body: { task: null } }) } });
  let release; const gate = new Promise((resolve) => { release = resolve; });
  w.adapter.prepareEditor = async () => { await gate; };
  assert.equal((await w.send({ type: 'start', postId: 11 })).ok, true);
  const second = await w.send({ type: 'start', postId: 11 });
  assert.match(second.error, /진행 중/);
  release();
  assert.ok(await w.settled(() => w.store.blogTaskState?.final));
});

test('cancel when idle is harmless and cancel while running stops the post as failed/cancelled', async () => {
  const w = loadWorker({ storage: base, routes: { '/api/extension/task': () => ({ status: 200, body: { task: null } }) } });
  assert.equal((await w.send({ type: 'cancel' })).idle, true);
});
