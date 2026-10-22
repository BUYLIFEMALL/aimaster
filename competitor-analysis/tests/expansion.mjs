// 2026-10-23 병합 A: 「🌱 키워드 확장」 서버 액션을 실제 코드로 실행하고 외부 호출(SerpApi·OpenAI·텔레그램)만 가짜로 바꾼다.
// 네트워크·API 키·운영 DB 쓰기 없음.
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const mocks = {
  'next/cache': 'export const revalidatePath = () => {};',
  '@/lib/access': 'export const requireProgramAccess = async () => ({id:"member-a"}); export const logProgramUsage=async(e)=>{globalThis.fx.logs.push(e)};',
  '@/lib/supabase/server': 'export const createClient = async () => globalThis.fx.client;',
  '@/lib/apiKeys': 'export const resolveApiKey = async (_, user, provider) => { if(user!=="member-a") throw Error("foreign key"); return globalThis.fx.missingKey === provider ? null : "own-"+provider; };',
  '@/lib/serp/context': 'export const fetchSerpContext=async(engine,kw,key)=>{globalThis.fx.paid.push("serp:"+key);return {searchId:"s",contextText:"ctx"}};',
  '@/lib/ai/expansion': 'export const extractRelatedKeywords=async(k,c,key)=>{globalThis.fx.paid.push("openai:"+key);return [{keyword:"연관A",relevance_score:0.9}]}; export const extractLongtailExpansions=async(k,r,key)=>{globalThis.fx.paid.push("openai:"+key);return [{original_keyword:"연관A",longtail_keywords:["롱테일1"]}]}; export const generateWorkMessage=async(k,r,l,key)=>{globalThis.fx.paid.push("openai:"+key);return "지시문"};',
  '@/lib/telegram/client': 'export const sendTelegramMessage=async(m)=>{globalThis.fx.telegram.push(m)};',
  'server-only': 'export {};',
};
const output = await build({ entryPoints: ['lib/actions/expansion.ts'], bundle: true, write: false, format: 'esm', platform: 'node',
  plugins: [{ name: 'mocks', setup(b) {
    b.onResolve({ filter: /.*/ }, a => mocks[a.path] ? { path: a.path, namespace: 'mock' } : undefined);
    b.onLoad({ filter: /.*/, namespace: 'mock' }, a => ({ contents: mocks[a.path], loader: 'js' }));
  } }] });
const { runKeywordExpansionAction } = await import('data:text/javascript;base64,' + Buffer.from(output.outputFiles[0].text).toString('base64'));

function query(state, table) {
  const q = { table, filters: [], op: 'select', payload: null };
  const rows = () => (state.rows[table] ?? []).filter(r => q.filters.every(([k, v, kind]) => kind === 'in' ? v.includes(r[k]) : r[k] === v));
  const api = {
    select() { return api; },
    eq(k, v) { q.filters.push([k, v]); return api; },
    in(k, v) { q.filters.push([k, v, 'in']); return api; },
    maybeSingle: async () => ({ data: rows()[0] ?? null }),
    single: async () => ({ data: q.op === 'insert' ? { id: 'run-1' } : rows()[0], error: null }),
    upsert(p) { q.op = 'upsert'; state.writes.push({ table, payload: p }); return { select: async () => ({ data: p.map((x, i) => ({ id: table + i, keyword: x.keyword })), error: null }), then: r => r({ error: null }) }; },
    insert(p) { q.op = 'insert'; state.writes.push({ table, payload: p }); return api; },
    then(r) { r({ data: rows(), error: null }); },
  };
  return api;
}
function fixture(extra = {}) {
  const fx = { paid: [], writes: [], logs: [], telegram: [], missingKey: null, rows: {
    longtail_seed_keywords: [{ id: 'seed-a', user_id: 'member-a', keyword: '씨드', engine: 'naver' }],
    user_telegram_links: [
      { user_id: 'member-a', program_slug: 'longtail-keyword-expander', bot_token: 'legacy-bot', chat_id: '1' },
      { user_id: 'member-b', program_slug: 'competitor-analysis', bot_token: 'foreign-bot', chat_id: '2' },
    ] }, ...extra };
  fx.client = { from: t => query(fx, t) };
  globalThis.fx = fx;
  return fx;
}
const ok = n => console.log('PASS', n);

{ const fx = fixture(); const before = Date.now();
  const r = await runKeywordExpansionAction('seed-a');
  assert.equal(r.runId, 'run-1');
  assert.deepEqual(fx.paid, ['serp:own-serpapi', 'openai:own-openai', 'openai:own-openai', 'openai:own-openai']);
  ok('본인 SerpApi 1회 + 본인 OpenAI 3회만 사용');
  const rel = fx.writes.find(w => w.table === 'longtail_related_keywords').payload[0];
  const exp = fx.writes.find(w => w.table === 'longtail_expansions').payload[0];
  for (const row of [rel, exp]) { assert.equal(row.user_id, 'member-a'); assert.ok(Date.parse(row.created_at) >= before); }
  ok('다시 만든 연관·롱테일 키워드는 본인 소유 + 생성일을 오늘로 갱신(30일 보관 새로 시작)');
  assert.equal(fx.telegram.length, 1); assert.equal(fx.telegram[0].botToken, 'legacy-bot');
  ok('롱테일에서 연결한 본인 텔레그램 봇으로 알림(다른 회원 봇 사용 안 함)'); }

{ const fx = fixture(); fx.rows.user_telegram_links.push({ user_id: 'member-a', program_slug: 'competitor-analysis', bot_token: 'new-bot', chat_id: '3' });
  await runKeywordExpansionAction('seed-a');
  assert.equal(fx.telegram[0].botToken, 'new-bot');
  ok('이 앱에서 새로 연결한 봇이 있으면 그 봇을 우선 사용'); }

for (const provider of ['serpapi', 'openai']) {
  const fx = fixture({ missingKey: provider });
  const r = await runKeywordExpansionAction('seed-a');
  assert.equal(r.needsApiKey, provider); assert.equal(fx.paid.length, 0); assert.equal(fx.writes.length, 0);
  ok(`${provider} 키가 없으면 유료 호출·저장 없이 등록 안내`);
}

{ const fx = fixture(); const r = await runKeywordExpansionAction('seed-of-other-member');
  assert.equal(r.error, '키워드를 찾을 수 없습니다.'); assert.equal(fx.paid.length, 0);
  ok('다른 회원 씨드 키워드는 실행 불가'); }
console.log('키워드 확장 시험 모두 통과');
