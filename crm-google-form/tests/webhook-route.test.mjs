// CRM18-06 U1 — 실제 웹훅 라우트(app/api/webhooks/form-submit/[token]/route.ts)를 가짜 DB·가짜 발송으로 실행하는 시험.
// 실행: node --test crm-google-form/tests/webhook-route.test.mjs   (새 패키지 0, 실DB·실발송·네트워크 0)
// 이미 설치된 typescript로 .ts를 바꾸고, DB(@/lib/supabase/admin)·발송(@/lib/crm/dispatch)·next/server만 가짜로 갈아 끼운다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const PROJECT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HOOKS = [
  `import { createRequire } from "node:module";`,
  `import { existsSync, readFileSync } from "node:fs";`,
  `import { pathToFileURL, fileURLToPath } from "node:url";`,
  `const ROOT = ${JSON.stringify(PROJECT.replace(/\\/g, "/"))};`,
  `const req = createRequire(pathToFileURL(ROOT + "/package.json"));`,
  `const ts = req("typescript");`,
  `const FAKES = ${JSON.stringify({
    "@/lib/supabase/admin": "export function createAdminClient(){ return globalThis.__whFake.client(); }",
    "@/lib/crm/dispatch": "export async function dispatchSubmissionNotifications(source, submission){ globalThis.__whDispatched.push(submission.id); return { status: 'notified' }; }",
    "next/server": "export const NextResponse = { json(body, init) { return { status: (init && init.status) || 200, body }; } }; export class NextRequest {}",
    "server-only": "export {};",
  })};`,
  `export async function resolve(spec, ctx, next) {`,
  `  if (ctx.parentURL && ctx.parentURL.startsWith("whfake:")) return next(spec, { ...ctx, parentURL: pathToFileURL(ROOT + "/package.json").href });`,
  `  if (spec in FAKES) return { url: "whfake:///" + encodeURIComponent(spec), shortCircuit: true };`,
  `  if (spec.startsWith("@/")) {`,
  `    const base = ROOT + "/" + spec.slice(2);`,
  `    for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx"]) if (existsSync(base + ext)) return { url: pathToFileURL(base + ext).href, shortCircuit: true };`,
  `  }`,
  `  return next(spec, ctx);`,
  `}`,
  `export async function load(url, ctx, next) {`,
  `  if (url.startsWith("whfake:")) return { format: "module", source: FAKES[decodeURIComponent(url.slice(10))], shortCircuit: true };`,
  `  const clean = url.split("?")[0];`,
  `  if (clean.startsWith("file:") && clean.endsWith(".ts") && !clean.includes("/node_modules/")) {`,
  `    const file = fileURLToPath(clean);`,
  `    const out = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, isolatedModules: true }, fileName: file });`,
  `    return { format: "module", source: out.outputText, shortCircuit: true };`,
  `  }`,
  `  return next(url, ctx);`,
  `}`,
].join("\n");
register("data:text/javascript," + encodeURIComponent(HOOKS));

const OWNER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const SRC1 = "aaaaaaaa-1111-4111-8111-000000000001";
const SRC2 = "aaaaaaaa-2222-4222-8222-000000000002";
const FILE = "1AbCdEfGhIjKlMnOpQrStUvWxYz_0123456789-ab";
const DUP_MSG = 'duplicate key value violates unique constraint "crm_submissions_dedupe_uq"';

/** 가짜 Supabase 질의 빌더: 표·연산을 기록하고, 응답은 db.answer(q)가 정한다. */
function fakeClient(answer) {
  return {
    from(table) {
      const q = { table, ops: [] };
      const b = new Proxy({}, {
        get(_, k) {
          if (k === "then") return (res, rej) => { try { return Promise.resolve(answer(q)).then(res, rej); } catch (e) { return Promise.reject(e).then(res, rej); } };
          if (k === "single" || k === "maybeSingle") return () => { try { return Promise.resolve(answer({ ...q, single: k })); } catch (e) { return Promise.reject(e); } };
          return (...args) => { q.ops.push([k, ...args]); return b; };
        },
      });
      return b;
    },
  };
}

/** 실제 DB처럼 동작하는 작은 가짜: 폼 연결 표 + 접수 표(부분 유니크 user_id·form_source_id·dedupe_key) */
function makeDb(opts = {}) {
  const sources = opts.sources ?? [
    { id: SRC1, user_id: OWNER, webhook_token: "tok-1", is_active: true, name: "폼1", field_mapping: { name: "이름", phone: "연락처" } },
    { id: SRC2, user_id: OWNER, webhook_token: "tok-2", is_active: true, name: "폼2", field_mapping: {} },
  ];
  const rows = [];
  const hooks = opts.hooks ?? {};
  const eqs = (q) => q.ops.filter((o) => o[0] === "eq");
  const matches = (obj, q) => eqs(q).every((o) => obj[o[1]] === o[2]);
  const db = {
    rows,
    answer(q) {
      if (hooks.before) { const r = hooks.before(q, db); if (r !== undefined) return r; }
      const ins = q.ops.find((o) => o[0] === "insert");
      const upd = q.ops.find((o) => o[0] === "update");
      if (q.table === "crm_form_sources") return { data: sources.find((x) => matches(x, q)) ?? null, error: null };
      if (q.table === "crm_submissions" && ins) {
        const v = ins[1];
        if (v.dedupe_key != null && rows.some((r) => r.user_id === v.user_id && r.form_source_id === v.form_source_id && r.dedupe_key === v.dedupe_key)) {
          return { data: null, error: { code: "23505", message: DUP_MSG } };
        }
        const row = { id: "row-" + (rows.length + 1), status: "received", dedupe_key: null, ...v };
        rows.push(row);
        if (hooks.afterInsert) { const r = hooks.afterInsert(row); if (r !== undefined) return r; }
        return { data: { id: row.id, user_id: row.user_id, name: row.name, phone: row.phone, email: row.email, raw_values: row.raw_values }, error: null };
      }
      if (q.table === "crm_submissions" && upd) {
        for (const r of rows) if (matches(r, q)) Object.assign(r, upd[1]);
        return { data: null, error: null };
      }
      if (q.table === "crm_submissions" && q.single) {
        const hit = rows.filter((r) => matches(r, q));
        if (hit.length > 1) return { data: null, error: { code: "PGRST116", message: "multiple" } };
        return { data: hit[0] ? { id: hit[0].id } : null, error: null };
      }
      return { data: null, error: null };
    },
  };
  globalThis.__whFake = { client: () => fakeClient((q) => db.answer(q)) };
  globalThis.__whDispatched = [];
  return db;
}

const routeMod = () => import(pathToFileURL(join(PROJECT, "app/api/webhooks/form-submit/[token]/route.ts")).href);
async function post(token, body) {
  const raw = typeof body === "string" ? body : JSON.stringify(body);
  const req = { text: async () => raw, json: async () => JSON.parse(raw) };
  return (await routeMod()).POST(req, { params: { token } });
}
const v2 = (row = 5, extra = {}) => ({ v: 2, kind: "sheet", eventKey: `${FILE}:0:${row}:1794969285544`, values: { 이름: ["홍길동"], 연락처: ["010-1111-2222"] }, ...extra });
const SECRETS = /tok-1|tok-2|010-1111-2222|홍길동|crm_submissions_dedupe_uq|duplicate key/;

test("legacy 본문: 지금처럼 저장(키 없음)·발송 1번·notified, 같은 본문 두 번이면 보호 없음(2행·2번)", async () => {
  const db = makeDb();
  const legacy = { responseId: "0f8fad5b-d9cb-469f-a165-70867728950e", values: { 이름: ["홍길동"] } };
  const r1 = await post("tok-1", legacy);
  assert.equal(r1.status, 200);
  assert.equal(r1.body.status, "notified");
  assert.equal("dedupe_key" in db.rows[0] && db.rows[0].dedupe_key !== null, false);
  assert.equal(Object.prototype.hasOwnProperty.call(db.rows[0], "dedupe_key") ? db.rows[0].dedupe_key : null, null);
  await post("tok-1", legacy);
  assert.equal(db.rows.length, 2);
  assert.equal(globalThis.__whDispatched.length, 2);
});

test("legacy insert 값에는 dedupe_key 칸 자체가 없다(DDL 전 운영 스키마 호환)", async () => {
  let insertValue = null;
  makeDb({ hooks: { before: (q) => { const i = q.ops.find((o) => o[0] === "insert"); if (i) insertValue = i[1]; } } });
  await post("tok-1", { values: {} });
  assert.ok(insertValue && !("dedupe_key" in insertValue));
});

test("v2 순차 두 번: 1행·발송 1번, 두 번째는 200 duplicate·발송 0", async () => {
  const db = makeDb();
  const r1 = await post("tok-1", v2());
  const r2 = await post("tok-1", v2());
  assert.equal(r1.status, 200);
  assert.equal(r1.body.status, "notified");
  assert.deepEqual([r2.status, r2.body.duplicate], [200, true]);
  assert.equal(db.rows.length, 1);
  assert.equal(db.rows[0].dedupe_key, `v2:sheet:${FILE}:0:5:1794969285544`);
  assert.equal(db.rows[0].user_id, OWNER);
  assert.deepEqual(globalThis.__whDispatched, ["row-1"]);
});

test("v2 동시 두 번: 1행·발송 1번", async () => {
  const db = makeDb();
  const [a, b] = await Promise.all([post("tok-1", v2()), post("tok-1", v2())]);
  assert.deepEqual([a.status, b.status], [200, 200]);
  assert.equal([a.body.duplicate, b.body.duplicate].filter(Boolean).length, 1);
  assert.equal(db.rows.length, 1);
  assert.equal(globalThis.__whDispatched.length, 1);
});

test("v2 같은 키·다른 폼(같은 회원) → 각각 1번, 다른 행(같은 폼) → 각각 1번", async () => {
  const db = makeDb();
  await post("tok-1", v2(5));
  await post("tok-2", v2(5));
  await post("tok-1", v2(6));
  assert.equal(db.rows.length, 3);
  assert.equal(globalThis.__whDispatched.length, 3);
});

test("다른 유니크 위반 23505(중복 키 행 없음) → duplicate로 오인하지 않고 500·발송 0·원문 노출 0", async () => {
  makeDb({ hooks: { before: (q) => (q.ops.some((o) => o[0] === "insert") ? { data: null, error: { code: "23505", message: 'duplicate key value violates unique constraint "some_other_uq"' } } : undefined) } });
  const r = await post("tok-1", v2());
  assert.equal(r.status, 500);
  assert.notEqual(r.body.duplicate, true);
  assert.doesNotMatch(JSON.stringify(r.body), /some_other_uq|duplicate key/);
  assert.deepEqual(globalThis.__whDispatched, []);
});

test("23505 뒤 중복 확인 조회 실패·예외·이상한 응답 → 500·발송 0", async () => {
  for (const bad of [
    () => ({ data: null, error: { message: "read failed" } }),
    () => { throw new Error("read threw"); },
    () => ({ data: [{ id: "x" }], error: null }),
    () => ({ data: { id: 123 }, error: null }),
  ]) {
    const db = makeDb({ hooks: { before: (q) => (q.single === "maybeSingle" && q.table === "crm_submissions" ? bad() : undefined) } });
    await post("tok-1", v2()); // 첫 번째 정상 저장(확인 조회 안 함)
    globalThis.__whDispatched = [];
    const r = await post("tok-1", v2());
    assert.equal(r.status, 500, String(bad));
    assert.deepEqual(globalThis.__whDispatched, []);
    assert.equal(db.rows.length, 1);
  }
});

test("insert 응답 유실(실제로는 저장됨) → 500·발송 0, 같은 본문 재요청은 duplicate·발송 0(재발송 0)", async () => {
  let lose = true;
  const db = makeDb({ hooks: { afterInsert: () => { if (lose) { lose = false; throw new Error("socket hang up"); } } } });
  const r1 = await post("tok-1", v2());
  assert.equal(r1.status, 500);
  assert.equal(db.rows.length, 1); // DB에는 들어감(상태 received로 남음)
  const r2 = await post("tok-1", v2());
  assert.deepEqual([r2.status, r2.body.duplicate], [200, true]);
  assert.deepEqual(globalThis.__whDispatched, []);
});

test("크기·형식: 64KiB 초과 413, 깨진 JSON 400, v2 형식 오류 400, 배열 본문 400 — 저장·발송 0", async () => {
  const db = makeDb();
  const big = JSON.stringify({ values: { q: ["가".repeat(30000)] } });
  assert.equal((await post("tok-1", big)).status, 413);
  assert.equal((await post("tok-1", "{not json")).status, 400);
  assert.equal((await post("tok-1", v2(5, { eventKey: "bad key" }))).status, 400);
  assert.equal((await post("tok-1", v2(5, { v: "2" }))).status, 400);
  assert.equal((await post("tok-1", [1, 2])).status, 400);
  assert.equal(db.rows.length, 0);
  assert.deepEqual(globalThis.__whDispatched, []);
});

test("토큰 경계: 없는 토큰 404, 꺼진 폼 404, 폼 조회 실패는 404가 아닌 500 — 발송 0", async () => {
  makeDb({ sources: [{ id: SRC1, user_id: OWNER, webhook_token: "tok-off", is_active: false, name: "x", field_mapping: {} }] });
  assert.equal((await post("tok-none", v2())).status, 404);
  assert.equal((await post("tok-off", v2())).status, 404);
  makeDb({ hooks: { before: (q) => (q.table === "crm_form_sources" ? { data: null, error: { message: "db down" } } : undefined) } });
  const r = await post("tok-1", v2());
  assert.equal(r.status, 500);
  assert.deepEqual(globalThis.__whDispatched, []);
});

test("회원 경계: 본문에 다른 회원·폼 id를 넣어도 토큰의 폼·회원으로만 저장", async () => {
  const db = makeDb();
  await post("tok-1", v2(5, { user_id: OTHER, form_source_id: SRC2, values: { 이름: ["a"] } }));
  assert.equal(db.rows[0].user_id, OWNER);
  assert.equal(db.rows[0].form_source_id, SRC1);
});

test("오류 응답 본문에 토큰·본문 값·DB 원문이 없다", async () => {
  makeDb({ hooks: { before: (q) => (q.ops.some((o) => o[0] === "insert") ? { data: null, error: { code: "XX000", message: "boom 010-1111-2222" } } : undefined) } });
  const r = await post("tok-1", v2());
  assert.equal(r.status, 500);
  assert.doesNotMatch(JSON.stringify(r.body), SECRETS);
});
