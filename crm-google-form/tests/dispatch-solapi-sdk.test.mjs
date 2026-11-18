// CRM B′ — 실제 dispatch.ts + 실제 접수 확인 전용 1회 전송기(lib/crm/solapiSendOnce.ts)로 문자·알림톡·친구톡 분류 시험.
// (A안 때는 실제 solapi SDK를 거쳤으나 B′부터 접수 확인 발송은 SDK를 쓰지 않는다 — SDK 내부 재시도로 HTTP가 여러 번 나가던 것을 1번으로.)
// 실행: node --test crm-google-form/tests/dispatch-solapi-sdk.test.mjs   (새 패키지 0, 실네트워크·실문자 0)
// 네트워크는 이 시험 파일 안에서만 globalThis.fetch를 가짜로 바꾸고 각 시험 끝에 원래대로 돌린다(운영 코드의 전역 교체 0).
// 접수 확인 발송은 HTTP를 정확히 1번만 부른다(뒤 응답이 큐에 남아 있어도). 팔로우업은 여전히 SDK라 같은 위험이 남아 있다.
import { test, afterEach } from "node:test";
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
    "@/lib/supabase/admin": "export function createAdminClient(){ return globalThis.__sdkFake.client(); }",
    "@/lib/email/transport": "export async function sendViaSmtpAccount(){ throw new Error('not used'); }",
    "@/lib/telegram/client": "export async function sendTelegramMessage(){ throw new Error('not used'); }",
    "server-only": "export {};",
  })};`,
  `export async function resolve(spec, ctx, next) {`,
  `  if (ctx.parentURL && ctx.parentURL.startsWith("sdkfake:")) return next(spec, { ...ctx, parentURL: pathToFileURL(ROOT + "/package.json").href });`,
  `  if (spec in FAKES) return { url: "sdkfake:///" + encodeURIComponent(spec), shortCircuit: true };`,
  `  if (spec.startsWith("@/")) {`,
  `    const base = ROOT + "/" + spec.slice(2);`,
  `    for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx"]) if (existsSync(base + ext)) return { url: pathToFileURL(base + ext).href, shortCircuit: true };`,
  `  }`,
  `  return next(spec, ctx);`,
  `}`,
  `export async function load(url, ctx, next) {`,
  `  if (url.startsWith("sdkfake:")) return { format: "module", source: FAKES[decodeURIComponent(url.slice(11))], shortCircuit: true };`,
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
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

function fakeClient(answer) {
  return {
    from(table) {
      const q = { table, ops: [] };
      const b = new Proxy({}, {
        get(_, k) {
          if (k === "then") return (res, rej) => Promise.resolve(answer(q)).then(res, rej);
          if (k === "maybeSingle" || k === "single") return () => Promise.resolve(answer(q));
          return (...args) => { q.ops.push([k, ...args]); return b; };
        },
      });
      return b;
    },
  };
}
function useAccount(account = { api_key: "key-secret", api_secret: "sec-secret", sender_phone: "0101112222", kakao_pf_id: "pf-1" }) {
  globalThis.__sdkFake = { client: () => fakeClient((q) => ({ data: q.table === "user_solapi_accounts" ? account : null, error: null })) };
}
const OK_JSON = { groupInfo: { count: { total: 1, sentTotal: 0, sentFailed: 0, sentSuccess: 0, sentPending: 0, sentReplacement: 0, refund: 0, registeredFailed: 0, registeredSuccess: 1 } }, failedMessageList: [] };
const step = {
  s503: () => new Response("unavailable", { status: 503 }),
  reset: () => { throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNRESET" } }); },
  s400: () => new Response(JSON.stringify({ errorCode: "ValidationError", errorMessage: "bad 010-1111-2222" }), { status: 400 }),
  ok: () => new Response(JSON.stringify(OK_JSON), { status: 200 }),
  allFailed: () => new Response(JSON.stringify({ groupInfo: { count: { ...OK_JSON.groupInfo.count, registeredFailed: 1, registeredSuccess: 0 } }, failedMessageList: [{ to: "x", from: "y", type: "SMS", statusMessage: "m", country: "82", messageId: "i", statusCode: "3059", accountId: "a" }] }), { status: 200 }),
};
/** 응답 순서를 정해 가짜 fetch 설치, 호출 수를 센다(마지막 응답은 반복). */
function script(...steps) {
  const st = { calls: 0 };
  globalThis.fetch = async () => {
    const f = steps[Math.min(st.calls, steps.length - 1)];
    st.calls++;
    return f();
  };
  return st;
}
const SOURCE = (over) => ({
  id: "aaaaaaaa-1111-4111-8111-000000000001", user_id: OWNER, name: "폼1",
  notify_email: false, notify_telegram: false, notify_sms: false, notify_alimtalk: false, notify_friendtalk: false,
  kakao_template_id: null, kakao_variables: {}, ...over,
});
const SUB = (over = {}) => ({ id: "00000000-0000-4000-8000-000000000001", user_id: OWNER, name: "홍길동", phone: "010-1111-2222", email: null, raw_values: {}, ...over });
const CHANNELS = [
  ["sms", { notify_sms: true }],
  ["alimtalk", { notify_alimtalk: true, kakao_template_id: "TPL-1" }],
  ["friendtalk", { notify_friendtalk: true }],
];
const run = async (src, sub = SUB()) => (await import(pathToFileURL(join(PROJECT, "lib/crm/dispatch.ts")).href)).dispatchSubmissionNotifications(src, sub);
const SECRETS = /key-secret|sec-secret|010-1111-2222|홍길동|bad |ValidationError|HTTP_/;

for (const [ch, flags] of CHANNELS) {
  const cases = [
    ["503이 계속 와도(예전 SDK는 4번)", [step.s503], "unknown", 1],
    ["503 → 400이 큐에 있어도", [step.s503, step.s400], "unknown", 1],
    ["연결 리셋 → 400이 큐에 있어도", [step.reset, step.s400], "unknown", 1],
    ["400 공식 오류 본문(1번만 보냈으니 명시 거절 확정)", [step.s400], "rejected", 1],
    ["2xx 전부 접수 실패", [step.allFailed], "rejected", 1],
    ["503 → 성공이 큐에 있어도(다시 보내지 않음)", [step.s503, step.ok], "unknown", 1],
    ["성공", [step.ok], "sent", 1],
  ];
  for (const [name, steps, want, http] of cases) {
    test(`${ch}: ${name} → ${want}, HTTP ${http}번`, async () => {
      useAccount();
      const st = script(...steps);
      const r = await run(SOURCE(flags));
      const c = r.channels.find((x) => x.channel === ch);
      assert.equal(c.outcome, want);
      assert.equal(st.calls, http);
      assert.doesNotMatch(r.errorMessage ?? "", SECRETS);
    });
  }
}

test("요청 전 검증(받는 번호 형식 오류) → rejected, HTTP 0번", async () => {
  useAccount();
  const st = script(step.ok);
  // 공백만 있는 번호는 「주소 없음」이 아니라 SDK 스키마 검증 단계에서 막힌다
  const r = await run(SOURCE({ notify_sms: true }), SUB({ phone: " " }));
  const c = r.channels.find((x) => x.channel === "sms");
  if (c.outcome !== "rejected") {
    // SDK가 공백 번호를 통과시키는 버전이면 이 시험의 전제가 다름 — 결과를 명시적으로 보여 준다
    assert.fail(`공백 번호 결과 ${c.outcome}, HTTP ${st.calls}`);
  }
  assert.equal(st.calls, 0);
});

test("요청 전 검증(API 키 없음) → rejected, HTTP 0번", async () => {
  useAccount({ api_key: "", api_secret: "", sender_phone: "0101112222", kakao_pf_id: "pf-1" });
  const st = script(step.ok);
  const r = await run(SOURCE({ notify_sms: true, notify_friendtalk: true }));
  assert.deepEqual(r.channels.map((c) => c.outcome), ["rejected", "rejected"]);
  assert.equal(st.calls, 0);
  assert.equal(r.status, "failed");
});

test("알림톡 카카오 채널 ID 없음 → 보내기 전 rejected(공용 래퍼의 일반 Error에 기대지 않음), HTTP 0번", async () => {
  useAccount({ api_key: "k", api_secret: "s", sender_phone: "0101112222", kakao_pf_id: null });
  const st = script(step.ok);
  const r = await run(SOURCE({ notify_alimtalk: true, kakao_template_id: "TPL-1" }));
  assert.equal(r.channels[0].outcome, "rejected");
  assert.match(r.errorMessage, /카카오 채널 없음/);
  assert.equal(st.calls, 0);
});

test("최종 상태: 문자 성공 + 친구톡 400 → partial, 문자 성공 + 친구톡 503 → unknown(각 채널 HTTP 1번)", async () => {
  useAccount();
  let n = 0;
  globalThis.fetch = async () => (n++ === 0 ? step.ok() : step.s400());
  let r = await run(SOURCE({ notify_sms: true, notify_friendtalk: true }));
  assert.equal(r.status, "partial");
  assert.equal(n, 2);
  n = 0;
  globalThis.fetch = async () => (n++ === 0 ? step.ok() : step.s503());
  r = await run(SOURCE({ notify_sms: true, notify_friendtalk: true }));
  assert.equal(r.status, "unknown");
  assert.equal(n, 2);
});

test("공용 래퍼(SDK 경로)를 부르지 않는다: dispatch 원본에 sendSms·sendAlimtalk·sendFriendtalk 호출 0", async () => {
  const src = (await import("node:fs")).readFileSync(join(PROJECT, "lib/crm/dispatch.ts"), "utf8");
  assert.doesNotMatch(src, /\bsend(Sms|Alimtalk|Friendtalk)\(/);
  assert.match(src, /sendSolapiOnce\(/);
});
