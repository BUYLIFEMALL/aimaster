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
    "@/lib/supabase/admin": "export function createAdminClient(){ if (globalThis.__whAdminThrow) throw new Error(globalThis.__whAdminThrow); return globalThis.__whFake.client(); }",
    "@/lib/crm/dispatch": "export async function dispatchSubmissionNotifications(source, submission){ globalThis.__whDispatched.push(submission.id); if (globalThis.__whDispatchThrow) throw new Error('dispatch blew up 010-1111-2222'); return globalThis.__whDispatchResult || { status: 'notified', errorMessage: null, channels: [] }; }",
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
        const row = { id: "00000000-0000-4000-8000-" + String(rows.length + 1).padStart(12, "0"), status: "received", dedupe_key: null, ...v };
        rows.push(row);
        if (hooks.afterInsert) { const r = hooks.afterInsert(row); if (r !== undefined) return r; }
        return { data: { id: row.id, user_id: row.user_id, name: row.name, phone: row.phone, email: row.email, raw_values: row.raw_values }, error: null };
      }
      if (q.table === "crm_submissions" && upd) {
        db.updates = (db.updates ?? []).concat([q]);
        if (hooks.onUpdate) { const r = hooks.onUpdate(q, rows, matches); if (r !== undefined) return r; }
        const hit = rows.filter((r) => matches(r, q));
        for (const r of hit) Object.assign(r, upd[1]);
        // 실제 PostgREST처럼 .select()가 붙으면 갱신된 행을 돌려준다
        return { data: q.ops.some((o) => o[0] === "select") ? hit.map((r) => ({ id: r.id })) : null, error: null };
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
  globalThis.__whAdminThrow = null;
  globalThis.__whDispatchThrow = false;
  globalThis.__whDispatchResult = null;
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
  assert.deepEqual(globalThis.__whDispatched, ["00000000-0000-4000-8000-000000000001"]);
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


// ── U1 보완(Mac msg_24a60c98c1f9) ────────────────────────────────────────────────────────────
test("중복 확인: 기존 행 id가 UUID가 아니면(빈 값·공백·not-a-uuid·UUID 비슷한 문자열) duplicate 아님 → 500·발송 0", async () => {
  for (const id of ["", " ", "not-a-uuid", "00000000-0000-4000-8000-00000000000Z", " 00000000-0000-4000-8000-000000000001"]) {
    makeDb({ hooks: { before: (q) => {
      if (q.ops.some((o) => o[0] === "insert")) return { data: null, error: { code: "23505", message: DUP_MSG } };
      if (q.single === "maybeSingle" && q.table === "crm_submissions") return { data: { id }, error: null };
      return undefined;
    } } });
    const r = await post("tok-1", v2());
    assert.equal(r.status, 500, JSON.stringify(id));
    assert.notEqual(r.body.duplicate, true);
    assert.deepEqual(globalThis.__whDispatched, []);
  }
});

test("중복 확인: 정상 UUID 기존 행이면 duplicate(회귀)", async () => {
  makeDb({ hooks: { before: (q) => {
    if (q.ops.some((o) => o[0] === "insert")) return { data: null, error: { code: "23505", message: DUP_MSG } };
    if (q.single === "maybeSingle" && q.table === "crm_submissions") return { data: { id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301" }, error: null };
    return undefined;
  } } });
  const r = await post("tok-1", v2());
  assert.deepEqual([r.status, r.body.duplicate], [200, true]);
});

test("폼 연결 조회가 예외를 던지면 같은 고정 500·발송 0·원문/토큰/본문 노출 0(밖으로 던지지 않음)", async () => {
  makeDb({ hooks: { before: (q) => { if (q.table === "crm_form_sources") throw new Error("fetch failed tok-1 010-1111-2222 secret-detail"); return undefined; } } });
  const r = await post("tok-1", v2());
  assert.equal(r.status, 500);
  assert.equal(r.body.error, "폼 연결을 확인하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  assert.doesNotMatch(JSON.stringify(r.body), /secret-detail|tok-1|010-1111-2222/);
  assert.deepEqual(globalThis.__whDispatched, []);
});

test("관리자 DB 클라이언트 생성 예외(설정 누락 등)도 고정 500·원문 노출 0", async () => {
  makeDb();
  globalThis.__whAdminThrow = "Missing SUPABASE_SECRET_KEY secret-env";
  const r = await post("tok-1", v2());
  assert.equal(r.status, 500);
  assert.doesNotMatch(JSON.stringify(r.body), /secret-env|SUPABASE/);
  assert.deepEqual(globalThis.__whDispatched, []);
});

test("폼 연결 회귀: 정상 200 / 없음 404 / 꺼짐 404 / 조회 오류 500 / 조회 예외 500", async () => {
  makeDb();
  assert.equal((await post("tok-1", v2())).status, 200);
  assert.equal((await post("tok-none", v2())).status, 404);
  makeDb({ sources: [{ id: SRC1, user_id: OWNER, webhook_token: "tok-off", is_active: false, name: "x", field_mapping: {} }] });
  assert.equal((await post("tok-off", v2())).status, 404);
  makeDb({ hooks: { before: (q) => (q.table === "crm_form_sources" ? { data: null, error: { message: "x" } } : undefined) } });
  assert.equal((await post("tok-1", v2())).status, 500);
  makeDb({ hooks: { before: (q) => { if (q.table === "crm_form_sources") throw new Error("x"); return undefined; } } });
  assert.equal((await post("tok-1", v2())).status, 500);
});


// ── CRM U2: 상태 전이(가짜 발송 결과로 라우트 동작만) ──────────────────────────────────────────
test("U2: 구버전·v2 모두 「발송 처리 중」으로 먼저 저장하고, 발송 결과로 최종 상태 기록", async () => {
  let inserted = [];
  const db = makeDb({ hooks: { before: (q) => { const i = q.ops.find((o) => o[0] === "insert"); if (i) inserted.push(i[1].status); return undefined; } } });
  globalThis.__whDispatchResult = { status: "unknown", errorMessage: "문자: 결과 모름", channels: [] };
  const r = await post("tok-1", v2());
  await post("tok-1", { values: {} });
  assert.deepEqual(inserted, ["dispatching", "dispatching"]);
  assert.deepEqual([r.status, r.body.status, r.body.recorded], [200, "unknown", true]);
  assert.equal(db.rows[0].status, "unknown");
  assert.equal(db.rows[0].error_message, "문자: 결과 모름");
});

test("U2: 최종 상태 기록은 id·회원·폼 조건으로만", async () => {
  const db = makeDb();
  await post("tok-1", v2());
  const eqs = db.updates[0].ops.filter((o) => o[0] === "eq").map((o) => o[1]).sort();
  assert.deepEqual(eqs, ["form_source_id", "id", "user_id"]);
});

test("U2: 최종 기록 오류·예외(반영 전) → recorded false, 행은 「발송 처리 중」, 재발송 0", async () => {
  for (const onUpdate of [() => ({ data: null, error: { message: "x" } }), () => { throw new Error("x"); }]) {
    const db = makeDb({ hooks: { onUpdate } });
    const r = await post("tok-1", v2());
    assert.equal(r.status, 200);
    assert.equal(r.body.recorded, false);
    assert.equal(db.rows[0].status, "dispatching");
    const again = await post("tok-1", v2());
    assert.equal(again.body.duplicate, true);
    assert.equal(globalThis.__whDispatched.length, 1);
  }
});

test("U2: 발송 중 예외 → 「결과 모름」 기록 시도·고정 500·원문 0, 기록도 실패하면 「발송 처리 중」 잔류", async () => {
  let db = makeDb();
  globalThis.__whDispatchThrow = true;
  let r = await post("tok-1", v2());
  assert.equal(r.status, 500);
  assert.doesNotMatch(JSON.stringify(r.body), /blew up|010-1111-2222/);
  assert.equal(db.rows[0].status, "unknown");
  db = makeDb({ hooks: { onUpdate: () => ({ data: null, error: { message: "x" } }) } });
  globalThis.__whDispatchThrow = true;
  r = await post("tok-1", v2());
  assert.equal(r.status, 500);
  assert.equal(db.rows[0].status, "dispatching");
});

test("U2: insert 응답 유실 → 행은 「발송 처리 중」 그대로, 재요청은 duplicate·발송 0", async () => {
  let lose = true;
  const db = makeDb({ hooks: { afterInsert: () => { if (lose) { lose = false; throw new Error("socket hang up"); } } } });
  await post("tok-1", v2());
  assert.equal(db.rows[0].status, "dispatching");
  const r2 = await post("tok-1", v2());
  assert.equal(r2.body.duplicate, true);
  assert.deepEqual(globalThis.__whDispatched, []);
});


// ── recordFinal 보완(Mac msg_e752306f1e50): 반환 행으로 기록 확인, 불확실은 「잔류」로 단정하지 않음 ──────────
const rfCase = async (onUpdate) => {
  const db = makeDb({ hooks: { onUpdate } });
  const r = await post("tok-1", v2());
  return { db, r };
};
test("recordFinal: 정상 1행·id 일치 → recorded true", async () => {
  const { db, r } = await rfCase();
  assert.deepEqual([r.body.recorded, r.body.recordState], [true, undefined]);
  assert.equal(db.rows[0].status, "notified");
});
test("recordFinal: 0행 갱신(오류 없음) → recorded false·not_recorded, 행 그대로", async () => {
  const { db, r } = await rfCase(() => ({ data: [], error: null }));
  assert.deepEqual([r.body.recorded, r.body.recordState], [false, "not_recorded"]);
  assert.equal(db.rows[0].status, "dispatching");
});
test("recordFinal: error null + data null(select 무시된 응답) → recorded false·uncertain", async () => {
  const { r } = await rfCase(() => ({ data: null, error: null }));
  assert.deepEqual([r.body.recorded, r.body.recordState], [false, "uncertain"]);
});
test("recordFinal: 다른 id·여러 행 → recorded false·uncertain", async () => {
  for (const data of [[{ id: "00000000-0000-4000-8000-0000000000ff" }], [{ id: "a" }, { id: "b" }], [{}]]) {
    const { r } = await rfCase(() => ({ data, error: null }));
    assert.deepEqual([r.body.recorded, r.body.recordState], [false, "uncertain"], JSON.stringify(data));
  }
});
test("recordFinal: DB 오류 응답도 미반영 확정이 아님 → uncertain, 반영 뒤 응답 유실(예외) → uncertain이고 실제 행은 최종 상태일 수 있음", async () => {
  let { db, r } = await rfCase(() => ({ data: null, error: { message: "boom" } }));
  assert.deepEqual([r.body.recorded, r.body.recordState], [false, "uncertain"]);
  assert.equal(db.rows[0].status, "dispatching");
  ({ db, r } = await rfCase((q, rows, matches) => { for (const x of rows) if (matches(x, q)) Object.assign(x, q.ops.find((o) => o[0] === "update")[1]); throw new Error("socket hang up"); }));
  assert.deepEqual([r.body.recorded, r.body.recordState], [false, "uncertain"]);
  assert.equal(db.rows[0].status, "notified"); // 응답은 「발송 처리 중」이라 단정하지 않음
  assert.notEqual(r.body.status, "dispatching");
  assert.equal(globalThis.__whDispatched.length, 1);
});
test("recordFinal: 갱신은 id·회원·폼 조건 + select(id)로만, 다른 회원 행은 갱신되지 않음", async () => {
  const db = makeDb();
  db.rows.push({ id: "00000000-0000-4000-8000-0000000000aa", user_id: OTHER, form_source_id: SRC1, status: "dispatching", dedupe_key: null });
  await post("tok-1", v2());
  const q = db.updates[0];
  assert.deepEqual(q.ops.filter((o) => o[0] === "eq").map((o) => o[1]).sort(), ["form_source_id", "id", "user_id"]);
  assert.ok(q.ops.some((o) => o[0] === "select" && o[1] === "id"));
  assert.equal(db.rows.find((x) => x.user_id === OTHER).status, "dispatching");
});
test("recordFinal: 응답 본문은 고정 형식(원문 0)", async () => {
  const { r } = await rfCase(() => { throw new Error("secret-detail 010-1111-2222"); });
  assert.doesNotMatch(JSON.stringify(r.body), /secret-detail|010-1111-2222/);
});


// ── 실제 설치된 supabase-js(PostgREST 클라이언트) + 시험용 fetch 옵션(전역 교체 0) ─────────────────────────
import { createRequire as __cr } from "node:module";
const { createClient: realCreateClient } = __cr(join(PROJECT, "package.json"))("@supabase/supabase-js");
const SOURCE_ROW = { id: SRC1, user_id: OWNER, name: "폼1", field_mapping: {}, notify_email: false, notify_telegram: false, notify_sms: false, notify_alimtalk: false, notify_friendtalk: false, kakao_template_id: null, kakao_variables: {}, is_active: true };
/** patch: 최종 상태 PATCH에 대한 시나리오 함수(state를 바꿀 수 있음) */
function realClientRoute(patch) {
  const state = { rowStatus: null, patchUrl: null, patchCalls: 0 };
  const ROW_ID = "00000000-0000-4000-8000-000000000001";
  const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  const fetchImpl = async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    const method = (init.method ?? "GET").toUpperCase();
    if (url.pathname.endsWith("/crm_form_sources")) return json(200, SOURCE_ROW);
    if (url.pathname.endsWith("/crm_submissions") && method === "POST") {
      const body = JSON.parse(init.body);
      state.rowStatus = body.status;
      return json(201, { id: ROW_ID, user_id: OWNER, name: null, phone: null, email: null, raw_values: {} });
    }
    if (url.pathname.endsWith("/crm_submissions") && method === "PATCH") {
      state.patchCalls++;
      state.patchUrl = url;
      return patch(state, JSON.parse(init.body), ROW_ID, json);
    }
    return json(404, {});
  };
  const client = realCreateClient("http://localhost:54321", "test-anon-key", { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetchImpl } });
  makeDb();
  globalThis.__whFake = { client: () => client };
  return state;
}
const applied = (st, body) => { st.rowStatus = body.status; };
for (const [name, patch, want] of [
  ["정상 1행", (st, b, id, json) => { applied(st, b); return json(200, [{ id }]); }, [true, undefined]],
  ["정상 0행", (st, b, id, json) => json(200, []), [false, "not_recorded"]],
  ["다른 id 1행", (st, b, id, json) => { applied(st, b); return json(200, [{ id: "00000000-0000-4000-8000-0000000000ff" }]); }, [false, "uncertain"]],
  ["여러 행", (st, b, id, json) => { applied(st, b); return json(200, [{ id }, { id }]); }, [false, "uncertain"]],
  ["적용 뒤 연결 리셋", (st, b) => { applied(st, b); throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNRESET" } }); }, [false, "uncertain"]],
  ["적용 뒤 HTTP 503", (st, b) => { applied(st, b); return new Response("unavailable", { status: 503 }); }, [false, "uncertain"]],
  ["적용 뒤 200 깨진 JSON", (st, b) => { applied(st, b); return new Response("{not json", { status: 200, headers: { "content-type": "application/json" } }); }, [false, "uncertain"]],
  ["명시 PostgREST 오류(400)", (st, b, id, json) => json(400, { code: "22P02", message: "invalid input", details: null, hint: null }), [false, "uncertain"]],
]) {
  test(`실제 supabase-js recordFinal: ${name} → recorded ${want[0]}${want[1] ? " · " + want[1] : ""}`, async () => {
    const st = realClientRoute(patch);
    const r = await post("tok-1", v2());
    assert.equal(r.status, 200);
    assert.deepEqual([r.body.recorded, r.body.recordState], want);
    assert.equal(r.body.status, "notified");
    assert.equal(st.patchCalls, 1); // 재기록 0
    assert.equal(globalThis.__whDispatched.length, 1); // 재발송 0
    // 갱신 조건: id·회원·폼 3개 + select=id
    for (const k of ["id", "user_id", "form_source_id"]) assert.ok(st.patchUrl.searchParams.get(k)?.startsWith("eq."), k);
    assert.equal(st.patchUrl.searchParams.get("select"), "id");
    assert.doesNotMatch(JSON.stringify(r.body), /fetch failed|ECONNRESET|unavailable|not json|invalid input|22P02/);
  });
}
