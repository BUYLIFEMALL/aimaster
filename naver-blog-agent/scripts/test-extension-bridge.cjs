// 실제 네이버 발행·유료 호출 없이 확장 ↔ 웹 큐 연결(변환·가져가기·결과 반영)을 모의 검수합니다.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

// ---------- 1. 웹: 원고 → 확장 작업 변환 ----------
let access = { allowed: true };
let db;
function loadTS(filename) {
  const module = { exports: {} };
  const js = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const req = (id) => {
    if (id === '@/lib/supabase/admin') return { createAdminClient: () => db };
    if (id === '@/lib/access') return { evaluateProgramAccessForUser: async () => access };
    if (id === '@/lib/version') return loadTS(path.join(root, 'src/lib/version.ts'));
    if (id === '@/lib/extensionBridge') return loadTS(path.join(root, 'src/lib/extensionBridge.ts'));
    if (id === 'next/server') return { NextResponse: { json: (body, init) => ({ body, status: init?.status || 200 }) } };
    return require(id);
  };
  vm.runInThisContext(`(function(require,module,exports){${js}\n})`, { filename })(req, module, module.exports);
  return module.exports;
}
const bridge = loadTS(path.join(root, 'src/lib/extensionBridge.ts'));

const imgs = [
  { url: 'https://x.supabase.co/t.png', type: 'thumbnail', caption: '대표' },
  { url: 'https://x.supabase.co/b1.png', type: 'body' },
  { url: 'https://x.supabase.co/b2.png', type: 'body' },
];
// 마크다운 원고: 자리표시자 3개, 이미지는 본문 2장 → 마지막 자리는 삭제되어야 함
let p = bridge.buildBridgePayload({
  title: '제목', tags: ['a', 'b'], images: imgs, is_reserved: false,
  content: '[SECTION - 첫째]\n[IMAGE INSERT - 거실]\n본문 1\n[SECTION - 둘째]\n[IMAGE INSERT - 주방]\n본문 2\n[IMAGE INSERT - 남는 자리]\n끝',
});
assert.equal(p.titleImageIndex, 0);
assert.deepEqual(p.assets.map((a) => a.url), imgs.map((i) => i.url));
assert.deepEqual(p.bodyImages.map((b) => [b.sequence, b.index]), [[1, 1], [2, 2]]);
assert.equal(p.article, '[SECTION - 첫째]\n[IMAGE INSERT - 1]\n본문 1\n[SECTION - 둘째]\n[IMAGE INSERT - 2]\n본문 2\n끝');
assert.equal(p.publishScheduleMode, 'now');
assert.equal('category' in p, false, '콘텐츠 분류를 네이버 카테고리로 넘기면 안 됨');

// 스마트 에디터 HTML 원고
p = bridge.buildBridgePayload({
  title: 't', images: [], content: '<h2>소제목 &amp; 하나</h2><p>문단 <strong>강조</strong></p><img src="https://x.supabase.co/c.png"><p>다음</p><img src="http://insecure/x.png">',
});
assert.equal(p.article, '[SECTION - 소제목 & 하나]\n문단 강조\n[IMAGE INSERT - 1]\n다음');
assert.equal(p.assets.length, 1);

// 예약 발행
p = bridge.buildBridgePayload({ title: 't', content: '본문', is_reserved: true, scheduled_at: '2026-10-20T01:00:00Z' });
assert.equal(p.publishScheduleMode, 'reserve');
assert.equal(p.scheduledAt, '2026-10-20T01:00:00Z');

// ---------- 2. 웹: 작업 가져가기 · 상태 · 결과 ----------
function fakeDb(rows, tokens) {
  const state = { rows, updates: [] };
  const builder = (table) => {
    const q = { table, filters: {}, op: 'select', patch: null };
    const chain = {
      select() { return chain; }, order() { return chain; }, limit() { return chain; },
      eq(k, v) { q.filters[k] = v; return chain; },
      update(patch) { q.op = 'update'; q.patch = patch; return chain; },
      delete() { q.op = 'delete'; return chain; },
      maybeSingle: async () => ({ data: run(true) }),
      then(resolve) { resolve({ data: run(false), error: null }); },
    };
    function run(single) {
      const list = table === 'nba_extension_tokens' ? tokens : state.rows;
      const hit = list.filter((r) => Object.entries(q.filters).every(([k, v]) => r[k] === v));
      if (q.op === 'update') { hit.forEach((r) => Object.assign(r, q.patch)); state.updates.push({ table, patch: q.patch, ids: hit.map((r) => r.id) }); return hit.map((r) => ({ id: r.id })); }
      if (q.op === 'delete') { hit.forEach((r) => list.splice(list.indexOf(r), 1)); return null; }
      return single ? hit[0] || null : hit;
    }
    return chain;
  };
  return { from: builder, state };
}
const taskRoute = loadTS(path.join(root, 'src/app/api/extension/task/route.ts'));
const statusRoute = loadTS(path.join(root, 'src/app/api/extension/status/route.ts'));
const finishSrc = fs.readFileSync(path.join(root, 'src/app/api/extension/finish/route.ts'), 'utf8');
assert.ok(finishSrc.includes('evaluateProgramAccessForUser'), '결과 반영 전 권한 재검증 유지');
const post = (token, body) => ({ headers: { get: (k) => (k.toLowerCase() === 'authorization' && token ? `Bearer ${token}` : null) }, json: async () => body });

(async () => {
  const rows = [
    { id: 'p1', user_id: 'u1', blog_id: 'myblog', status: 'queued', title: 'T', content: '본문', images: [], tags: [], created_at: '1' },
    { id: 'p2', user_id: 'u2', blog_id: 'myblog', status: 'queued', title: '남의 글', content: 'x', images: [], tags: [], created_at: '0' },
    { id: 'p3', user_id: 'u1', blog_id: 'other', status: 'queued', title: '다른 블로그', content: 'x', images: [], tags: [], created_at: '0' },
  ];
  db = fakeDb(rows, [{ token: 'tok1', user_id: 'u1' }]);

  let res = await taskRoute.POST(post(null, {}));
  assert.equal(res.status, 401);
  res = await taskRoute.POST(post('bad', {}));
  assert.equal(res.status, 401);

  access = { allowed: false, error: '이용 권한이 없습니다.', status: 403 };
  res = await taskRoute.POST(post('tok1', { blogId: 'myblog' }));
  assert.equal(res.status, 403);
  assert.equal(rows[0].status, 'queued', '권한 없으면 가져가지 않음');
  access = { allowed: true };

  res = await taskRoute.POST(post('tok1', { blogId: 'myblog' }));
  assert.equal(res.body.task.id, 'p1');
  assert.equal(res.body.task.type, 'publish');
  assert.equal(res.body.task.blogId, 'myblog');
  assert.equal(rows[0].status, 'publishing');
  assert.equal(rows[1].status, 'queued', '다른 회원 글은 건드리지 않음');
  assert.equal(rows[2].status, 'queued', '다른 블로그 글은 건드리지 않음');

  res = await taskRoute.POST(post('tok1', { blogId: 'myblog' }));
  assert.equal(res.body.task, null, '같은 글을 두 번 가져가지 않음');

  res = await statusRoute.POST(post('tok1', { id: 'p1' }));
  assert.equal(res.body.state, 'running');
  rows[0].status = 'draft'; // 웹에서 취소
  res = await statusRoute.POST(post('tok1', { id: 'p1' }));
  assert.notEqual(res.body.state, 'running');
  res = await statusRoute.POST(post('tok1', { id: 'p2' }));
  assert.equal(res.body.state, 'missing', '다른 회원 글 상태는 조회 불가');

  // ---------- 3. 확장: 어댑터 호출 매핑 ----------
  const calls = [];
  const stored = [];
  const badges = [];
  const sandbox = {
    console, URL, AbortSignal, Uint8Array, btoa,
    importScripts() {}, setInterval() {}, clearInterval() {}, crypto: { randomUUID: () => 'dev' },
    chrome: {
      storage: { local: { get: async () => ({}), set: async (v) => { stored.push(v); }, remove: async () => {} } },
      alarms: { create() {}, onAlarm: { addListener() {} } },
      action: { onClicked: { addListener() {} }, setBadgeText: async (v) => { badges.push(v.text); }, setBadgeBackgroundColor: async () => {} },
      tabs: { onUpdated: { addListener() {} } },
      runtime: { onStartup: { addListener() {} }, onInstalled: { addListener() {} }, onMessage: { addListener() {} }, getURL: (x) => x, getManifest: () => ({ version: '1.49.0', version_name: 'v1.49' }) },
    },
    fetch: async (url, init) => {
      calls.push({ url, init });
      if (url.startsWith('https://x.supabase.co/')) return { ok: true, blob: async () => ({ type: 'image/png', arrayBuffer: async () => new Uint8Array([137, 80, 78, 71]).buffer }) };
      if (url.endsWith('/api/extension/auth')) return { ok: true, json: async () => ({ token: 'tok9' }) };
      return { ok: true, json: async () => ({ ok: true }) };
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'extension/background.js'), 'utf8'), sandbox);
  const api = sandbox.api;
  const conn = { token: 'tok9', blogId: 'myblog' };
  const base = 'https://naver-blog-agent.vercel.app';

  const paired = await api('/pair', { code: 'ABCD1234', blogId: 'myblog' });
  assert.equal(`${paired.token}/${paired.blogId}`, 'tok9/myblog');
  assert.equal(calls.at(-1).url, base + '/api/extension/auth');
  assert.equal(JSON.parse(calls.at(-1).init.body).code, 'ABCD1234');

  await api('/poll', {}, conn);
  assert.equal(calls.at(-1).url, base + '/api/extension/task');
  assert.equal(calls.at(-1).init.headers.Authorization, 'Bearer tok9');
  assert.equal(JSON.parse(calls.at(-1).init.body).blogId, 'myblog');

  await api('/result', { id: 'p1', result: { published: true, url: 'https://blog.naver.com/myblog/1' } }, conn);
  let body = JSON.parse(calls.at(-1).init.body);
  assert.equal([calls.at(-1).url, body.taskId, body.success, body.postUrl].join('|'), [base + '/api/extension/finish', 'p1', true, 'https://blog.naver.com/myblog/1'].join('|'));
  await api('/result', { id: 'p1', error: '입력 실패', code: 'AUTHORING_FAILED' }, conn);
  body = JSON.parse(calls.at(-1).init.body);
  assert.equal(body.success, false);
  assert.match(body.error, /AUTHORING_FAILED.*입력 실패/);

  await api('/task/status', { id: 'p1' }, conn);
  assert.equal(calls.at(-1).url, base + '/api/extension/status');
  const before = calls.length;
  assert.equal(JSON.stringify(await api('/heartbeat', {}, conn)), '{}');
  assert.equal(JSON.stringify(await api('/progress', { id: 'p1', message: 'x' }, conn)), '{}');
  assert.equal(calls.length, before, '진행 표시는 서버 호출을 만들지 않음');
  await assert.rejects(() => api('/unknown', {}, conn), /지원하지 않는/);

  const asset = await sandbox.loadAsset({ payload: { assets: [{ url: 'https://x.supabase.co/b1.png', name: 'blog_img_1.png' }] } }, 0);
  assert.equal([asset.mime, asset.name, asset.data].join('|'), ['image/png', 'blog_img_1.png', Buffer.from([137, 80, 78, 71]).toString('base64')].join('|'));
  await assert.rejects(() => sandbox.loadAsset({ payload: { assets: [{ url: 'http://insecure/x.png' }] } }, 0), /올바르지/);

  // ---------- 3-1. 새 버전 알림 ----------
  const versionRoute = loadTS(path.join(root, 'src/app/api/extension/version/route.ts'));
  const versionRes = await versionRoute.GET({ url: 'https://naver-blog-agent.vercel.app/api/extension/version' });
  assert.equal(versionRes.body.latest, loadTS(path.join(root, 'src/lib/version.ts')).APP_VERSION);
  assert.equal(versionRes.body.downloadUrl, 'https://naver-blog-agent.vercel.app/downloads/naver-blog-agent-extension-latest.zip');
  assert.equal(JSON.stringify(Object.keys(versionRes.body).sort()), '["downloadUrl","latest"]', '공개 경로는 버전과 주소만 돌려줌');
  const isNewer = sandbox.isNewer;
  for (const [latest, current, expected] of [['v1.50', 'v1.49', true], ['v1.49', 'v1.49', false], ['v1.48', 'v1.49', false], ['v2.01', 'v1.99', true], ['v1.10', 'v1.9', true], ['garbage', 'v1.49', false], [undefined, 'v1.49', false]]) {
    assert.equal(isNewer(latest, current), expected, `${latest} vs ${current}`);
  }
  const setVersionReply = (reply) => { sandbox.fetch = async (url) => { assert.equal(url, 'https://naver-blog-agent.vercel.app/api/extension/version'); return reply; }; };
  stored.length = 0; badges.length = 0;
  setVersionReply({ ok: true, json: async () => ({ latest: 'v1.50', downloadUrl: 'https://naver-blog-agent.vercel.app/downloads/naver-blog-agent-extension-latest.zip' }) });
  await sandbox.checkUpdate();
  assert.equal(stored.at(-1).update.outdated, true);
  assert.equal(stored.at(-1).update.current, 'v1.49');
  assert.equal(badges.at(-1), 'NEW');
  setVersionReply({ ok: true, json: async () => ({ latest: 'v1.49', downloadUrl: 'https://naver-blog-agent.vercel.app/downloads/naver-blog-agent-extension-latest.zip' }) });
  await sandbox.checkUpdate();
  assert.equal(stored.at(-1).update.outdated, false);
  assert.equal(badges.at(-1), '', '최신이면 NEW 표시를 지움');
  const before2 = stored.length;
  setVersionReply({ ok: true, json: async () => ({ latest: 'v1.99', downloadUrl: 'https://evil.example/x.zip' }) });
  await sandbox.checkUpdate();
  setVersionReply({ ok: false, json: async () => ({}) });
  await sandbox.checkUpdate();
  sandbox.fetch = async () => { throw new Error('offline'); };
  await sandbox.checkUpdate();
  assert.equal(stored.length, before2, '다른 사이트 주소·서버 오류·오프라인이면 아무것도 저장하거나 표시하지 않음');
  const popupJs = fs.readFileSync(path.join(root, 'extension/connect.js'), 'utf8');
  assert.ok(popupJs.includes('showUpdate') && popupJs.includes("action('checkUpdate')"), '팝업이 새 버전 안내를 보여줌');
  assert.ok(fs.readFileSync(path.join(root, 'extension/connect.html'), 'utf8').includes('id="update"'));

  // 연결 해제 → 토큰 삭제
  await statusRoute.POST(post('tok1', { disconnect: true }));
  res = await statusRoute.POST(post('tok1', {}));
  assert.equal(res.status, 401, '해제된 토큰은 더 이상 쓸 수 없음');

  // 매니페스트: 로컬 브리지 의존·티스토리 제거
  const manifest = fs.readFileSync(path.join(root, 'extension/manifest.json'), 'utf8');
  assert.ok(!/127\.0\.0\.1|tistory/i.test(manifest));
  assert.ok(!/46321|tistory/i.test(fs.readFileSync(path.join(root, 'extension/background.js'), 'utf8')));
  console.log('extension bridge tests passed');
})().catch((e) => { console.error(e); process.exit(1); });
