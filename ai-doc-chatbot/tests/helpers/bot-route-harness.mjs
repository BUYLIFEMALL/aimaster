// 실제 TS 경로를 기존 tsx의 컴파일러로 메모리에서 묶는다. 인증/DB/외부 AI만 가짜이며 운영 키를 읽지 않는다.
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve("tsx/package.json"))("esbuild");
const src = new URL("../../src/", import.meta.url);
export const A = "11111111-1111-4111-8111-111111111111";
export const B = "22222222-2222-4222-8222-222222222222";
export const ROOM = "33333333-3333-4333-8333-333333333333";
export const BOT = "44444444-4444-4444-8444-444444444444";
export const draft = { name: "내 요약", instructions: "사용자 글의 핵심만 정리하세요.", provider: "upstage", model: "solar-pro4", temperature: 0.6 };

export function database(seed = {}) {
  const tables = structuredClone({ dcb_bots: [], dcb_rooms: [], dcb_messages: [], dcb_documents: [], dcb_chunks: [], user_api_keys: [], ...seed });
  const fieldsOf = (text) => { let depth = 0, start = 0; const fields = []; for (let i = 0; i < text.length; i++) { if (text[i] === '(') depth++; if (text[i] === ')') depth--; if (text[i] === ',' && depth === 0) { fields.push(text.slice(start, i).trim()); start = i + 1; } } fields.push(text.slice(start).trim()); return fields; };
  const parent = (row) => tables.dcb_documents.find((doc) => doc.id === row.document_id);
  const valueAt = (row, key) => key.startsWith('dcb_documents.') ? parent(row)?.[key.split('.')[1]] : row[key];
  const db = { tables, calls: [], fail: null, rpcError: null, rpcResults: null, rpc(name, args) {
    db.calls.push({ rpc: name, args: structuredClone(args) });
    if (db.rpcError) return Promise.resolve({ data: null, error: Error('RPC 실패') });
    if (db.rpcResults) return Promise.resolve({ data: structuredClone(db.rpcResults), error: null });
    const cutoff = Date.now() - 30 * 86400000;
    const hits = tables.dcb_chunks.filter((c) => { const d = parent(c); return c.user_id === args.p_user_id && d?.user_id === args.p_user_id && d.processing_status === 'ready' && Date.parse(c.created_at) > cutoff && Date.parse(d.created_at) > cutoff && (!args.p_document_ids || args.p_document_ids.includes(d.id)); }).map((c) => ({ id: c.id, document_id: c.document_id, document_name: parent(c).name, content: c.content, similarity: c.similarity ?? 0.8 })).sort((a,b) => b.similarity-a.similarity).slice(0,args.p_count);
    return Promise.resolve({ data: hits, error: null });
  }, from(table) {
    if (!tables[table]) throw Error("예상하지 않은 표: " + table);
    const filters = [], orders = [], recordedFilters = [];
    let mode = "select", values, columns = "*", cap = Infinity, head = false, result;
    const run = () => {
      if (result) return result;
      db.calls.push({ table, mode, values: structuredClone(values), filters: structuredClone(recordedFilters), cap });
      if (db.fail?.(table, mode, values)) return result = { data: null, error: Error("비공개 DB 세부 정보"), count: null };
      const rows = tables[table];
      let found = rows.filter((r) => filters.every((filter) => filter(r)));
      if (mode === "insert") {
        found = (Array.isArray(values) ? values : [values]).map((row) => ({ id: randomUUID(), created_at: new Date().toISOString(), bot_ref: null, revision: 1, ...structuredClone(row) }));
        rows.push(...found);
      } else if (mode === "update") for (const row of found) Object.assign(row, structuredClone(values));
      else if (mode === "delete") for (const row of found) rows.splice(rows.indexOf(row), 1);
      for (const [key, ascending] of [...orders].reverse()) found = [...found].sort((a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0) * (ascending ? 1 : -1));
      const count = found.length;
      const fields = fieldsOf(columns);
      const data = head ? null : found.slice(0, cap).map((row) => structuredClone(columns === "*" ? row : Object.fromEntries(fields.map((key) => key.startsWith('dcb_documents') ? ['dcb_documents', parent(row)] : [key.trim(), row[key.trim()]]))));
      return result = { data, count, error: null };
    };
    const query = {
      select(value, options = {}) { columns = value; head = options.head === true; return query; },
      insert(value) { mode = "insert"; values = value; return query; },
      update(value) { mode = "update"; values = value; return query; },
      delete() { mode = "delete"; return query; },
      eq(key, value) { recordedFilters.push(['eq',key,value]); filters.push((row) => valueAt(row,key) === value); return query; },
      gt(key, value) { recordedFilters.push(['gt',key,value]); filters.push((row) => valueAt(row,key) > value); return query; },
      in(key, list) { recordedFilters.push(['in',key,list]); filters.push((row) => list.includes(valueAt(row,key))); return query; },
      or(value) { recordedFilters.push(['or',value]); const words=value.split(',').map((clause) => clause.replace(/^content\.ilike\.%/,'').replace(/%$/,'')); filters.push((row) => words.some((word) => row.content.toLowerCase().includes(word.toLowerCase()))); return query; },
      order(key, options = {}) { orders.push([key, options.ascending !== false]); return query; },
      limit(value) { cap = value; return query; },
      maybeSingle() { const r = run(); return Promise.resolve({ ...r, data: r.data?.[0] ?? null }); },
      single() { const r = run(); return Promise.resolve({ ...r, data: r.data?.[0] ?? null, error: r.error || (!r.data?.length ? Error("없음") : null) }); },
      then(resolve, reject) { return Promise.resolve(run()).then(resolve, reject); },
    };
    return query;
  } };
  return db;
}
const mocks = {
  "server-only": "",
  "next/server": "export const NextResponse={json:(value,init)=>Response.json(value,init)};",
  "@/lib/chat/apiGuard": "export async function authorize(){const c=globalThis.__dcbBotTest;return c.authorized ? {ok:true,auth:{user:{id:c.userId}}}:{ok:false,response:Response.json({error:'로그인 필요'},{status:401})}}; export async function requireOwnKey(userId,provider){const key=globalThis.__dcbBotTest.keys[userId]?.[provider]; return key?{ok:true,apiKey:key}:{ok:false,response:Response.json({error:'본인 키 필요',needApiKey:true},{status:400})}};",
  "@/lib/supabase/admin": "export function createAdminClient(){return globalThis.__dcbBotTest.db}",
  "@/lib/apiKeys": "export async function getUserApiKey(userId,provider){return globalThis.__dcbBotTest.keys[userId]?.[provider]??null}",
  "@/lib/chat/upstage": "export const ROUTER_MODEL='solar-mini4';export async function chatOnce(...args){globalThis.__dcbBotTest.ai.push({kind:'router',args});return JSON.stringify({web:false})};export async function chatStream(key,messages,onDelta,signal,temperature){globalThis.__dcbBotTest.ai.push({kind:'upstage',key,messages,temperature});onDelta('시험 답변');return '시험 답변'};export async function embed(key,texts,mode){const c=globalThis.__dcbBotTest;c.embeddings.push({key,texts,mode});return texts.map(()=>[1,...Array(1023).fill(0)])};export class NeedsAsyncParseError extends Error{};export async function parseDocument(){return globalThis.__dcbBotTest.parsedText??'정상 본문'};export async function submitAsyncParse(){return 'mock-request-id'};",
  "@/lib/compatibleChat/transport": "export async function compatibleChat(options){globalThis.__dcbBotTest.ai.push({kind:'compatible',...options});options.onDelta?.('새 공급자 답변');return {text:options.onDelta?'새 공급자 답변':JSON.stringify({web:false}),model:'actual-server-model'}};",
  "@/lib/chat/tavily": "export async function webSearch(){throw Error('웹 검색을 끈 시험에서 외부 검색 금지')}",
};
export async function route(relative) {
  const result = await build({ entryPoints: [fileURLToPath(new URL(relative, src))], bundle: true, write: false, platform: "node", format: "esm", logLevel: "silent", plugins: [{ name: "bot-test-boundaries", setup(builder) {
    builder.onResolve({ filter: /^\.\/upstage$/ }, (args) => args.importer.endsWith('ingest.ts') ? { path: '@/lib/chat/upstage', namespace: 'bot-test' } : null);
    builder.onResolve({ filter: /^(next\/server|server-only|@\/)/ }, (args) => args.path in mocks ? { path: args.path, namespace: "bot-test" } : { path: fileURLToPath(new URL(args.path.slice(2) + ".ts", src)) });
    builder.onLoad({ filter: /.*/, namespace: "bot-test" }, (args) => ({ contents: mocks[args.path], loader: "js" }));
  } }] });
  return import("data:text/javascript;base64," + Buffer.from(result.outputFiles[0].text).toString("base64"));
}
export function context(seed = {}) {
  const value = { authorized: true, userId: A, keys: { [A]: { upstage: "A-own-key" }, [B]: { upstage: "B-own-key" } }, db: database(seed), ai: [], embeddings: [] };
  globalThis.__dcbBotTest = value;
  return value;
}
export const request = (method, body, path = "/api/chat") => new Request("http://local.test" + path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
