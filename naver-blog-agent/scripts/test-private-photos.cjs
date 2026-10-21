// 실제 저장 모듈·업로드/조회 API·확장 선점·정리 API를 무료 메모리 Storage로 검증한다.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const OWNER = '00000000-0000-4000-8000-000000000001';
const OTHER = '00000000-0000-4000-8000-000000000002';
const PHOTO = OWNER + '/10000000-0000-4000-8000-000000000001.png';
const DAY = 86400000;
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2ioAAAAASUVORK5CYII=', 'base64');

function harness() {
  const root = path.resolve(__dirname, '../src'), cache = new Map();
  const state = { allowed: true, public: false, missing: false, infoError: null, signError: null, listError: false, removeError: false,
    objects: new Map([[PHOTO, { createdAt: new Date(Date.now() - DAY).toISOString() }]]), uploads: [], signs: [], removed: [], lists: [], writes: [], reads: [], bucketReads: 0,
    rows: [{ id: 'post', user_id: OWNER, blog_id: 'myblog', status: 'queued', title: '사진 후기', content: '[SECTION - 방문]\n회원의 경험\n[IMAGE INSERT - 내부]',
      tags: [], images: [{ storagePath: PHOTO, type: 'thumbnail', caption: '대표' }], updated_at: 'old' }] };
  const storage = {
    async info(file) { return state.infoError ? { data: null, error: state.infoError } : { data: state.objects.get(file) || null, error: state.objects.has(file) ? null : { status: 404 } }; },
    async upload(file, bytes, options) { state.uploads.push({ file, bytes, options }); state.objects.set(file, { createdAt: new Date().toISOString() }); return { data: { path: file }, error: null }; },
    async createSignedUrl(file, seconds) { state.signs.push({ file, seconds }); return state.signError ? { data: null, error: state.signError } : { data: { signedUrl: `https://storage.test/signed/${file}?token=${state.signs.length}` }, error: null }; },
    async list(folder, options) { state.lists.push({ folder, ...options }); if (state.listError) return { data: null, error: {} };
      const rows = folder === '' ? [...new Set([...state.objects.keys()].map(key => key.split('/')[0]))].map(name => ({ name, id: null }))
        : [...state.objects].filter(([key]) => key.startsWith(folder + '/')).map(([key, meta]) => ({ name: key.slice(folder.length + 1), id: key, created_at: meta.createdAt }));
      rows.sort((a, b) => a.name.localeCompare(b.name)); return { data: rows.slice(options.offset, options.offset + options.limit), error: null }; },
    async remove(files) { if (state.removeError) return { error: {} }; state.removed.push(...files); files.forEach(file => state.objects.delete(file)); return { error: null }; },
  };
  const admin = { storage: { async getBucket(id) { assert.equal(id, 'nba-private-photos'); state.bucketReads++; return state.missing ? { data: null, error: { status: 404 } } : { data: { public: state.public }, error: null }; },
    from(id) { assert.equal(id, 'nba-private-photos'); return storage; } }, from(table) {
    const filters = []; let patch;
    const run = () => {
      state.reads.push(table);
      const rows = state.rows.filter(row => filters.every(([key, value, operator]) => operator === 'lt' ? row[key] < value : row[key] === value));
      if (patch && table === 'nba_posts') { state.writes.push({ patch, ids: rows.map(row => row.id) }); rows.forEach(row => Object.assign(row, patch)); }
      return { data: table === 'nba_posts' ? structuredClone(rows) : [], count: 0, error: table === 'nba_collected_materials' && state.sourceError ? {message:'mock source cleanup failed'} : null };
    };
    const query = { select() { return query; }, delete() { return query; }, lte(key,value) { filters.push([key,value,'lt']); return query; }, eq(key, value) { filters.push([key, value]); return query; }, lt(key, value) { filters.push([key, value, 'lt']); return query; }, update(value) { patch = value; return query; }, order() { return query; }, limit() { return query; },
      async maybeSingle() { return table === 'nba_posts' ? { data: run().data[0] || null, error: state.readError ? {} : null } : { data: { default_category: '일상' }, error: null }; }, then(resolve, reject) { return Promise.resolve(run()).then(resolve, reject); } }; return query;
  } };
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const filename = path.join(root, file), module = { exports: {} };
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    const mock = name => {
      if (name === 'server-only') return {};
      if (name === 'next/server') return { NextResponse: { json: (body, init) => ({ body, status: init?.status || 200, headers: init?.headers }) } };
      if (name === '@/lib/supabase/admin') return { createAdminClient: () => admin };
      if (name === '@/lib/access') return { checkProgramAccessApi: async () => state.allowed ? { allowed: true, userId: OWNER } : { allowed: false, status: 401, error: '로그인 필요' } };
      if (name === '@/lib/postReview') return { getPostReview: () => ({ allowed: true }) };
      if (name === '@/lib/extensionBridge') return { authenticateExtension: async () => state.allowed ? { ok: true, userId: OWNER, token: 'own-token', admin } : { ok: false, status: 401, error: '로그인 필요' }, buildBridgePayload: load('lib/extensionBridge.ts').buildBridgePayload };
      if (name === '@/lib/naverRanking') return { checkRankingHealth: async () => [] };
      if (name.startsWith('@/')) return load(name.slice(2) + '.ts');
      if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(filename), name)) + '.ts');
      return require(name);
    };
    new Function('require', 'module', 'exports', compiled)(mock, module, module.exports);
    cache.set(file, module.exports); return module.exports;
  }
  const library = load('lib/privatePhotos.ts');
  const request = body => ({ json: async () => body });
  return { state, admin, library, load, request };
}

test('사진 API는 비로그인·파일 누락·손상된 요청을 차단하고 응답 캐시를 금지한다', async () => {
  const h = harness(), upload = h.load('app/api/photos/route.ts'), resolve = h.load('app/api/photos/resolve/route.ts');
  h.state.allowed = false;
  assert.equal((await upload.POST({})).status, 401); assert.equal((await resolve.POST({})).status, 401);
  assert.equal(h.state.bucketReads, 0);
  h.state.allowed = true;
  const empty = await upload.POST({ formData: async () => new FormData() });
  assert.equal(empty.status, 400); assert.equal(empty.headers['Cache-Control'], 'no-store');
  assert.equal((await upload.POST({ formData: async () => { throw new Error('bad'); } })).status, 400);
  assert.equal((await resolve.POST({ json: async () => { throw new Error('bad'); } })).status, 400);
});

test('본인 사진은 비공개 버킷에 무작위 경로로 새 저장하며 임시 주소를 정적 ID에 섞지 않는다', async () => {
  const h = harness(), form = new FormData(); form.set('file', new File([PNG], '../../private.png', { type: 'image/png' }));
  const result = await h.load('app/api/photos/route.ts').POST({ formData: async () => form });
  assert.equal(result.status, 200); assert.ok(result.body.photo.storagePath.startsWith(OWNER + '/'));
  assert.equal(result.body.photo.url, undefined); assert.equal(result.body.photo.preview, undefined);
  assert.deepEqual(h.state.uploads[0].options, { contentType: 'image/png', upsert: false, cacheControl: '0' });
  assert.deepEqual(Buffer.from(h.state.uploads[0].bytes), PNG); assert.equal(h.state.signs.length, 0);
});

test('SVG·위장 MIME·0바이트·4MB 초과는 저장 전에 거부한다', async () => {
  for (const file of [new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' }), new File([PNG], 'x.jpg', { type: 'image/jpeg' }), new File([], 'x.png', { type: 'image/png' }), new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'x.png', { type: 'image/png' })]) {
    const h = harness(); await assert.rejects(h.library.uploadPrivatePhoto(h.admin, OWNER, file), error => error.status === 400);
    assert.equal(h.state.uploads.length, 0);
  }
});

test('다른 회원·경로 탈출·인코딩 경로·외부 URL은 서명 전에 거부한다', async () => {
  const h = harness();
  for (const value of [PHOTO.replace(OWNER, OTHER), '../' + PHOTO, PHOTO.replace('/', '%2f'), 'https://external.test/a.png', null, OWNER + '/a.svg']) {
    const result = await h.load('app/api/photos/resolve/route.ts').POST(h.request({ paths: [value] }));
    assert.equal(result.status, 404);
  }
  assert.equal(h.state.bucketReads, 0); assert.equal(h.state.signs.length, 0);
});

test('만료 기준은 원본 등록일이고 주소 갱신은 이를 바꾸지 않는다', async () => {
  const h = harness(), created = Date.now() - DAY, expires = created + 30 * DAY;
  h.state.objects.set(PHOTO, { createdAt: new Date(created).toISOString() });
  const first = (await h.library.signPrivatePhotos(h.admin, OWNER, [PHOTO], created + DAY))[0];
  const second = (await h.library.signPrivatePhotos(h.admin, OWNER, [PHOTO], created + 2 * DAY))[0];
  assert.notEqual(first.preview.url, second.preview.url); assert.equal(first.expiresAt, second.expiresAt);
  assert.equal(h.state.signs[0].seconds, 300);
  const edge = (await h.library.signPrivatePhotos(h.admin, OWNER, [PHOTO], expires - 3500))[0];
  assert.equal(h.state.signs.at(-1).seconds, 3); assert.ok(Date.parse(edge.preview.expiresAt) <= expires);
  await assert.rejects(h.library.signPrivatePhotos(h.admin, OWNER, [PHOTO], expires), error => error.status === 410);
});

test('최대 6장·순서를 보존하며 저장소 공개/없는 파일/서명 실패/잘못된 등록일은 실패한다', async () => {
  const h = harness();
  for (const paths of [[], Array(7).fill(PHOTO), 'string']) await assert.rejects(h.library.signPrivatePhotos(h.admin, OWNER, paths), error => error.status === 400);
  h.state.public = true; await assert.rejects(h.library.signPrivatePhotos(h.admin, OWNER, [PHOTO]), error => error.status === 503);
  h.state.public = false; h.state.signError = { message: 'secret-raw-error' };
  const failed = await h.load('app/api/photos/resolve/route.ts').POST(h.request({ paths: [PHOTO] }));
  assert.equal(failed.status, 503); assert.doesNotMatch(JSON.stringify(failed), /secret-raw-error/);
  h.state.signError = null; h.state.objects.set(PHOTO, { createdAt: 'invalid' });
  await assert.rejects(h.library.signPrivatePhotos(h.admin, OWNER, [PHOTO]), error => error.status === 503);
  h.state.objects.delete(PHOTO); await assert.rejects(h.library.signPrivatePhotos(h.admin, OWNER, [PHOTO]), error => error.status === 404);
});

test('확장 전달 사본만 서명하고 원고·대표/본문 순서·기존 URL은 보존한다', async () => {
  const h = harness(), bodyPath = PHOTO.replace('10000000', '20000000');
  h.state.objects.set(bodyPath, { createdAt: new Date(Date.now() - DAY).toISOString() });
  const row = { images: [{ storagePath: PHOTO, type: 'thumbnail', caption: '대표', url: 'https://forged.test' }, { storagePath: bodyPath, type: 'body', caption: '내부' }, { url: 'https://old.test/a.png', type: 'body' }] };
  const original = structuredClone(row), hydrated = await h.library.resolvePrivatePostPhotos(h.admin, OWNER, row);
  assert.deepEqual(row, original); assert.notEqual(hydrated, row);
  assert.match(hydrated.images[0].url, /^https:\/\/storage.test\/signed\//); assert.equal(hydrated.images[2].url, row.images[2].url);
  assert.deepEqual(hydrated.images.map(image => image.caption), ['대표', '내부', undefined]);
});

test('실제 확장 작업은 사진 서명 후 선점하며 사진 오류 때는 queued를 유지한다', async () => {
  for (const kind of ['foreign', 'expired', 'sign-error', 'public']) {
    const h = harness();
    if (kind === 'foreign') h.state.rows[0].images[0].storagePath = PHOTO.replace(OWNER, OTHER);
    if (kind === 'expired') h.state.objects.set(PHOTO, { createdAt: new Date(Date.now() - 31 * DAY).toISOString() });
    if (kind === 'sign-error') h.state.signError = {};
    if (kind === 'public') h.state.public = true;
    const result = await h.load('app/api/extension/task/route.ts').POST(h.request({ blogId: 'myblog', supportsPrepare: true, supportsPrivatePhotos: true, supportsRuns: true }));
    assert.ok(result.status >= 400, kind); assert.equal(h.state.rows[0].status, 'queued'); assert.equal(h.state.writes.length, 0);
  }
  const h = harness(), images = structuredClone(h.state.rows[0].images);
  const result = await h.load('app/api/extension/task/route.ts').POST(h.request({ blogId: 'myblog', supportsPrepare: true, supportsPrivatePhotos: true, supportsRuns: true }));
  assert.equal(result.status, 200); assert.equal(h.state.rows[0].status, 'publishing');
  assert.match(result.body.task.payload.assets[0].url, /^https:\/\/storage.test\/signed\//);
  assert.deepEqual(h.state.rows[0].images, images); assert.equal(h.state.writes.length, 1);
  assert.equal(result.body.task.payload.assets[0].storagePath, PHOTO);
});

test('비공개 사진을 지원하지 않는 옛 확장은 사진 작업을 선점하지 못한다', async () => {
  const h = harness();
  const result = await h.load('app/api/extension/task/route.ts').POST(h.request({ blogId: 'myblog', supportsPrepare: true }));
  assert.equal(result.status, 409); assert.equal(h.state.writes.length, 0); assert.equal(h.state.signs.length, 0);
});

test('확장 사진 갱신은 동일 회원·원고·연결·실행·유효 기간·연결 사진을 모두 확인한다', async () => {
  const h = harness(), executions = h.load('lib/executionRuns.ts');
  h.state.rows[0].status = 'publishing';
  const run = executions.newExecution('own-token');
  h.state.rows[0].research_summary = executions.withExecution(null, run);
  const route = h.load('app/api/extension/photos/route.ts'), body = { taskId: 'post', runId: run.runId, storagePath: PHOTO };
  const ok = await route.POST(h.request(body)); assert.equal(ok.status, 200); assert.equal(ok.body.photo.storagePath, PHOTO);
  assert.equal(ok.headers['Cache-Control'], 'no-store');
  for (const altered of [{ runId: 'old-run' }, { taskId: 'other' }, { storagePath: PHOTO.replace(OWNER, OTHER) }, { storagePath: PHOTO.replace('10000000', '20000000') }]) {
    assert.ok((await route.POST(h.request({ ...body, ...altered }))).status >= 400);
  }
  run.owner = executions.connectionOwner('another-pc'); assert.equal((await route.POST(h.request(body))).status, 409);
  run.owner = executions.connectionOwner('own-token'); run.leaseExpiresAt = new Date(Date.now() - 1).toISOString();
  assert.equal((await route.POST(h.request(body))).status, 409);
  run.leaseExpiresAt = new Date(Date.now() + DAY).toISOString(); h.state.rows[0].status = 'prepared';
  assert.equal((await route.POST(h.request(body))).status, 409);
  h.state.rows[0].status = 'publishing'; h.state.rows[0].user_id = OTHER; assert.equal((await route.POST(h.request(body))).status, 404);
  h.state.rows[0].user_id = OWNER; h.state.readError = true; assert.equal((await route.POST(h.request(body))).status, 503);
  h.state.readError = false; h.state.allowed = false; assert.equal((await route.POST(h.request(body))).status, 401);
  assert.equal(h.state.signs.length, 1); assert.equal(h.state.writes.length, 0);
});

test('실제 확장 이미지 다운로드 함수는 직전에 주소를 갱신하고 갱신 실패 시 옛 주소를 사용하지 않는다', async () => {
  const filename = path.resolve(__dirname, '../extension/background.js'), source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true);
  const node = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'loadAsset');
  let calls = 0;
  const body = { id: 'post', runId: 'run', payload: { assets: [{ storagePath: PHOTO, url: 'https://expired.test/image.png', name: 'cover.png' }] } };
  const load = new Function('api', 'fetch', node.getText(source) + ';return loadAsset;')(async (route, value) => {
    assert.equal(route, '/photo'); assert.deepEqual(value, { taskId: 'post', runId: 'run', storagePath: PHOTO });
    return { photo: { preview: { url: 'https://renewed.test/photo' } } };
  }, async (url, init) => { calls++; assert.equal(url, 'https://renewed.test/photo'); assert.equal(init.cache, 'no-store'); return new Response(PNG, { headers: { 'Content-Type': 'image/png' } }); });
  const photo = await load(body, 0); assert.equal(photo.mime, 'image/png'); assert.equal(calls, 1);
  const failed = new Function('api', 'fetch', node.getText(source) + ';return loadAsset;')(async () => { throw new Error('stopped'); }, async () => assert.fail('갱신 실패 후 다운로드 금지'));
  await assert.rejects(failed(body, 0), /stopped/);
});

test('정리는 원고 미연결 사진도 정확히 30일에 삭제하고 dry 실행은 삭제하지 않는다', async () => {
  const h = harness(), now = Date.now(); h.state.objects.set(PHOTO, { createdAt: new Date(now - 30 * DAY).toISOString() });
  const recent = PHOTO.replace('10000000', '20000000'); h.state.objects.set(recent, { createdAt: new Date(now - DAY).toISOString() });
  assert.deepEqual(await h.library.cleanupPrivatePhotos(h.admin, true, now), { configured: true, expired: 1, removed: 0 });
  assert.equal(h.state.removed.length, 0);
  assert.deepEqual(await h.library.cleanupPrivatePhotos(h.admin, false, now), { configured: true, expired: 1, removed: 1 });
  assert.deepEqual(h.state.removed, [PHOTO]); assert.ok(h.state.objects.has(recent));
});

test('1000건을 넘는 사진은 페이지를 모두 읽은 뒤 삭제해 건너뛰지 않는다', async () => {
  const h = harness(), now = Date.now(); h.state.objects.clear();
  for (let i = 0; i < 1001; i++) h.state.objects.set(OWNER + '/' + i.toString(16).padStart(8, '0') + '-0000-4000-8000-000000000001.png', { createdAt: new Date(now - 31 * DAY).toISOString() });
  const result = await h.library.cleanupPrivatePhotos(h.admin, false, now);
  assert.equal(result.expired, 1001); assert.equal(result.removed, 1001); assert.equal(h.state.objects.size, 0);
  assert.ok(h.state.lists.some(item => item.folder === OWNER && item.offset === 1000));
});

test('회원 폴더도 1000개 이후까지 검사하며 6장 주소 순서는 입력 순서와 같다', async () => {
  const h = harness(), now = Date.now(); h.state.objects.clear();
  const paths = [];
  for (let i = 0; i < 1001; i++) {
    const owner = i.toString(16).padStart(8, '0') + '-0000-4000-8000-000000000001';
    const photo = owner + '/10000000-0000-4000-8000-000000000001.png';
    h.state.objects.set(photo, { createdAt: new Date(now - DAY).toISOString() });
  }
  const result = await h.library.cleanupPrivatePhotos(h.admin, true, now);
  assert.equal(result.expired, 0); assert.ok(h.state.lists.some(item => item.folder === '' && item.offset === 1000));
  for (let i = 0; i < 6; i++) {
    const photo = OWNER + '/' + i.toString(16).padStart(8, '0') + '-0000-4000-8000-000000000001.png';
    h.state.objects.set(photo, { createdAt: new Date(now - DAY).toISOString() }); paths.unshift(photo);
  }
  const signed = await h.library.signPrivatePhotos(h.admin, OWNER, paths, now);
  assert.deepEqual(signed.map(item => item.storagePath), paths); assert.equal(signed.length, 6);
});

test('공개 버킷·목록/삭제 오류는 정리 성공으로 숨기지 않으며 미생성 버킷만 비활성으로 반환한다', async () => {
  const h = harness(); h.state.missing = true;
  assert.deepEqual(await h.library.cleanupPrivatePhotos(h.admin, false), { configured: false, expired: 0, removed: 0 });
  h.state.missing = false; h.state.public = true; await assert.rejects(h.library.cleanupPrivatePhotos(h.admin, false));
  h.state.public = false; h.state.listError = true; await assert.rejects(h.library.cleanupPrivatePhotos(h.admin, false));
  h.state.listError = false; h.state.objects.set(PHOTO, { createdAt: new Date(Date.now() - 31 * DAY).toISOString() });
  h.state.removeError = true; await assert.rejects(h.library.cleanupPrivatePhotos(h.admin, false)); assert.equal(h.state.objects.size, 1);
});

test('실제 Cron 인증 실패는 저장소에 접근하지 않고 dry 정리는 원본 시각을 사용한다', async () => {
  const h = harness(), route = h.load('app/api/cron/cleanup/route.ts');
  const previous = { mode: process.env.NODE_ENV, secret: process.env.CRON_SECRET };
  process.env.NODE_ENV = 'production'; process.env.CRON_SECRET = 'mock-cron';
  try {
    const request = (token = '') => ({ headers: { get: () => token }, nextUrl: new URL('https://test/api/cron/cleanup?dry=1') });
    assert.equal((await route.GET(request())).status, 401); assert.equal(h.state.bucketReads, 0);
    h.state.objects.set(PHOTO, { createdAt: new Date(Date.now() - 31 * DAY).toISOString() });
    const result = await route.GET(request('Bearer mock-cron'));
    assert.equal(result.status, 200); assert.equal(result.body.privatePhotos.expired, 1); assert.equal(h.state.removed.length, 0);
  } finally {
    for (const [key, value] of [['NODE_ENV', previous.mode], ['CRON_SECRET', previous.secret]]) value === undefined ? delete process.env[key] : process.env[key] = value;
  }
});

test('새 사진 정리 오류도 기존 원고 정리를 막지 않고 Cron은 실패를 표시한다', async () => {
  const h = harness(); h.state.public = true;
  h.load('lib/retention.ts').retentionCutoff = () => new Date(Date.now() - 30 * DAY);
  const originalFrom = h.admin.storage.from;
  h.admin.storage.from = bucket => bucket === 'ai-image-generations' ? { list: async () => ({ data: [] }) } : originalFrom(bucket);
  const previous = process.env.CRON_SECRET; process.env.CRON_SECRET = 'mock-cron';
  try {
    const result = await h.load('app/api/cron/cleanup/route.ts').GET({ headers: { get: () => 'Bearer mock-cron' }, nextUrl: new URL('https://test/api/cron/cleanup?dry=1') });
    assert.equal(result.status, 503); assert.equal(result.body.success, false); assert.ok(result.body.privatePhotos.error);
    assert.ok(h.state.reads.includes('nba_posts')); assert.equal(h.state.removed.length, 0);
  } finally { previous === undefined ? delete process.env.CRON_SECRET : process.env.CRON_SECRET = previous; }
});

test('새 글감 정리 실패도 성공으로 숨기지 않으며 dry 모드가 유지된다', async () => {
  const h=harness();h.state.sourceError=true;
  const previous=process.env.CRON_SECRET;process.env.CRON_SECRET='mock-cron';
  try {
    const result=await h.load('app/api/cron/cleanup/route.ts').GET({headers:{get:()=> 'Bearer mock-cron'},nextUrl:new URL('https://test/api/cron/cleanup?dry=1')});
    assert.equal(result.status,503);assert.equal(result.body.success,false);assert.ok(result.body.sourceMaterials.error);assert.equal(result.body.dryRun,true);assert.equal(h.state.removed.length,0);
  } finally {previous===undefined?delete process.env.CRON_SECRET:process.env.CRON_SECRET=previous;}
});
