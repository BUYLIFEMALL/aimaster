// 실제 네이버 발행·유료 호출 없이 확장 ↔ 웹 큐 연결(변환·가져가기·결과 반영)을 모의 검수합니다.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

// SmartEditor can retain only the first emoji when a whole caption is inserted
// in one event. Exercise the real chunker and keep compound graphemes intact.
const editorAst = ts.createSourceFile('editor.js', fs.readFileSync(path.join(root, 'extension/editor.js'), 'utf8'), ts.ScriptTarget.Latest, true);
let chunkNode;
function findChunker(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'textInputChunks') chunkNode = node;
  ts.forEachChild(node, findChunker);
}
findChunker(editorAst);
assert.ok(chunkNode);
const inputChunks = new Function(`${chunkNode.getText(editorAst)};return textInputChunks;`)();
assert.deepEqual(inputChunks('일반 한글 문단'), ['일반 한글 문단']);
assert.deepEqual(inputChunks('📷 사진 설명 전체'), ['📷', ' 사진 설명 전체']);
assert.deepEqual(inputChunks('본문 🧑🏽‍💻 끝'), ['본문 ', '🧑🏽‍💻', ' 끝']);
assert.deepEqual(inputChunks('👨‍👩‍👧‍👦 가족 🇰🇷 한국'), ['👨‍👩‍👧‍👦', ' 가족 ', '🇰🇷', ' 한국']);
const caption = '📷 세 가지 스마트폰 디스플레이 비교';
const smartEditorInsert = value => /[\u{10000}-\u{10FFFF}]/u.test(value) ? [...new Intl.Segmenter(undefined, {granularity:'grapheme'}).segment(value)][0].segment : value;
assert.notEqual(smartEditorInsert(caption), caption, '회귀 검수는 편집기의 이모지 뒤 텍스트 손실을 재현');
assert.equal(inputChunks(caption).map(smartEditorInsert).join(''), caption);

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
    if (id === '@/lib/naverPublishing') return loadTS(path.join(root, 'src/lib/naverPublishing.ts'));
    if (id === 'next/server') return { NextResponse: { json: (body, init) => ({ body, status: init?.status || 200 }) } };
    return require(id);
  };
  vm.runInThisContext(`(function(require,module,exports){${js}\n})`, { filename })(req, module, module.exports);
  return module.exports;
}
const bridge = loadTS(path.join(root, 'src/lib/extensionBridge.ts'));
const publishing = loadTS(path.join(root, 'src/lib/naverPublishing.ts'));
assert.deepEqual(publishing.normalizeNaverTags(['#가성비 스마트폰', '가성비스마트폰', '', null, ' #AI 툴 ']), ['가성비스마트폰', 'AI툴']);
const categoryPrefs = { id: '29', name: '●AI자동화' };
const summary = { sources: ['기존 자료'], unrelated: { preserve: true } };
const withPrefs = publishing.withNaverCategory(summary, 'myblog', categoryPrefs);
assert.deepEqual(withPrefs.sources, summary.sources);
assert.deepEqual(withPrefs.unrelated, summary.unrelated);
assert.deepEqual(publishing.readNaverCategory(withPrefs, 'myblog'), categoryPrefs);
assert.equal(publishing.readNaverCategory(withPrefs, 'otherblog'), null, '블로그 변경 시 다른 계정 카테고리 재사용 금지');
const configuredPayload = bridge.buildBridgePayload({title:'제목',content:'본문',blog_id:'myblog',research_summary:withPrefs,tags:['#AI 툴', 'AI툴']}, '기본값');
assert.equal(configuredPayload.category, categoryPrefs.name);
assert.equal(configuredPayload.categoryId, '29');
assert.deepEqual(configuredPayload.tags, ['AI툴']);
assert.equal(bridge.buildBridgePayload({title:'제목',content:'본문'}, '기본값').category, '기본값');
assert.throws(()=>publishing.parseNaverCategory({id:'not-an-id',name:'카테고리'}));

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

// 공개 범위: 기본·알 수 없는 값은 비공개, 'public'만 전체공개
assert.equal(p.publishVisibility, 'private', '값이 없으면 비공개');
assert.equal(bridge.buildBridgePayload({ title: 't', content: '본문', publish_visibility: 'public' }).publishVisibility, 'public');
assert.equal(bridge.buildBridgePayload({ title: 't', content: '본문', publish_visibility: 'private' }).publishVisibility, 'private');
assert.equal(bridge.buildBridgePayload({ title: 't', content: '본문', publish_visibility: 'PUBLIC ' }).publishVisibility, 'private', '알 수 없는 값은 비공개');
assert.equal(bridge.buildBridgePayload({ title: 't', content: '본문', publish_visibility: null }).publishVisibility, 'private');

// 스마트 에디터 HTML 원고
p = bridge.buildBridgePayload({
  title: 't', images: [], content: '<h2>소제목 &amp; 하나</h2><p>문단 <strong>강조</strong></p><img src="https://x.supabase.co/c.png"><p>다음</p><img src="http://insecure/x.png">',
});
assert.equal(p.article, '[SECTION - 소제목 & 하나]\n문단 강조\n[IMAGE INSERT - 1]\n다음');
assert.equal(p.assets.length, 1);

// v1.58 편집기가 대표 이미지를 첫 본문 자리에 넣고 마지막 본문 이미지를 누락한 실제 실패 형태.
const fourImages = [...imgs, { url: 'https://x.supabase.co/b3.png', type: 'body' }];
const legacyHtml = '<h2>첫째</h2><p>본문 1</p><img src="https://x.supabase.co/t.png"><h2>둘째</h2><p>본문 2</p><img src="https://x.supabase.co/b1.png"><h2>셋째</h2><p>본문 3</p><img src="https://x.supabase.co/b2.png">';
const repaired = bridge.buildBridgePayload({ title: '제목', images: fourImages, content: legacyHtml });
assert.deepEqual(repaired.assets.map(a => a.url), fourImages.map(i => i.url));
assert.deepEqual(repaired.bodyImages.map(i => i.index), [1, 2, 3]);
assert.ok(repaired.bodyImages.every(i => i.name === repaired.assets[i.index].name), '업로드 파일명과 검증 파일명 일치');

// 정상 HTML은 명시된 이미지 위치를 유지하고 대표/본문 동일 URL의 반복만 제거한다.
const repeated = bridge.buildBridgePayload({ title: '제목', images: fourImages, content: '<img src="https://x.supabase.co/t.png"><h2>본문</h2><img src="https://x.supabase.co/b3.png"><img src="https://x.supabase.co/b1.png"><img src="https://x.supabase.co/b1.png"><img src="https://x.supabase.co/b2.png">' });
assert.deepEqual(repeated.bodyImages.map(i => repeated.assets[i.index].url), [fourImages[3].url, fourImages[1].url, fourImages[2].url]);
assert.equal(new Set(repeated.assets.map(a => a.url)).size, 4);

// 실제 스마트 편집기 변환 함수를 AST로 읽어 검사한다(React 화면/유료 AI 호출 없음).
const modalPath = path.join(root, 'src/components/BlogSmartEditorModal.tsx');
const modalSource = ts.createSourceFile(modalPath, fs.readFileSync(modalPath, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const convertNode = modalSource.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'convertTextToEditorHtml');
assert.ok(convertNode);
const convertJs = ts.transpileModule(convertNode.getText(modalSource), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
const convert = new Function(`${convertJs};return convertTextToEditorHtml;`)();
const rawDraft = '[SECTION - 첫째]\n본문 1\n[IMAGE INSERT - 첫 사진]\n[SECTION - 둘째]\n본문 2\n[IMAGE INSERT - 둘째 사진]\n[SECTION - 셋째]\n본문 3\n[IMAGE INSERT - 셋째 사진]';
const converted = convert(rawDraft, fourImages);
assert.deepEqual([...converted.matchAll(/<img src="([^"]+)"/g)].map(m => m[1]), fourImages.slice(1).map(i => i.url));
assert.equal(convert(converted, fourImages), converted, '이미 HTML인 원고는 변환하지 않음');
assert.equal((convert(rawDraft + '\n[IMAGE INSERT - 남는 자리]', fourImages).match(/<img /g) || []).length, 3, '본문 사진을 반복 사용하지 않음');
const convertedPayload = bridge.buildBridgePayload({ title: '제목', images: fourImages, content: converted });
assert.deepEqual(convertedPayload.assets.map(a => a.url), fourImages.map(i => i.url));

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
  let runtimeListener;
  const sandbox = {
    console, URL, AbortSignal, Uint8Array, btoa,
    importScripts() {}, setInterval() {}, clearInterval() {}, crypto: { randomUUID: () => 'dev' },
    chrome: {
      storage: { local: { get: async () => ({}), set: async (v) => { stored.push(v); }, remove: async () => {} } },
      alarms: { create() {}, onAlarm: { addListener() {} } },
      action: { onClicked: { addListener() {} }, setBadgeText: async (v) => { badges.push(v.text); }, setBadgeBackgroundColor: async () => {} },
      tabs: { onUpdated: { addListener() {} }, onRemoved: { addListener() {} }, onReplaced: { addListener() {} } },
      runtime: { onStartup: { addListener() {} }, onInstalled: { addListener() {} }, onMessage: { addListener(listener) { runtimeListener=listener; } }, getURL: (x) => x, getManifest: () => ({ version: '1.49.0', version_name: 'v1.49' }) },
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

  // ---------- 3-0. 이미지 삽입 계획 → 순차 입력 → 마지막 검증(최종 발행 없음) ----------
  const writer = require('../extension/writer.js');
  const { articlePlan } = require('../extension/article-plan.js');
  const oldPayload = { ...repaired, bodyImages: [{ sequence: 99, index: 0, name: 'blog_img_99.png' }, ...repaired.bodyImages], article: '[IMAGE INSERT - 99]\n' + repaired.article };
  const layout = writer.buildWriterSteps(oldPayload, articlePlan(oldPayload.article));
  assert.equal(layout.imageCount, 4, '옛 서버가 보낸 대표 중복 자리도 확장에서 방어');
  assert.equal(layout.plan.some(b => b.sequence === 99), false);
  assert.deepEqual(layout.steps.filter(s => s.type === 'image').map(s => s.name), repaired.assets.map(a => a.name));
  const entered = { ok: true, title: '', blocks: [] };
  const authoringCommands = [];
  sandbox.articlePlan = articlePlan;
  Object.assign(sandbox, writer);
  sandbox.loadAsset = async (task, index) => ({ data: 'iVBORw==', mime: 'image/png', name: task.payload.assets[index].name });
  sandbox.command = async (_tab, type, args = {}) => {
    authoringCommands.push(type);
    if (type === 'snapshot') return structuredClone(entered);
    if (type === 'title') entered.title = args.text;
    if (['quote', 'paragraph', 'image'].includes(type)) entered.blocks.push({ id: 'c' + entered.blocks.length, type, text: args.text, style: args.style || '', name: args.name || '' });
    if (type === 'verify') assert.equal(args.imageCount, 4);
    return { ok: true };
  };
  const written = await sandbox.writeArticle({ id: 'draft-verification', tabId: 123, blogId: 'myblog', payload: oldPayload }, { checkCancelled: async () => {}, save: async () => {}, onProgress: async () => {} });
  assert.equal(written.complete, true);
  assert.equal(entered.blocks.filter(b => b.type === 'image').length, 4);
  assert.equal(writer.matchingWriterPrefix(entered, layout.steps), layout.steps.length);
  assert.equal(authoringCommands.includes('click'), false, '실제 편집기 검수와 원고 입력은 최종 발행 버튼을 누르지 않음');
  assert.equal(authoringCommands.includes('settings'), false);
  assert.equal(authoringCommands.at(-1), 'verify', '본문 입력 후 검증까지 완료');

  // A resume popup can arrive after an initially valid, empty editor snapshot.
  // Observe it and require a fresh stable interval instead of starting title input.
  let elapsed = 0, dialogReads = 0;
  const originalApi = sandbox.api;
  sandbox.Date = class extends Date { static now() { return elapsed; } };
  sandbox.setTimeout = (resolve, ms) => { elapsed += ms; resolve(); };
  sandbox.api = async () => ({ state: 'running' });
  sandbox.chrome.tabs.get = async () => ({ status: 'complete' });
  sandbox.frameResults = async () => [{ ok: true, dismissed: ++dialogReads === 2 }];
  sandbox.inspect = async () => ({ status: 'valid', hasContent: false });
  const prepared = await sandbox.prepareFreshNaver({ id: 'late-resume', tabId: 123, editorResetStarted: true });
  assert.equal(prepared.status, 'valid');
  assert.ok(elapsed >= 3000 && dialogReads >= 7, '이어쓰기 창 취소 후에도 2초간 빈 편집기를 재확인');
  sandbox.api = originalApi;
  delete sandbox.Date;
  delete sandbox.setTimeout;

  // The website bridge must never operate a different member's connected account
  // or return its bearer token to the page.
  const previousGet = sandbox.chrome.storage.local.get;
  const previousCommand = sandbox.command;
  const previousTab = sandbox.editorTab;
  sandbox.chrome.storage.local.get = async () => ({connection:{blogId:'myblog',token:'secret-test-only'}});
  sandbox.api = async () => ({userId:'owner'});
  let categoryActions=0;
  sandbox.editorTab = async () => { categoryActions++;return 123; };
  sandbox.command = async () => ({ok:true,categories:[{id:'29',name:'●AI자동화'}]});
  const send = message => new Promise(resolve=>runtimeListener(message,{},resolve));
  assert.match((await send({type:'categories',userId:'other',blogId:'myblog'})).error,/회원이 다릅니다/);
  assert.match((await send({type:'categories',userId:'owner',blogId:'otherblog'})).error,/블로그.*다릅니다/);
  assert.equal(categoryActions,0,'다른 회원/블로그는 편집기 접촉 전에 차단');
  const categoryReply=await send({type:'categories',userId:'owner',blogId:'myblog'});
  assert.equal(categoryReply.categories[0].id,'29');
  assert.equal(JSON.stringify(categoryReply).includes('secret-test-only'),false);
  const previousTimeout=sandbox.setTimeout;
  let waitedForHeartbeat=false;
  sandbox.setTimeout=resolve=>{waitedForHeartbeat=true;vm.runInContext('busy=false',sandbox);resolve();};
  vm.runInContext('busy=true',sandbox);
  assert.equal((await send({type:'categories',userId:'owner',blogId:'myblog'})).categories[0].id,'29');
  assert.equal(waitedForHeartbeat,true,'주기 상태 확인과 겹치면 완료를 기다려 조회');
  sandbox.setTimeout=previousTimeout;
  const beforeBlocked=categoryActions;
  sandbox.chrome.storage.local.get=async()=>({connection:{blogId:'myblog'},activeTask:{id:'running'}});
  assert.match((await send({type:'categories',userId:'owner',blogId:'myblog'})).error,/작업이 끝난 뒤/);
  assert.equal(categoryActions,beforeBlocked,'실제 발행 작업 중에는 조회 금지');
  sandbox.api=originalApi;
  sandbox.command=previousCommand;
  sandbox.editorTab=previousTab;
  sandbox.chrome.storage.local.get=previousGet;

  // 이미지 업로드는 비동기다. 시간 초과 후 변화가 아직 안 보여도 다시 업로드하면 안 된다.
  let uploadAttempts = 0;
  await assert.rejects(() => writer.runWriter({ steps: [{ type: 'title', text: '제목' }, { type: 'image', name: 'slow.png' }], read: async () => ({ title: '제목', blocks: [] }), apply: async () => { uploadAttempts++; throw new Error('업로드 시간 초과'); }, save: async () => {}, checkCancelled: async () => {} }), /업로드 시간 초과/);
  assert.equal(uploadAttempts, 1, '지연된 이미지 업로드를 중복 재시도하지 않음');

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
