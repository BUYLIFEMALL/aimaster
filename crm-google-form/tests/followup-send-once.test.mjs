// CRM 팔로우업 — 실제 lib/crm/followupDispatch.ts(runFollowupRule) + 실제 1회 전송기(lib/crm/solapiSendOnce.ts) 시험.
// 실행: node --test crm-google-form/tests/followup-send-once.test.mjs   (새 패키지 0, 실네트워크·실문자 0)
// 가짜 네트워크는 runFollowupRule(rule, { solapiFetch })로만 넘긴다. 실수로 실제 네트워크를 부르지 않도록 이 파일 안에서는
// 전역 fetch를 「차단」 함수로 바꿔 두고 끝에 되돌린다(차단 함수가 불리면 시험 실패).
import { test, before, after } from "node:test";
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
    "@/lib/supabase/admin": "export function createAdminClient(){ return globalThis.__fuFake.client(); }",
    "@/lib/email/transport": "export async function sendViaSmtpAccount(){ throw new Error('email not used'); }",
    "server-only": "export {};",
  })};`,
  `export async function resolve(spec, ctx, next) {`,
  `  if (ctx.parentURL && ctx.parentURL.startsWith("fufake:")) return next(spec, { ...ctx, parentURL: pathToFileURL(ROOT + "/package.json").href });`,
  `  if (spec in FAKES) return { url: "fufake:///" + encodeURIComponent(spec), shortCircuit: true };`,
  `  if (spec.startsWith("@/")) {`,
  `    const base = ROOT + "/" + spec.slice(2);`,
  `    for (const ext of [".ts", ".tsx"]) if (existsSync(base + ext)) return { url: pathToFileURL(base + ext).href, shortCircuit: true };`,
  `  }`,
  `  return next(spec, ctx);`,
  `}`,
  `export async function load(url, ctx, next) {`,
  `  if (url.startsWith("fufake:")) return { format: "module", source: FAKES[decodeURIComponent(url.slice(10))], shortCircuit: true };`,
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

const realFetch = globalThis.fetch;
let blockedCalls = 0;
before(() => { globalThis.fetch = async () => { blockedCalls++; throw new Error("real network blocked in test"); }; });
after(() => { globalThis.fetch = realFetch; assert.equal(blockedCalls, 0, "전역 fetch(실제 네트워크 경로)가 불림"); });

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
const ACCOUNT = { api_key: "KEY-secret", api_secret: "SECRET-secret", sender_phone: "0101112222", kakao_pf_id: "PF-1" };
/** 실제처럼 eq 조건으로 거르는 상태 유지 가짜 DB */
function db(rows, hooks = {}) {
  const sends = [];
  const eqs = (q) => q.ops.filter((o) => o[0] === "eq");
  const m = (o, q) => eqs(q).every((e) => !(e[1] in o) || o[e[1]] === e[2]);
  globalThis.__fuFake = {
    client: () => fakeClient((q) => {
      hooks.before?.(q);
      const ins = q.ops.find((o) => o[0] === "insert");
      const del = q.ops.some((o) => o[0] === "delete");
      const upd = q.ops.find((o) => o[0] === "update");
      if (q.table === "crm_form_sources") return { data: [{ id: "s1", user_id: "user-1" }].find((x) => m(x, q)) ?? null, error: null };
      if (q.table === "crm_submissions" && q.single) { const h = rows.find((r) => m(r, q)); return { data: h ? { id: h.id, status: h.status } : null, error: null }; }
      if (q.table === "crm_submissions") return { data: rows.filter((r) => m(r, q)).map((r) => ({ ...r })), error: null };
      if (q.table === "crm_followup_sends" && ins) {
        const v = ins[1];
        if (sends.some((x) => x.submission_id === v.submission_id && x.rule_id === v.rule_id)) return { data: null, error: { code: "23505" } };
        const rec = { id: "claim-" + (sends.length + 1), ...v };
        sends.push(rec);
        hooks.afterClaim?.(rec);
        return { data: { id: rec.id }, error: null };
      }
      if (q.table === "crm_followup_sends" && del) { const gone = []; for (let i = sends.length - 1; i >= 0; i--) if (m(sends[i], q)) gone.push(...sends.splice(i, 1)); return { data: gone.map((x) => ({ id: x.id })), error: null }; }
      if (q.table === "crm_followup_sends" && upd) { for (const x of sends) if (m(x, q)) Object.assign(x, upd[1]); return { data: null, error: null }; }
      if (q.table === "crm_followup_sends" && q.single) { const h = sends.find((x) => m(x, q)); return { data: h ? { id: h.id, user_id: h.user_id } : null, error: null }; }
      if (q.table === "crm_followup_sends") return { data: sends.filter((x) => m(x, q)).map((x) => ({ submission_id: x.submission_id })), error: null };
      if (q.table === "user_solapi_accounts") return { data: ACCOUNT, error: null };
      return { data: null, error: null };
    }),
  };
  return { sends };
}
const row = (id, status = "notified") => ({ id, name: "홍길동", phone: "010-1111-2222", email: null, raw_values: {}, status, user_id: "user-1", form_source_id: "s1" });
const RULE = (over = {}) => ({
  id: "rule-1", user_id: "user-1", form_source_id: "s1", name: "규칙", days_after: 3,
  channel_email: false, channel_sms: false, channel_alimtalk: false, channel_friendtalk: false,
  message_subject: null, message_text: "안녕하세요 {name}님", kakao_template_id: "TPL-1", kakao_variables: { "#{이름}": "이름" }, ...over,
});
const OKB = { failedMessageList: [], groupInfo: { count: { total: 1, sentTotal: 0, sentFailed: 0, sentSuccess: 0, sentPending: 0, sentReplacement: 0, refund: 0, registeredFailed: 0, registeredSuccess: 1 } } };
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const R = {
  ok: () => json(200, OKB),
  s503: () => new Response("x", { status: 503 }),
  reset: () => { throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNRESET" } }); },
  s400: () => json(400, { errorCode: "ValidationError", errorMessage: "bad" }),
};
function net(...steps) {
  const st = { calls: 0, bodies: [] };
  st.fetch = async (url, init) => { st.calls++; st.bodies.push(JSON.parse(init.body)); return steps[Math.min(st.calls - 1, steps.length - 1)](); };
  return st;
}
const run = async (rule, st) => (await import(pathToFileURL(join(PROJECT, "lib/crm/followupDispatch.ts")).href)).runFollowupRule(rule, { solapiFetch: st.fetch });
const CH = [["sms", { channel_sms: true }, "SMS"], ["alimtalk", { channel_alimtalk: true }, "알림톡"], ["friendtalk", { channel_friendtalk: true }, "친구톡"]];
const SECRETS = /KEY-secret|SECRET-secret|010-1111-2222|ValidationError|fetch failed/;

for (const [ch, flags, label] of CH) {
  for (const [name, steps, wantSent, note] of [
    ["503 뒤 400이 큐에 있어도", [R.s503, R.s400], false, "결과 모름"],
    ["연결 리셋 뒤 400이 큐에 있어도", [R.reset, R.s400], false, "결과 모름"],
    ["503 뒤 성공이 큐에 있어도(다시 보내지 않음)", [R.s503, R.ok], false, "결과 모름"],
    ["공식 400 거절", [R.s400], false, "거절됨"],
    ["접수 성공", [R.ok], true, null],
  ]) {
    test(`팔로우업 ${ch}: ${name} → HTTP 1번, ${wantSent ? "sent" : "failed(" + note + ")"}, 재실행해도 재발송 0`, async () => {
      const { sends } = db([row("a")]);
      const st = net(...steps);
      const r1 = await run(RULE(flags), st);
      assert.equal(st.calls, 1);
      assert.deepEqual([r1.sent, r1.failed], wantSent ? [1, 0] : [0, 1]);
      assert.equal(sends.length, 1);
      assert.equal(sends[0].status, wantSent ? "sent" : "failed");
      if (note) assert.equal(sends[0].error_message, `${label}: ${note}`);
      else assert.equal(sends[0].error_message, null);
      assert.doesNotMatch(sends[0].error_message ?? "", SECRETS);
      const r2 = await run(RULE(flags), st);
      assert.equal(st.calls, 1); // 기록이 있어 다시 보내지 않음
      assert.deepEqual([r2.sent, r2.failed], [0, 0]);
    });
  }
}

test("팔로우업 본문: 실제 전송기 요청 본문이 채널별 공식 형식(문자 텍스트 치환·알림톡 템플릿 변수·친구톡 CTA)", async () => {
  db([row("a")]);
  const st = net(R.ok);
  await run(RULE({ channel_sms: true, channel_alimtalk: true, channel_friendtalk: true }), st);
  assert.deepEqual(st.bodies.map((b) => b.messages[0]), [
    { text: "안녕하세요 홍길동님", to: "01011112222", from: "0101112222" },
    { kakaoOptions: { pfId: "PF-1", templateId: "TPL-1", variables: { "#{이름}": "" } }, to: "01011112222", from: "0101112222" },
    { text: "안녕하세요 홍길동님", type: "CTA", kakaoOptions: { pfId: "PF-1", adFlag: false }, to: "01011112222", from: "0101112222" },
  ]);
});

test("다채널: 문자 성공 + 친구톡 503 → failed(「친구톡: 결과 모름」), 각 채널 HTTP 1번", async () => {
  const { sends } = db([row("a")]);
  let n = 0;
  const st = { fetch: async () => (n++ === 0 ? R.ok() : R.s503()) };
  const r = await run(RULE({ channel_sms: true, channel_friendtalk: true }), st);
  assert.equal(n, 2);
  assert.deepEqual([r.sent, r.failed], [0, 1]);
  assert.equal(sends[0].error_message, "친구톡: 결과 모름");
});

test("부분 시도 + 상태 변경: 문자 보낸 뒤 상태가 미확정으로 바뀌면 친구톡 중단·interrupted·기록 보존·HTTP 1번", async () => {
  const rows = [row("a")];
  const { sends } = db(rows);
  let n = 0;
  const st = { fetch: async () => { n++; rows[0].status = "unknown"; return R.ok(); } };
  const r = await run(RULE({ channel_sms: true, channel_friendtalk: true }), st);
  assert.equal(n, 1);
  assert.equal(r.interrupted, 1);
  assert.equal(sends.length, 1);
  assert.match(sends[0].error_message, /남은 채널을 멈춤\(시도: SMS\)/);
});

test("선점 전 상태 변경(계정 조회 중) → held·HTTP 0번, 확정 뒤 다음 실행에서 1번", async () => {
  const rows = [row("a")];
  const { sends } = db(rows, { before: (q) => { if (q.table === "user_solapi_accounts" && !rows.flipped) { rows.flipped = true; rows[0].status = "unknown"; } } });
  const st = net(R.ok);
  const r1 = await run(RULE({ channel_sms: true }), st);
  assert.deepEqual([r1.held, st.calls, sends.length], [1, 0, 0]);
  rows[0].status = "notified";
  const r2 = await run(RULE({ channel_sms: true }), st);
  assert.deepEqual([r2.sent, st.calls], [1, 1]);
});

test("선점 직후 상태 변경 → 선점 해제·held·HTTP 0번(기존 해제 판정 유지)", async () => {
  const rows = [row("a")];
  let flipped = false;
  const { sends } = db(rows, { afterClaim: () => { if (!flipped) { flipped = true; rows[0].status = "dispatching"; } } });
  const st = net(R.ok);
  const r = await run(RULE({ channel_sms: true }), st);
  assert.deepEqual([r.held, r.releaseFailed, r.releaseUnknown, st.calls, sends.length], [1, 0, 0, 0, 0]);
});

test("요청 전 검증 실패(카카오 채널 없음 계정) → failed(「친구톡: 보내기 전 검증 실패」), HTTP 0번", async () => {
  const { sends } = db([row("a")]);
  ACCOUNT.kakao_pf_id = null;
  try {
    const st = net(R.ok);
    const r = await run(RULE({ channel_friendtalk: true }), st);
    assert.equal(st.calls, 0);
    assert.equal(r.failed, 1);
    assert.equal(sends[0].error_message, "친구톡: 보내기 전 검증 실패");
  } finally {
    ACCOUNT.kakao_pf_id = "PF-1";
  }
});

test("팔로우업 원본에 공용 래퍼 send 호출 0, 1회 전송기 사용", async () => {
  const src = (await import("node:fs")).readFileSync(join(PROJECT, "lib/crm/followupDispatch.ts"), "utf8");
  assert.doesNotMatch(src, /\bsend(Sms|Alimtalk|Friendtalk)\(/);
  assert.match(src, /sendSolapiOnce\(/);
});
