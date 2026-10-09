const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const jpeg = require('jpeg-js');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
function load(relative, mocks = {}, globals = {}) {
  const module = { exports: {} };
  const compiled = ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(compiled, { module, exports: module.exports, require: id => id in mocks ? mocks[id] : require(id),
    URL, Buffer, AbortSignal, console, Date, crypto, ...globals });
  return module.exports;
}
const links = load('threads-content-ops/lib/coupangLinks.ts');
const short = 'https://link.coupang.com/a/testManual';
const bannerUrl = 'https://img3a.coupangcdn.com/image/affiliate/banner/test@2x.jpg';
const html = `<a href="${short}?a=1&amp;b=2"><img src="${bannerUrl}" alt="상품 &amp; 생활 &#54620;"></a>`;

test('블로그 HTML의 제휴 링크·상품명·배너 추출, HTML은 실행하지 않는다', () => {
  const parsed = links.readCoupangShare(html);
  assert.equal(parsed.url, `${short}?a=1&b=2`);
  assert.equal(parsed.name, '상품 & 생활 한');
  assert.equal(parsed.bannerUrl, bannerUrl);
  assert.equal(parsed.imageUrl, undefined);
  assert.equal(links.parseCoupangShareCode(`<script>${html}</script>`), null);
});
test('직접 링크·CDN 상품 사진·수정 상품명 지원', () => {
  assert.equal(links.readCoupangShare(short).url, short);
  const parsed = links.readCoupangShare(`<a href='${short}' title='직접 이름'><img src='//thumbnail7.coupangcdn.com/photo.jpg'></a>`);
  assert.equal(parsed.name, '직접 이름');
  assert.equal(parsed.imageUrl, 'https://thumbnail7.coupangcdn.com/photo.jpg');
});
test('일반 쇼핑 주소·iframe·가짜 도메인·다른 프로토콜·초과 HTML 거부', () => {
  assert.throws(() => links.readCoupangShare('https://www.coupang.com/vp/products/123'), /일반 쿠팡/);
  assert.throws(() => links.readCoupangShare('<iframe src="https://coupa.ng/abc"></iframe>'), /블로그용 태그/);
  for (const value of ['https://link.coupang.com.attacker.test/a/test', 'javascript://link.coupang.com/a/test', 'https://user@link.coupang.com/a/test', 'https://link.coupang.com:444/a/test']) {
    assert.throws(() => links.readCoupangShare(value));
  }
  assert.throws(() => links.readCoupangShare('x'.repeat(20001)), /20,000/);
  const parsed = links.readCoupangShare(`<a href="${short}"><img src="https://coupangcdn.com.attacker.test/p.jpg" alt="상품"></a>`);
  assert.equal(parsed.imageUrl, undefined);
});

test('배너 사진 잘라내기, CDN 외 요청·리다이렉트·큰 파일 제한', async () => {
  const pixels = Buffer.alloc(240 * 480 * 4, 255);
  for (let y = 60; y < 300; y++) for (let x = 0; x < 240; x++) {
    const i = (y * 240 + x) * 4; pixels[i] = 230; pixels[i + 1] = 20; pixels[i + 2] = 20;
  }
  const bytes = jpeg.encode({ data: pixels, width: 240, height: 480 }, 95).data;
  let calls = 0;
  const crop = load('threads-content-ops/lib/coupangBanner.ts', { 'server-only': {}, './coupangLinks': links }, {
    fetch: async (url, options) => {
      calls++; assert.equal(url, bannerUrl); assert.equal(options.redirect, 'error');
      return new Response(bytes, { headers: { 'content-type': 'image/jpeg' } });
    },
  });
  assert.equal(await crop.cropPhotoFromCoupangBanner('https://localhost/a.jpg'), null);
  assert.equal(calls, 0);
  const photo = jpeg.decode(await crop.cropPhotoFromCoupangBanner(bannerUrl));
  assert.equal(photo.width, 240); assert.equal(photo.height, 240);
  assert.ok(photo.data[0] > 200 && photo.data[1] < 50);
  const huge = load('threads-content-ops/lib/coupangBanner.ts', { 'server-only': {}, './coupangLinks': links }, {
    fetch: async () => new Response(Buffer.alloc(2000001), { headers: { 'content-type': 'image/jpeg' } }),
  });
  await assert.rejects(huge.cropPhotoFromCoupangBanner(bannerUrl), /너무 큽니다/);
});

function fixture(options = {}) {
  const state = { inserted: [], uploads: [], removed: [], cropCalls: 0, keyCalls: 0, revalidated: 0 };
  const userId = 'owner-user';
  class Query {
    constructor(table) { this.table = table; this.filters = {}; this.isCount = false; }
    select(fields, opts) { this.isCount = Boolean(opts?.head); return this; }
    eq(key, value) { this.filters[key] = value; return this; }
    async maybeSingle() {
      if (this.table === 'tco_threads_accounts') return { data: this.filters.id === 'own-account' && this.filters.user_id === userId ? { id: 'own-account' } : null };
      return { data: options.duplicate ? { id: 'existing' } : null };
    }
    async insert(values) { if (options.insertError) return { error: {} }; state.inserted.push(values); return { error: null }; }
    then(resolve, reject) { return Promise.resolve({ count: options.full ? 200 : 0 }).then(resolve, reject); }
  }
  const storage = {
    upload: async (p, photo) => { state.uploads.push(p); return { error: options.uploadError ? {} : null }; },
    getPublicUrl: p => ({ data: { publicUrl: `https://db.test/storage/v1/object/public/ai-image-generations/${p}` } }),
    remove: async paths => { state.removed.push(...paths); return {}; },
  };
  const db = { auth: { getUser: async () => ({ data: { user: options.loggedOut ? null : { id: userId } } }) }, from: t => new Query(t), storage: { from: () => storage } };
  const actions = load('app/(dashboard)/threads-content-ops/web-actions.ts', new Proxy({
    'next/cache': { revalidatePath: () => state.revalidated++ },
    '@/lib/supabase/server': { createClient: async () => db },
    '@/lib/access/checkProgramAccess': { checkProgramAccess: async () => ({ allowed: !options.noAccess }) },
    '@/lib/apiKeys': { resolveApiKey: async () => { state.keyCalls++; throw new Error('API key should not be requested'); } },
    '@/threads-content-ops/lib/coupangLinks': links,
    '@/threads-content-ops/lib/media': { MEDIA_BUCKET: 'ai-image-generations', memberMediaFolder: id => `${id}/threads-content-ops/up` },
    '@/threads-content-ops/lib/coupangBanner': { cropPhotoFromCoupangBanner: async () => { state.cropCalls++; if (options.photoError) throw new Error('CDN unavailable'); return Buffer.from('photo'); } },
  }, { has: () => true, get: (target, id) => target[id] ?? {} }));
  return { state, actions, input: { accountId: 'own-account', title: '', shareCode: html, summary: '직접 입력 메모' } };
}
test('키 없이 HTML 상품 등록: 본인 계정·메모·제휴 링크·추출 사진 저장', async () => {
  const { state, actions, input } = fixture();
  assert.equal((await actions.registerCoupangManualSource(input)).ok, true);
  assert.equal(state.keyCalls, 0); assert.equal(state.inserted.length, 1);
  const row = state.inserted[0];
  assert.equal(row.user_id, 'owner-user'); assert.equal(row.account_id, 'own-account');
  assert.equal(row.title, '상품 & 생활 한'); assert.equal(row.summary, input.summary);
  assert.equal(row.source_url, `${short}?a=1&b=2`); assert.equal(row.status, 'ready');
  assert.match(row.metadata.imageUrl, /owner-user\/threads-content-ops\/up\/coupang-/);
  assert.equal(state.revalidated, 1);
});
test('링크만 등록·수정 상품명 반영, 사진·키 조회 없음', async () => {
  const { state, actions, input } = fixture();
  assert.equal((await actions.registerCoupangManualSource({ ...input, title: '수정한 상품명', shareCode: short })).ok, true);
  assert.equal(state.inserted[0].title, '수정한 상품명');
  assert.equal(state.cropCalls, 0); assert.equal(state.keyCalls, 0);
});
test('미로그인·권한 없음·다른 계정·중복·한도는 사진 요청·저장 전에 거부', async () => {
  for (const opt of [{ loggedOut: true }, { noAccess: true }, { duplicate: true }, { full: true }, {}]) {
    const { state, actions, input } = fixture(opt);
    assert.equal((await actions.registerCoupangManualSource({ ...input, accountId: Object.keys(opt).length ? 'own-account' : 'another-account' })).ok, false);
    assert.equal(state.inserted.length, 0); assert.equal(state.cropCalls, 0); assert.equal(state.uploads.length, 0);
  }
});
test('사진 실패 시 상품 등록 유지·경고, DB 실패 시 임시 사진만 정리', async () => {
  for (const options of [{ photoError: true }, { uploadError: true }]) {
    const { state, actions, input } = fixture(options);
    const result = await actions.registerCoupangManualSource(input);
    assert.equal(result.ok, true); assert.match(result.warning, /사진/);
    assert.equal(state.inserted[0].metadata.imageUrl, null);
  }
  const { state, actions, input } = fixture({ insertError: true });
  assert.equal((await actions.registerCoupangManualSource(input)).ok, false);
  assert.deepEqual(state.removed, state.uploads);
});
test('사진 미리보기는 저장·업로드·키 조회 없이 실행', async () => {
  const { state, actions } = fixture();
  const result = await actions.previewCoupangShare(html);
  assert.equal(result.ok, true); assert.match(result.imageUrl, /^data:image\/jpeg;base64,/);
  assert.equal(state.inserted.length, 0); assert.equal(state.uploads.length, 0); assert.equal(state.keyCalls, 0);
});
