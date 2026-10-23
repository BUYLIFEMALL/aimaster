const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const cache = new Map();
function load(filename) {
  filename = path.resolve(filename);
  if (cache.has(filename)) return cache.get(filename).exports;
  const mod = { exports: {} }; cache.set(filename, mod);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'module', 'exports', code)(specifier => specifier.startsWith('.') ? load(path.resolve(path.dirname(filename), specifier + '.ts')) : require(specifier), mod, mod.exports);
  return mod.exports;
}
const { PrivatePhotoInput } = load(path.join(__dirname, '../src/lib/privatePhotoInput.ts'));
const file = (name = 'photo.png', type = 'image/png', size = 100) => ({ name, type, size });
const pending = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const flush = async () => { await new Promise(setImmediate); await new Promise(setImmediate); };
const start = Date.parse('2026-10-20T00:00:00Z');
function setup(overrides = {}) {
  let serial = 0, now = start;
  const calls = { uploads: [], resolves: [], revoked: [], created: [] };
  const metadata = storagePath => ({ storagePath, createdAt: new Date(start).toISOString(), expiresAt: new Date(start + 30 * 86400000).toISOString() });
  const services = {
    id: () => 'photo-' + (++serial), now: () => now,
    check: async () => ({ ok: true, width: 20, height: 20, checked: true }),
    createUrl: file => { const url = 'blob:' + file.name + ':' + serial; calls.created.push(url); return url; },
    revokeUrl: url => calls.revoked.push(url),
    upload: async (file, signal) => { calls.uploads.push({ file, signal }); return { storagePath: 'owner/' + file.name, mimeType: file.type, size: file.size }; },
    resolve: async (storagePath, signal) => { calls.resolves.push({ storagePath, signal }); return metadata(storagePath); },
    ...overrides,
  };
  return { input: new PrivatePhotoInput(services), calls, metadata, setNow: value => { now = value; } };
}

test('overlapping selections reserve the six slots before any asynchronous check completes', async () => {
  const check = pending(); const h = setup({ check: () => check.promise });
  h.input.add(Array.from({ length: 4 }, (_, i) => file('a' + i + '.png')));
  h.input.add(Array.from({ length: 4 }, (_, i) => file('b' + i + '.png')));
  assert.equal(h.input.getSnapshot().items.length, 6);
  assert.match(h.input.getSnapshot().notice, /2장/);
  check.resolve({ ok: true, width: 1, height: 1, checked: true }); await flush();
  assert.equal(h.calls.uploads.length, 6); assert.equal(h.input.prepared().photos.length, 6);
});

test('reverse upload completion cannot change original cover, reordered IDs, or edited captions', async () => {
  const uploads = new Map();
  const h = setup({ upload: file => { const task = pending(); uploads.set(file.name, task); return task.promise; } });
  h.input.add([file('first.png'), file('second.png')]); await flush();
  const [a, b] = h.input.getSnapshot().items;
  h.input.caption(a.id, '처음 사진의 설명'); h.input.caption(b.id, '두 번째 설명'); h.input.move(b.id, -1);
  uploads.get('second.png').resolve({ storagePath: 'owner/second', mimeType: 'image/png', size: 100 }); await flush();
  assert.equal(h.input.prepared(), null); assert.equal(h.input.getSnapshot().coverId, a.id);
  uploads.get('first.png').resolve({ storagePath: 'owner/first', mimeType: 'image/png', size: 100 }); await flush();
  const ready = h.input.prepared();
  assert.deepEqual(ready.photos.map(p => [p.id, p.caption]), [[b.id, '두 번째 설명'], [a.id, '처음 사진의 설명']]);
  assert.equal(ready.coverId, a.id); h.input.cover(b.id); assert.equal(h.input.prepared().coverId, b.id);
});

test('removing a validating image prevents the upload and never restores its selected card', async () => {
  const decode = pending(), h = setup({ check: () => decode.promise });
  h.input.add([file()]); h.input.remove(h.input.getSnapshot().items[0].id);
  decode.resolve({ ok: true, width: 10, height: 10 }); await flush();
  assert.equal(h.calls.uploads.length, 0); assert.equal(h.input.getSnapshot().items.length, 0);
});

test('an aborted upload response cannot enter a new selection after cancel-all', async () => {
  const upload = pending(); let oldSignal;
  const h = setup({ upload: (file, signal) => { oldSignal = signal; return upload.promise; } });
  h.input.add([file('old.png')]); await flush(); h.input.clear();
  assert.equal(oldSignal.aborted, true);
  h.input.add([file('new.png', 'image/gif')]);
  upload.resolve({ storagePath: 'owner/old', mimeType: 'image/png', size: 100 }); await flush();
  assert.equal(h.input.getSnapshot().items.length, 1); assert.equal(h.input.getSnapshot().items[0].name, 'new.png');
  assert.equal(h.input.getSnapshot().items[0].status, 'failed'); assert.equal(h.calls.resolves.length, 0);
  assert.deepEqual(h.calls.revoked, h.calls.created);
});

test('a removed image stays removed after a late resolve success or failure', async () => {
  for (const succeeds of [true, false]) {
    const resolve = pending(); let signal;
    const h = setup({ resolve: (_, currentSignal) => { signal = currentSignal; return resolve.promise; } });
    h.input.add([file()]); await flush(); const item = h.input.getSnapshot().items[0]; h.input.remove(item.id);
    assert.equal(signal.aborted, true);
    if (succeeds) resolve.resolve(h.metadata(item.asset.storagePath)); else resolve.reject(new Error('network'));
    await flush(); assert.equal(h.input.getSnapshot().items.length, 0); assert.equal(h.input.prepared(), null);
  }
});

test('metadata retry after upload acknowledgement never uploads a second file or loses edits', async () => {
  let attempts = 0;
  const h = setup({ resolve: async path => { if (++attempts === 1) throw new Error('temporary failure'); return h.metadata(path); } });
  h.input.add([file()]); await flush();
  const item = h.input.getSnapshot().items[0]; assert.equal(item.status, 'failed'); assert.ok(item.asset);
  h.input.caption(item.id, '조회 중 편집 보존'); await h.input.refresh(item.id);
  assert.equal(h.calls.uploads.length, 1); assert.equal(h.input.prepared().photos[0].caption, '조회 중 편집 보존');
  assert.equal(h.input.getSnapshot().items[0].status, 'ready');
});

test('bad MIME, empty, oversized, and unreadable photos never reach Storage', async () => {
  const h = setup({ check: async () => ({ ok: false, message: '사진을 읽지 못했어요.' }) });
  h.input.add([file('gif', 'image/gif'), file('empty', 'image/png', 0), file('big', 'image/jpeg', 4194305), file('broken')]); await flush();
  assert.equal(h.calls.uploads.length, 0); assert.ok(h.input.getSnapshot().items.every(item => item.status === 'failed'));
  assert.equal(h.input.prepared(), null);
});

test('one failed image cannot silently become a partial ready selection', async () => {
  const h = setup(); h.input.add([file('valid'), file('invalid', 'text/plain')]); await flush();
  assert.equal(h.input.prepared(), null);
  const invalid = h.input.getSnapshot().items.find(item => item.status === 'failed'); h.input.remove(invalid.id);
  assert.equal(h.input.prepared().photos.length, 1);
});

test('removing the representative deterministically chooses the next listed photo, not response order', async () => {
  const h = setup(); h.input.add([file('a'), file('b'), file('c')]); await flush();
  const [a, b, c] = h.input.getSnapshot().items; h.input.cover(c.id); h.input.move(b.id, -1); h.input.remove(c.id);
  assert.equal(h.input.prepared().coverId, b.id); assert.deepEqual(h.input.prepared().photos.map(p => p.id), [b.id, a.id]);
});

test('selection output contains stable photo metadata only, preserving original expiry on refresh', async () => {
  const h = setup(); h.input.add([file()]); await flush();
  const original = h.input.prepared(); const id = original.photos[0].id;
  h.setNow(start + 86400000); h.input.caption(id, '설명 변경'); await h.input.refresh(id);
  assert.equal(h.input.prepared().photos[0].expiresAt, original.photos[0].expiresAt);
  assert.equal(h.input.prepared().photos[0].createdAt, original.photos[0].createdAt);
  assert.doesNotMatch(JSON.stringify(h.input.prepared()), /blob:|preview|localUrl|https:/);
});

test('expiry blocks use without extending retention and inconsistent retention metadata is rejected', async () => {
  const h = setup(); h.input.add([file()]); await flush(); h.setNow(start + 30 * 86400000);
  assert.equal(h.input.prepared(), null); h.input.expire(); assert.equal(h.input.getSnapshot().items[0].status, 'expired');
  const bad = setup({ resolve: async path => ({ storagePath: path, createdAt: new Date(start).toISOString(), expiresAt: new Date(start + 31 * 86400000).toISOString() }) });
  bad.input.add([file()]); await flush(); assert.equal(bad.input.getSnapshot().items[0].status, 'failed'); assert.equal(bad.input.prepared(), null);
});

test('the server 410 response marks retention expiry instead of suggesting another upload', async () => {
  const h = setup({ resolve: async () => { throw Object.assign(new Error('보관 기간 30일이 지난 사진입니다.'), { status: 410 }); } });
  h.input.add([file()]); await flush(); assert.equal(h.input.getSnapshot().items[0].status, 'expired');
  assert.equal(h.input.prepared(), null); assert.equal(h.calls.uploads.length, 1);
});

test('clear frees all local previews exactly once and caps captions without changing photo IDs', async () => {
  const h = setup(); h.input.add([file('a'), file('b')]); await flush();
  const item = h.input.getSnapshot().items[0]; h.input.caption(item.id, 'x'.repeat(600));
  assert.equal(h.input.prepared().photos[0].caption.length, 500);
  h.input.clear(); h.input.clear(); assert.equal(h.input.getSnapshot().items.length, 0);
  assert.deepEqual([...h.calls.revoked].sort(), [...h.calls.created].sort());
});
