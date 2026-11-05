// 제휴 타깃 찾기(v1.10) — 실제 코드(매칭·연락처 추출·확장 라우트·회원 동작)를 모의 DB/검색으로 확인한다. 네트워크·유료 호출 없음.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { extractContacts, isBlocked } from '../extension/extract.mjs';

async function load(entry, mocks) {
  const out = await build({ entryPoints: [entry], bundle: true, write: false, format: 'esm', platform: 'node', alias: { '@': '.' }, plugins: [{ name: 'mocks', setup(b) {
    b.onResolve({ filter: /.*/ }, args => mocks[args.path] ? { path: args.path, namespace: 'mock' } : undefined);
    b.onLoad({ filter: /.*/, namespace: 'mock' }, args => ({ contents: mocks[args.path], loader: 'js' }));
  } }] });
  return import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
}
let n = 0; const check = async (name, run) => { await run(); console.log(`ok ${++n} - ${name}`); };

// 표 하나짜리 모의 DB: eq·neq·gte·in·order·limit·count·update를 실제처럼 거른다.
function fakeDb(rows) {
  const log = [];
  return { log, rows, from(table) {
    const f = []; let mode = 'read', payload = null, single = false, head = false, order = null, lim = Infinity; const qb = {};
    qb.select = (_c, o = {}) => { if (o.head) head = true; return qb; };
    for (const op of ['eq', 'neq', 'gte', 'in']) qb[op] = (k, v) => { f.push([op, k, v]); return qb; };
    qb.order = (k, o) => { order = [k, o.ascending]; return qb; }; qb.limit = v => { lim = v; return qb; };
    qb.update = v => { mode = 'update'; payload = v; return qb; }; qb.maybeSingle = () => { single = true; return qb; };
    qb.upsert = (v) => { mode = 'upsert'; payload = v; return qb; };
    qb.then = (res, rej) => {
      let hit = (rows[table] ?? []).filter(r => f.every(([op, k, v]) => op === 'eq' ? r[k] === v : op === 'neq' ? r[k] !== v : op === 'gte' ? (r[k] ?? '') >= v : v.includes(r[k])));
      if (order) hit = [...hit].sort((x, y) => (x[order[0]] - y[order[0]]) * (order[1] ? 1 : -1));
      hit = hit.slice(0, lim);
      if (mode === 'update') { hit.forEach(r => Object.assign(r, payload)); log.push({ table, mode, filters: f, payload }); }
      if (mode === 'upsert') { const add = payload.map((r, i) => ({ id: `new-${i}`, ...r })); rows[table].push(...add); log.push({ table, mode, payload }); hit = add; }
      return Promise.resolve({ data: single ? hit[0] ?? null : hit, count: hit.length, error: null }).then(res, rej);
    };
    return qb;
  } };
}

await check('PU01 topic matching: repeated hits, name, category and extra words add up; unrelated channels stay below the bar', async () => {
  const m = await load('lib/partners/match.ts', {});
  const { main, extras } = m.parseTerms('공동구매', '공구, 체험단, 공동구매');
  assert.deepEqual(extras, ['공구', '체험단'], 'the main word is not repeated as an extra');
  const strong = m.scoreChannel({ name: '맘스 공동 구매방', category: '생활', texts: ['이번주 공구 오픈', '체험단 모집'], hitCount: 3 }, main, extras);
  assert.equal(strong.score, 80, 'hits 30 + name 30 + extras 20 (the posts do not contain the topic itself)'); assert.ok(strong.reasons.includes('채널 이름에 주제'));
  const weak = m.scoreChannel({ name: '여행 일기', category: '', texts: ['제주 맛집'], hitCount: 1 }, main, extras);
  assert.ok(weak.score < m.DEFAULT_MIN_SCORE, 'an unrelated channel is not kept at the default bar');
  assert.equal(m.scoreProfile('공동구매 문의는 카톡', main, extras).score, 40);
});

await check('PU02 contact extraction: mobile > landline (050 included) > e-mail, sample numbers and image names dropped, max 5 each', async () => {
  const r = extractContacts('문의 010.2345.6789 / 매장 (02)345-6789 / 안심 0504-123-4567 / 예시 010-1234-5678 / 메일 Shop@Brand.co.kr logo@2x.png 010-2345-6789');
  assert.deepEqual(r.mobile, ['010-2345-6789']);
  assert.deepEqual(r.landline, ['02-345-6789', '0504-123-4567']);
  assert.deepEqual(r.emails, ['shop@brand.co.kr']);
  assert.deepEqual(r.primary, { contact: '010-2345-6789', type: 'mobile' });
  assert.deepEqual(extractContacts('대표 031-123-4567').primary, { contact: '031-123-4567', type: 'landline' });
  assert.deepEqual(extractContacts('help@shop.kr').primary.type, 'email');
  assert.equal(extractContacts('주문번호 20261105010123456789').mobile.length, 0, 'digits inside a longer number are not a phone');
  assert.equal(extractContacts(Array.from({ length: 8 }, (_, i) => `010-2000-10${i}0`).join(' ')).mobile.length, 5);
  assert.ok(isBlocked('자동입력 방지 문자를 입력해 주세요') && isBlocked('비정상적인 접근이 감지') && !isBlocked('공동구매 오픈'));
});

const routeMocks = (user, db) => ({
  '@/lib/access': `export const checkProgramAccessApi = async () => (${JSON.stringify(user)});`,
  '@/lib/supabase/admin': 'export const createAdminClient = () => globalThis.partnerDb;',
  '@/lib/partners/notice': 'export const PARTNER_NOTICE_VERSION = 1;',
});
const post = (route, body) => route.POST(new Request('https://x/api/partners/extension', { method: 'POST', body: JSON.stringify(body) }));
const channel = (id, user_id, extra = {}) => ({ id, user_id, url: 'https://blog.naver.com/' + id, channel_type: 'blog', keyword: '공동구매', name: id, match_score: 50, scan_status: 'pending', scanned_at: null, ...extra });

await check('PU03 the extension route refuses without access or without the current consent', async () => {
  globalThis.partnerDb = fakeDb({ competitor_partner_consents: [], competitor_partner_channels: [] });
  const denied = await load('app/api/partners/extension/route.ts', routeMocks({ allowed: false, error: '이용 권한이 없습니다.', status: 403 }));
  assert.equal((await post(denied, { op: 'next_batch' })).status, 403);
  const route = await load('app/api/partners/extension/route.ts', routeMocks({ allowed: true, user: { id: 'member-a' } }));
  assert.equal((await post(route, { op: 'next_batch' })).status, 403, 'no consent row');
  globalThis.partnerDb = fakeDb({ competitor_partner_consents: [{ user_id: 'member-a', notice_version: 0, collect_email: false }], competitor_partner_channels: [] });
  assert.equal((await post(route, { op: 'next_batch' })).status, 403, 'an old notice version needs a new consent');
});

await check('PU04 next batch hands out only the member\'s own pending channels, best score first, and marks them as scanning', async () => {
  const db = fakeDb({ competitor_partner_consents: [{ user_id: 'member-a', notice_version: 1, collect_email: false }], competitor_partner_channels: [
    channel('a-low', 'member-a', { match_score: 30 }), channel('a-high', 'member-a', { match_score: 90 }), channel('a-nourl', 'member-a', { url: '' }),
    channel('a-done', 'member-a', { scan_status: 'done' }), channel('b-other', 'member-b', { match_score: 100 })] });
  globalThis.partnerDb = db;
  const route = await load('app/api/partners/extension/route.ts', routeMocks({ allowed: true, user: { id: 'member-a' } }));
  const body = await (await post(route, { op: 'next_batch' })).json();
  assert.deepEqual(body.items.map(i => i.id), ['a-high', 'a-low']); assert.equal(body.collectEmail, false);
  assert.equal(db.rows.competitor_partner_channels.find(r => r.id === 'a-high').scan_status, 'scanning');
  assert.equal(db.rows.competitor_partner_channels.find(r => r.id === 'b-other').scan_status, 'pending');
});

await check('PU05 scan report: e-mails dropped while collection is off, primary recomputed by the server, other member\'s row untouched', async () => {
  const db = fakeDb({ competitor_partner_consents: [{ user_id: 'member-a', notice_version: 1, collect_email: false }], competitor_partner_channels: [
    channel('a1', 'member-a', { scan_status: 'scanning' }), channel('b1', 'member-b', { scan_status: 'scanning' })] });
  globalThis.partnerDb = db;
  const route = await load('app/api/partners/extension/route.ts', routeMocks({ allowed: true, user: { id: 'member-a' } }));
  const report = { op: 'scan_report', id: 'a1', display_name: '광주행정사 : 네이버 블로그', mobile: ['<script>', '010-2345-6789'], landline: ['02-345-6789'], emails: ['x@y.kr'], primary_contact: 'x@y.kr', profile_match_score: 999 };
  assert.equal((await (await post(route, report)).json()).status, 'done');
  const a1 = db.rows.competitor_partner_channels.find(r => r.id === 'a1');
  assert.deepEqual(a1.emails, []); assert.deepEqual(a1.phones_mobile, ['010-2345-6789']);
  assert.equal(a1.primary_type, 'mobile'); assert.equal(a1.primary_contact, '010-2345-6789'); assert.equal(a1.profile_match_score, 60);
  assert.equal(a1.display_name, '광주행정사', 'the page title suffix is removed');
  await post(route, { ...report, id: 'b1' });
  assert.equal(db.rows.competitor_partner_channels.find(r => r.id === 'b1').scan_status, 'scanning', 'a foreign id changes nothing');
  db.rows.competitor_partner_consents[0].collect_email = true;
  await post(route, { op: 'scan_report', id: 'a1', emails: ['Shop@brand.kr'] });
  assert.equal(a1.primary_type, 'email'); assert.deepEqual(a1.emails, ['Shop@brand.kr']);
  await post(route, { op: 'scan_report', id: 'a1', status: 'stopped' });
  assert.equal(a1.scan_status, 'pending', 'a stopped scan goes back to the queue without a retry');
});

await check('PU06 daily cap of 300 scanned pages (Korean day) stops the batch', async () => {
  const today = new Date().toISOString();
  const rows = Array.from({ length: 300 }, (_, i) => channel('s' + i, 'member-a', { scan_status: 'done', scanned_at: today }));
  globalThis.partnerDb = fakeDb({ competitor_partner_consents: [{ user_id: 'member-a', notice_version: 1, collect_email: false }], competitor_partner_channels: [...rows, channel('p1', 'member-a')] });
  const route = await load('app/api/partners/extension/route.ts', routeMocks({ allowed: true, user: { id: 'member-a' } }));
  const body = await (await post(route, { op: 'next_batch' })).json();
  assert.equal(body.reason, 'daily_cap'); assert.deepEqual(body.items, []);
});

const actionMocks = {
  'next/cache': 'export const revalidatePath = () => {};',
  '@/lib/access': 'export const requireProgramAccess = async () => ({ id: "member-a" });',
  '@/lib/supabase/server': 'export const createClient = async () => globalThis.partnerDb;',
  '@/lib/apiKeys': 'export const resolveApiKey = async (_s, user, p) => { if (user !== "member-a") throw Error("foreign"); return globalThis.partnerKeys[p] ?? null; };',
  '@/lib/naver/search': 'export class NaverSearchError extends Error {}; export const searchChannels = async (...a) => { globalThis.partnerCalls.push(a); return globalThis.partnerHits; };',
  '@/lib/partners/suggest': 'export const suggestTerms = async () => ({});',
  '@/lib/partners/notice': 'export const PARTNER_NOTICE_VERSION = 1;',
};
const form = o => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };

await check('PU07 searching needs the consent and the member\'s own Naver keys; nothing is called or saved otherwise', async () => {
  const actions = await load('lib/actions/partners.ts', actionMocks);
  globalThis.partnerCalls = []; globalThis.partnerKeys = {}; globalThis.partnerHits = [];
  globalThis.partnerDb = fakeDb({ competitor_partner_consents: [], competitor_partner_channels: [] });
  assert.match((await actions.searchPartnersAction(form({ keyword: '공동구매', type_blog: 'on' }))).error, /동의/);
  globalThis.partnerDb = fakeDb({ competitor_partner_consents: [{ user_id: 'member-a', notice_version: 1 }], competitor_partner_channels: [] });
  const r = await actions.searchPartnersAction(form({ keyword: '공동구매', type_blog: 'on' }));
  assert.equal(r.needsKey, true); assert.equal(globalThis.partnerCalls.length, 0); assert.equal(globalThis.partnerDb.log.length, 0);
});

await check('PU08 only channels at or above the chosen match score are saved, all owned by the member', async () => {
  const actions = await load('lib/actions/partners.ts', actionMocks);
  globalThis.partnerCalls = []; globalThis.partnerKeys = { naver_client_id: 'own-id', naver_client_secret: 'own-secret' };
  globalThis.partnerHits = [
    { channel_type: 'blog', name: '공동구매 맘카페', url: 'u1', summary: '', category: '', address: '', texts: ['공동구매 오픈'], hit_count: 2 },
    { channel_type: 'blog', name: '여행 일기', url: 'u2', summary: '', category: '', address: '', texts: ['제주'], hit_count: 1 }];
  globalThis.partnerDb = fakeDb({ competitor_partner_consents: [{ user_id: 'member-a', notice_version: 1 }], competitor_partner_channels: [] });
  const r = await actions.searchPartnersAction(form({ keyword: '공동구매', type_blog: 'on', min_score: '40' }));
  assert.deepEqual([r.added, r.unmatched], [1, 1]);
  assert.deepEqual(globalThis.partnerCalls[0][0], { clientId: 'own-id', clientSecret: 'own-secret' });
  const saved = globalThis.partnerDb.log[0].payload;
  assert.equal(saved.length, 1); assert.equal(saved[0].user_id, 'member-a'); assert.equal(saved[0].name, '공동구매 맘카페');
});
await check('PU09 Excel file: valid ZIP with 6 parts, text cells keep leading zeros, Korean and XML-unsafe characters escaped', async () => {
  const { buildXlsx } = await load('lib/partners/xlsx.ts', {});
  const bytes = buildXlsx([['채널', '연락처', '메모'], ['광주행정사', '010-2345-6789', 'a<b & "c"\u0001'], ['우리가게', '0504-123-4567', '']], '제휴 타깃');
  const buf = Buffer.from(bytes);
  assert.equal(buf.readUInt32LE(0), 0x04034b50); assert.equal(buf.readUInt32LE(buf.length - 22), 0x06054b50);
  assert.equal(buf.readUInt16LE(buf.length - 22 + 10), 6);
  const text = buf.toString('utf8');
  assert.ok(text.includes('t="inlineStr"') && text.includes('>010-2345-6789<') && text.includes('a&lt;b &amp; &quot;c&quot;<'));
  const out = process.env.PARTNER_XLSX_OUT;
  if (out) (await import('node:fs')).writeFileSync(out, buf);
});
console.log(`# ${n} checks passed`);
