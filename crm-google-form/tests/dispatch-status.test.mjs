// CRM U2 — 실제 lib/crm/dispatch.ts(접수 확인 발송)의 채널별 결과 분류 시험.
// 실행: node --test crm-google-form/tests/dispatch-status.test.mjs   (새 패키지 0, 실DB·실발송·네트워크 0)
// 문자 오류는 설치된 solapi 패키지의 실제 오류 클래스로 만든다(이름 문자열 흉내 0). DB·발송 모듈만 가짜.
import { test } from "node:test";
import assert from "node:assert/strict";
import { register, createRequire } from "node:module";
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
    "@/lib/supabase/admin": "export function createAdminClient(){ return globalThis.__dsFake.client(); }",
    "@/lib/email/transport": "export async function sendViaSmtpAccount(a, to){ return globalThis.__dsChannel('email', to); }",
    "@/lib/telegram/client": "export async function sendTelegramMessage(p){ return globalThis.__dsChannel('telegram', p.chatId); }",
    "@/lib/solapi/client": "export async function sendSms(a, to){ return globalThis.__dsChannel('sms', to); } export async function sendAlimtalk(a, to){ return globalThis.__dsChannel('alimtalk', to); } export async function sendFriendtalk(a, to){ return globalThis.__dsChannel('friendtalk', to); }",
    "server-only": "export {};",
    "next/server": "export const NextResponse = { json(body, init) { return { status: (init && init.status) || 200, body }; } }; export class NextRequest {}",
  })};`,
  `export async function resolve(spec, ctx, next) {`,
  `  if (ctx.parentURL && ctx.parentURL.startsWith("dsfake:")) return next(spec, { ...ctx, parentURL: pathToFileURL(ROOT + "/package.json").href });`,
  `  if (spec in FAKES) return { url: "dsfake:///" + encodeURIComponent(spec), shortCircuit: true };`,
  `  if (spec.startsWith("@/")) {`,
  `    const base = ROOT + "/" + spec.slice(2);`,
  `    for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx"]) if (existsSync(base + ext)) return { url: pathToFileURL(base + ext).href, shortCircuit: true };`,
  `  }`,
  `  return next(spec, ctx);`,
  `}`,
  `export async function load(url, ctx, next) {`,
  `  if (url.startsWith("dsfake:")) return { format: "module", source: FAKES[decodeURIComponent(url.slice(10))], shortCircuit: true };`,
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

const solapi = createRequire(join(PROJECT, "package.json"))("solapi");
const OWNER = "11111111-1111-4111-8111-111111111111";

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
const ACCOUNTS = {
  user_smtp_accounts: { smtp_host: "h", smtp_port: 465, smtp_user: "u", smtp_password: "p", from_name: "f", label: "l" },
  user_telegram_links: { bot_token: "bot-secret", chat_id: "chat-1" },
  user_solapi_accounts: { api_key: "key-secret", api_secret: "sec-secret", sender_phone: "010", kakao_pf_id: "pf" },
};
/** accounts: 표마다 계정 객체 / null(없음) / "error"(조회 오류) / "throw"(예외) */
function setup({ accounts = ACCOUNTS, channel = () => undefined } = {}) {
  const sent = [];
  const queries = [];
  globalThis.__dsFake = {
    client: () => fakeClient((q) => {
      queries.push(q);
      const v = accounts[q.table];
      if (v === "throw") throw new Error("account lookup threw key-secret");
      if (v === "error") return { data: null, error: { message: "db down" } };
      return { data: v ?? null, error: null };
    }),
  };
  globalThis.__dsChannel = async (kind, to) => {
    sent.push(kind);
    const r = channel(kind, to);
    if (r instanceof Error || (r && typeof r === "object" && "_tag" in r)) throw r;
  };
  return { sent, queries };
}
const SOURCE = (over = {}) => ({
  id: "aaaaaaaa-1111-4111-8111-000000000001", user_id: OWNER, name: "폼1",
  notify_email: false, notify_telegram: false, notify_sms: false, notify_alimtalk: false, notify_friendtalk: false,
  kakao_template_id: null, kakao_variables: {}, ...over,
});
const SUB = (over = {}) => ({ id: "00000000-0000-4000-8000-000000000001", user_id: OWNER, name: "홍길동", phone: "010-1111-2222", email: "a@b.c", raw_values: { 이름: "홍길동" }, ...over });
const run = async (source, sub) => (await import(pathToFileURL(join(PROJECT, "lib/crm/dispatch.ts")).href)).dispatchSubmissionNotifications(source, sub);
const outcome = (r, ch) => r.channels.find((c) => c.channel === ch)?.outcome;
const SECRETS = /key-secret|sec-secret|bot-secret|010-1111-2222|a@b\.c|홍길동|HTTP_|errorMessage|db down|threw/;

// 실제 solapi 오류 인스턴스
const E = {
  client: () => new solapi.ClientError({ errorCode: "ValidationError", errorMessage: "bad to", httpStatus: 400 }),
  notReceived: () => new solapi.MessageNotReceivedError({ failedMessageList: [], totalCount: 1 }),
  badRequest: () => new solapi.BadRequestError({ message: "invalid" }),
  apiKey: () => new solapi.ApiKeyError({ message: "missing" }),
  invalidDate: () => new solapi.InvalidDateError({ message: "bad date" }),
  server: () => new solapi.ServerError({ errorCode: "HTTP_500", errorMessage: "x", httpStatus: 500 }),
  network: () => new solapi.NetworkError({ url: "u", method: "POST", cause: "reset" }),
  def: () => new solapi.DefaultError({ errorCode: "RequestFailedAfterRetryError", errorMessage: "x" }),
  schema: () => new solapi.ResponseSchemaMismatchError({ message: "m", validationErrors: [] }),
  defect: () => new solapi.UnexpectedDefectError({ message: "m" }),
  plain: () => new Error("weird"),
  type: () => new TypeError("fetch failed"),
};

test("문자 오류 분류 근거(A안): 보내기 전 검증만 확정 실패(rejected), HTTP 응답 뒤 오류(4xx·전부 접수 실패 포함)와 나머지는 불명(unknown)", async () => {
  const table = [
    ["client", "unknown"], ["notReceived", "unknown"], ["badRequest", "rejected"], ["apiKey", "rejected"], ["invalidDate", "rejected"],
    ["server", "unknown"], ["network", "unknown"], ["def", "unknown"], ["schema", "unknown"], ["defect", "unknown"], ["plain", "unknown"], ["type", "unknown"],
  ];
  for (const [k, want] of table) {
    setup({ channel: () => E[k]() });
    const r = await run(SOURCE({ notify_sms: true }), SUB());
    assert.equal(outcome(r, "sms"), want, k);
    assert.equal(r.status, want === "rejected" ? "failed" : "unknown", k);
    assert.doesNotMatch(r.errorMessage ?? "", SECRETS, k);
  }
});

test("이메일 오류 분류: SMTP 서버 거절 응답 코드 또는 라이브러리 사전 검증만 확정 실패, 그 밖은 불명", async () => {
  const mk = (props) => Object.assign(new Error("smtp"), props);
  const table = [
    [{ code: "EENVELOPE", responseCode: 550, command: "RCPT TO" }, "rejected"],
    [{ code: "EMESSAGE", responseCode: 554, command: "DATA" }, "rejected"],
    [{ code: "EAUTH", responseCode: 535, command: "AUTH PLAIN" }, "rejected"],
    [{ code: "EENVELOPE", command: "API" }, "rejected"],
    [{ code: "EMESSAGE", command: "API" }, "rejected"],
    [{ code: "ETIMEDOUT", command: "CONN" }, "unknown"],
    [{ code: "ECONNECTION", command: "API" }, "unknown"],
    [{ code: "EMESSAGE", responseCode: 250, command: "DATA" }, "unknown"],
    [{ code: "EENVELOPE", responseCode: "550" }, "unknown"],
    [{}, "unknown"],
  ];
  for (const [props, want] of table) {
    setup({ channel: () => mk(props) });
    const r = await run(SOURCE({ notify_email: true }), SUB());
    assert.equal(outcome(r, "email"), want, JSON.stringify(props));
  }
});

test("텔레그램 오류는 공용 코드가 종류를 구분해 주지 않아 모두 불명(문구 추측 0)", async () => {
  for (const err of [new Error("텔레그램 메시지 발송 실패 (401): x"), new TypeError("fetch failed")]) {
    setup({ channel: () => err });
    const r = await run(SOURCE({ notify_telegram: true }), SUB());
    assert.equal(outcome(r, "telegram"), "unknown");
    assert.equal(r.status, "unknown");
  }
});

test("최종 상태: 불명이 하나라도 있으면 unknown(성공+불명도 unknown), 성공+확정 실패만 partial, 전부 성공 notified, 확정 실패만 failed", async () => {
  const cases = [
    [{ sms: null, friendtalk: null }, "notified"],
    [{ sms: null, friendtalk: "apiKey" }, "partial"],
    [{ sms: null, friendtalk: "client" }, "unknown"],
    [{ sms: null, friendtalk: "network" }, "unknown"],
    [{ sms: "client", friendtalk: "network" }, "unknown"],
    [{ sms: "badRequest", friendtalk: "apiKey" }, "failed"],
  ];
  for (const [m, want] of cases) {
    setup({ channel: (k) => (m[k] ? E[m[k]]() : undefined) });
    const r = await run(SOURCE({ notify_sms: true, notify_friendtalk: true }), SUB());
    assert.equal(r.status, want, JSON.stringify(m));
  }
});

test("보낼 채널 없음·받는 주소 없음은 성공으로 표시하지 않는다(received, 시도 0)", async () => {
  let s = setup();
  let r = await run(SOURCE(), SUB());
  assert.equal(r.status, "received");
  assert.deepEqual(s.sent, []);
  s = setup();
  r = await run(SOURCE({ notify_email: true, notify_sms: true }), SUB({ email: null, phone: null }));
  assert.equal(r.status, "received");
  assert.deepEqual(r.channels.map((c) => c.outcome).sort(), ["skipped", "skipped"]);
  assert.deepEqual(s.sent, []);
  assert.match(r.errorMessage, /받는 주소 없음/);
});

test("받는 주소 없는 채널은 건너뛰고 나머지 성공이면 notified", async () => {
  setup();
  const r = await run(SOURCE({ notify_email: true, notify_sms: true }), SUB({ email: null }));
  assert.equal(outcome(r, "email"), "skipped");
  assert.equal(outcome(r, "sms"), "sent");
  assert.equal(r.status, "notified");
});

test("계정 없음·조회 오류·조회 예외 → 그 채널 확정 실패(보내지 않음), 원문 노출 0", async () => {
  for (const v of [null, "error", "throw"]) {
    const s = setup({ accounts: { ...ACCOUNTS, user_solapi_accounts: v } });
    const r = await run(SOURCE({ notify_sms: true, notify_alimtalk: true, kakao_template_id: "t1" }), SUB());
    assert.equal(outcome(r, "sms"), "rejected", String(v));
    assert.equal(outcome(r, "alimtalk"), "rejected", String(v));
    assert.equal(r.status, "failed");
    assert.deepEqual(s.sent, []);
    assert.doesNotMatch(r.errorMessage, SECRETS);
  }
  for (const [table, ch] of [["user_smtp_accounts", "email"], ["user_telegram_links", "telegram"]]) {
    const s = setup({ accounts: { ...ACCOUNTS, [table]: null } });
    const r = await run(SOURCE({ notify_email: ch === "email", notify_telegram: ch === "telegram" }), SUB());
    assert.equal(outcome(r, ch), "rejected");
    assert.deepEqual(s.sent, []);
  }
});

test("알림톡 템플릿 없음 → 확정 실패(보내지 않음)", async () => {
  const s = setup();
  const r = await run(SOURCE({ notify_alimtalk: true }), SUB());
  assert.equal(outcome(r, "alimtalk"), "rejected");
  assert.deepEqual(s.sent, []);
});

test("회원 경계: 접수 회원과 폼 연결 회원이 다르면 계정 조회·발송 0", async () => {
  const s = setup();
  const r = await run(SOURCE({ notify_sms: true, notify_email: true }), SUB({ user_id: "22222222-2222-4222-8222-222222222222" }));
  assert.equal(r.status, "failed");
  assert.deepEqual(s.sent, []);
  assert.deepEqual(s.queries, []);
});

test("계정 조회는 폼 연결 회원으로만 건다", async () => {
  const s = setup();
  await run(SOURCE({ notify_sms: true, notify_email: true, notify_telegram: true }), SUB());
  for (const q of s.queries) assert.ok(q.ops.some((o) => o[0] === "eq" && o[1] === "user_id" && o[2] === OWNER), q.table);
});

test("진단 문구는 고정 문구뿐(키·연락처·이름·서버 원문 0)", async () => {
  setup({ channel: (k) => (k === "sms" ? E.apiKey() : k === "email" ? Object.assign(new Error("550 a@b.c rejected"), { code: "EENVELOPE", responseCode: 550, command: "RCPT TO" }) : E.network()) });
  const r = await run(SOURCE({ notify_sms: true, notify_email: true, notify_telegram: true }), SUB());
  assert.doesNotMatch(r.errorMessage, SECRETS);
  assert.match(r.errorMessage, /문자: 거절됨/);
  assert.match(r.errorMessage, /텔레그램: 결과 모름/);
});


// ── 통합: 실제 웹훅 라우트 → 실제 발송 함수(가짜 DB·가짜 채널) ──────────────────────────────────
const TOKEN_SRC = { ...SOURCE({ notify_sms: true, notify_friendtalk: true }), webhook_token: "tok-1", is_active: true, field_mapping: { phone: "연락처" } };
function setupIntegrated(channel = () => undefined, onUpdate = null) {
  const rows = [];
  const base = setup({ channel });
  const accountAnswer = globalThis.__dsFake.client;
  globalThis.__dsFake = {
    client: () => {
      const acc = accountAnswer();
      return {
        from(table) {
          if (table.startsWith("user_")) return acc.from(table);
          return fakeClient((q) => {
            const eqs = q.ops.filter((o) => o[0] === "eq");
            const m = (o) => eqs.every((e) => o[e[1]] === e[2]);
            const ins = q.ops.find((o) => o[0] === "insert");
            const upd = q.ops.find((o) => o[0] === "update");
            if (q.table === "crm_form_sources") return { data: [TOKEN_SRC].find(m) ?? null, error: null };
            if (ins) {
              const v = ins[1];
              if (v.dedupe_key != null && rows.some((r) => r.user_id === v.user_id && r.form_source_id === v.form_source_id && r.dedupe_key === v.dedupe_key)) return { data: null, error: { code: "23505", message: "dup" } };
              const row = { id: "00000000-0000-4000-8000-" + String(rows.length + 1).padStart(12, "0"), ...v };
              rows.push(row);
              return { data: { id: row.id, user_id: row.user_id, name: row.name, phone: row.phone, email: row.email, raw_values: row.raw_values }, error: null };
            }
            if (upd) {
              if (onUpdate) { const r = onUpdate(q, rows, m); if (r !== undefined) return r; }
              const hit = rows.filter(m);
              for (const r of hit) Object.assign(r, upd[1]);
              return { data: q.ops.some((o) => o[0] === "select") ? hit.map((r) => ({ id: r.id })) : null, error: null };
            }
            if (q.single) { const h = rows.filter(m); return { data: h.length === 1 ? { id: h[0].id } : null, error: null }; }
            return { data: null, error: null };
          }).from(table);
        },
      };
    },
  };
  return { rows, sent: base.sent };
}
const FILE = "1AbCdEfGhIjKlMnOpQrStUvWxYz_0123456789-ab";
const v2body = (row = 5) => JSON.stringify({ v: 2, kind: "sheet", eventKey: `${FILE}:0:${row}:1794969285544`, values: { 연락처: ["010-1111-2222"] } });
const postReal = async (raw) => (await import(pathToFileURL(join(PROJECT, "app/api/webhooks/form-submit/[token]/route.ts")).href)).POST({ text: async () => raw }, { params: { token: "tok-1" } });

test("통합: v2 동시 두 번 → 실제 발송 함수가 한 번만 돌아 문자·친구톡 각 1번, 행 1·notified", async () => {
  const { rows, sent } = setupIntegrated();
  const [a, b] = await Promise.all([postReal(v2body()), postReal(v2body())]);
  assert.equal([a.body.duplicate, b.body.duplicate].filter(Boolean).length, 1);
  assert.deepEqual(sent.sort(), ["friendtalk", "sms"]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, "notified");
  assert.equal(rows[0].error_message, null);
});

test("통합: 문자 성공 + 친구톡 네트워크 오류 → 행 unknown(partial 아님), 팔로우업은 이 접수를 보류", async () => {
  const { rows } = setupIntegrated((k) => (k === "friendtalk" ? E.network() : undefined));
  await postReal(v2body(6));
  assert.equal(rows[0].status, "unknown");
  const { followupAllowed } = await import(pathToFileURL(join(PROJECT, "lib/crm/submissionStatus.ts")).href);
  assert.equal(followupAllowed(rows[0].status), false);
});

test("통합: 문자 성공 + 친구톡 4xx → unknown(A안), 친구톡 요청 전 검증 거절 → partial, 구버전 본문은 키 없이 저장", async () => {
  let { rows } = setupIntegrated((k) => (k === "friendtalk" ? E.client() : undefined));
  await postReal(v2body(7));
  assert.equal(rows[0].status, "unknown");
  ({ rows } = setupIntegrated((k) => (k === "friendtalk" ? E.badRequest() : undefined)));
  await postReal(v2body(8));
  assert.equal(rows[0].status, "partial");
  ({ rows } = setupIntegrated());
  await postReal(JSON.stringify({ values: { 연락처: ["010-1111-2222"] } }));
  assert.equal(rows[0].status, "notified");
  assert.equal("dedupe_key" in rows[0], false);
});


test("통합 recordFinal: 실제 dispatch 뒤 0행 갱신 → recorded false·not_recorded, 반영 뒤 응답 유실 → uncertain(행은 실제 최종 상태)", async () => {
  let { rows } = setupIntegrated(undefined, () => ({ data: [], error: null }));
  let r = await postReal(v2body(9));
  assert.deepEqual([r.body.status, r.body.recorded, r.body.recordState], ["notified", false, "not_recorded"]);
  assert.equal(rows[0].status, "dispatching");
  ({ rows } = setupIntegrated(undefined, (q, rs, m) => { for (const x of rs) if (m(x)) Object.assign(x, q.ops.find((o) => o[0] === "update")[1]); throw new Error("lost"); }));
  r = await postReal(v2body(10));
  assert.deepEqual([r.body.recorded, r.body.recordState], [false, "uncertain"]);
  assert.equal(rows[0].status, "notified");
});

test("통합 recordFinal: 정상 → recorded true", async () => {
  const { rows } = setupIntegrated();
  const r = await postReal(v2body(11));
  assert.deepEqual([r.body.status, r.body.recorded], ["notified", true]);
  assert.equal(rows[0].status, "notified");
});
