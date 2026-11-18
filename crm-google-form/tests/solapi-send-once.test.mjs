// CRM B′ — 접수 확인 전용 SOLAPI 1회 전송기(lib/crm/solapiSendOnce.ts) 시험.
// 실행: node --test crm-google-form/tests/solapi-send-once.test.mjs   (새 패키지 0, 실네트워크·실문자 0)
// 전송기에는 가짜 fetch를 인자로만 넘긴다. 공식 SDK와의 본문·서명 대조 때만 이 파일 안에서 전역 fetch를 잠깐 바꾸고 바로 되돌린다.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { register, createRequire } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createHmac } from "node:crypto";

const PROJECT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HOOKS = [
  `import { createRequire } from "node:module";`,
  `import { existsSync, readFileSync } from "node:fs";`,
  `import { pathToFileURL, fileURLToPath } from "node:url";`,
  `const ROOT = ${JSON.stringify(PROJECT.replace(/\\/g, "/"))};`,
  `const req = createRequire(pathToFileURL(ROOT + "/package.json"));`,
  `const ts = req("typescript");`,
  `const FAKES = ${JSON.stringify({ "server-only": "export {};" })};`,
  `export async function resolve(spec, ctx, next) {`,
  `  if (spec in FAKES) return { url: "sofake:///" + encodeURIComponent(spec), shortCircuit: true };`,
  `  if (spec.startsWith("@/")) {`,
  `    const base = ROOT + "/" + spec.slice(2);`,
  `    for (const ext of [".ts", ".tsx"]) if (existsSync(base + ext)) return { url: pathToFileURL(base + ext).href, shortCircuit: true };`,
  `  }`,
  `  return next(spec, ctx);`,
  `}`,
  `export async function load(url, ctx, next) {`,
  `  if (url.startsWith("sofake:")) return { format: "module", source: FAKES[decodeURIComponent(url.slice(10))], shortCircuit: true };`,
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

const M = await import(pathToFileURL(join(PROJECT, "lib/crm/solapiSendOnce.ts")).href);
const solapi = createRequire(join(PROJECT, "package.json"))("solapi");
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

const ACC = { api_key: "KEY-secret", api_secret: "SECRET-secret", sender_phone: "010-111-2222", kakao_pf_id: "PF-1" };
const MSGS = {
  sms: { kind: "sms", to: "010-1111-2222", text: "[폼1] 홍길동님, 신청이 정상적으로 접수되었습니다." },
  alimtalk: { kind: "alimtalk", to: "010-1111-2222", templateId: "TPL-1", variables: { "#{이름}": "홍길동" } },
  friendtalk: { kind: "friendtalk", to: "010-1111-2222", text: "홍길동님, 접수되었습니다." },
};
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const OK = { failedMessageList: [], groupInfo: { count: { total: 1, sentTotal: 0, sentFailed: 0, sentSuccess: 0, sentPending: 0, sentReplacement: 0, refund: 0, registeredFailed: 0, registeredSuccess: 1 } } };
const ALL_FAILED = { failedMessageList: [{ to: "01011112222", from: "0101112222", type: "SMS", statusMessage: "x", country: "82", messageId: "m", statusCode: "3059", accountId: "a" }], groupInfo: { count: { ...OK.groupInfo.count, registeredFailed: 1, registeredSuccess: 0 } } };
/** 응답 큐(뒤 응답이 남아 있어도 전송기는 1번만 불러야 함) */
function queue(...steps) {
  const st = { calls: 0, inits: [] };
  st.fetch = async (url, init) => {
    st.calls++;
    st.inits.push({ url, init });
    const f = steps[Math.min(st.calls - 1, steps.length - 1)];
    return f(init);
  };
  return st;
}
const s503 = () => new Response("unavailable", { status: 503 });
const reset = () => { throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNRESET" } }); };
const s400 = () => json(400, { errorCode: "ValidationError", errorMessage: "bad to 010-1111-2222" });
const SECRET_RE = /KEY-secret|SECRET-secret|010-1111-2222|01011112222|홍길동|ValidationError|unavailable|fetch failed/;

test("공식 SDK와 같은 요청 본문(문자·알림톡·친구톡) — agent 필드 외 messages 항목 동일", async () => {
  for (const [kind, msg] of Object.entries(MSGS)) {
    let sdkBody = null;
    globalThis.fetch = async (url, init) => { sdkBody = JSON.parse(init.body); return json(200, OK); };
    const svc = new solapi.SolapiMessageService(ACC.api_key, ACC.api_secret);
    const sdkMsg =
      kind === "sms" ? { to: msg.to, from: ACC.sender_phone, text: msg.text }
      : kind === "alimtalk" ? { to: msg.to, from: ACC.sender_phone, kakaoOptions: { pfId: ACC.kakao_pf_id, templateId: msg.templateId, variables: msg.variables } }
      : { to: msg.to, from: ACC.sender_phone, type: "CTA", text: msg.text, kakaoOptions: { pfId: ACC.kakao_pf_id, adFlag: false } };
    await svc.send(sdkMsg);
    globalThis.fetch = realFetch;
    const ours = M.buildSendBody(ACC, msg);
    assert.deepEqual(ours.messages, sdkBody.messages, kind);
  }
});

test("공식 SDK와 같은 HMAC-SHA256 서명: SDK가 보낸 date·salt로 우리 함수가 같은 헤더를 만든다", async () => {
  let header = null;
  globalThis.fetch = async (url, init) => { header = init.headers.Authorization; return json(200, OK); };
  await new solapi.SolapiMessageService(ACC.api_key, ACC.api_secret).send({ to: "01011112222", from: "0101112222", text: "x" });
  globalThis.fetch = realFetch;
  const m = header.match(/^HMAC-SHA256 apiKey=(.+), date=(.+), salt=(.+), signature=([0-9a-f]{64})$/);
  assert.ok(m, "SDK 헤더 형식");
  assert.equal(M.buildAuthHeader(ACC.api_key, ACC.api_secret, m[2], m[3]), header);
  // 독립 계산과도 일치
  assert.equal(m[4], createHmac("sha256", ACC.api_secret).update(m[2] + m[3]).digest("hex"));
});

test("보내는 헤더·옵션: 고정 date·salt면 정확한 서명, redirect error, signal 있음, 주소는 send-many/detail", async () => {
  const st = queue(() => json(200, OK));
  await M.sendSolapiOnce(ACC, MSGS.sms, { fetch: st.fetch, now: () => new Date("2026-11-18T00:00:00.000Z"), salt: () => "abc123" });
  const { url, init } = st.inits[0];
  assert.equal(url, "https://api.solapi.com/messages/v4/send-many/detail");
  assert.equal(init.method, "POST");
  assert.equal(init.redirect, "error");
  assert.ok(init.signal instanceof AbortSignal);
  assert.equal(init.headers["Content-Type"], "application/json");
  const sig = createHmac("sha256", ACC.api_secret).update("2026-11-18T00:00:00.000Z" + "abc123").digest("hex");
  assert.equal(init.headers.Authorization, `HMAC-SHA256 apiKey=${ACC.api_key}, date=2026-11-18T00:00:00.000Z, salt=abc123, signature=${sig}`);
});

test("기본 salt는 매번 다른 32자 16진 난수", async () => {
  const st = queue(() => json(200, OK));
  await M.sendSolapiOnce(ACC, MSGS.sms, { fetch: st.fetch });
  await M.sendSolapiOnce(ACC, MSGS.sms, { fetch: st.fetch });
  const salts = st.inits.map((x) => x.init.headers.Authorization.match(/salt=([^,]+),/)[1]);
  assert.match(salts[0], /^[0-9a-f]{32}$/);
  assert.notEqual(salts[0], salts[1]);
});

for (const kind of Object.keys(MSGS)) {
  const cases = [
    ["503 뒤 400이 큐에 있어도", [s503, s400], "unknown", "server_error"],
    ["연결 리셋 뒤 400이 큐에 있어도", [reset, s400], "unknown", "network"],
    ["400 공식 오류 본문", [s400], "rejected", "client_rejected"],
    ["400 JSON 아님", [() => new Response("<html>", { status: 400 })], "unknown", "bad_response"],
    ["401 공식 오류 본문", [() => json(401, { errorCode: "InvalidApiKey", errorMessage: "x" })], "rejected", "client_rejected"],
    ["429", [() => json(429, { errorCode: "TooManyRequests", errorMessage: "x" })], "unknown", "rate_limited"],
    ["500", [() => json(500, { errorCode: "x", errorMessage: "y" })], "unknown", "server_error"],
    ["200 접수 성공", [() => json(200, OK)], "sent", "accepted"],
    ["200 전부 접수 실패", [() => json(200, ALL_FAILED)], "rejected", "registration_failed"],
    ["200 깨진 JSON", [() => new Response("{not", { status: 200 })], "unknown", "bad_response"],
    ["200 계약과 다른 모양", [() => json(200, { ok: true })], "unknown", "bad_response"],
    ["200 개수 이상(total 2)", [() => json(200, { ...OK, groupInfo: { count: { ...OK.groupInfo.count, total: 2 } } })], "unknown", "bad_response"],
    ["200 숫자 아닌 개수", [() => json(200, { ...OK, groupInfo: { count: { ...OK.groupInfo.count, registeredSuccess: "1" } } })], "unknown", "bad_response"],
    ["302(리다이렉트 응답)", [() => new Response("", { status: 302 })], "unknown", "bad_response"],
  ];
  for (const [name, steps, outcome, reason] of cases) {
    test(`${kind}: ${name} → ${outcome}(${reason}), HTTP 정확히 1번`, async () => {
      const st = queue(...steps);
      const r = await M.sendSolapiOnce(ACC, MSGS[kind], { fetch: st.fetch });
      assert.deepEqual(r, { outcome, httpCalls: 1, reason });
      assert.equal(st.calls, 1);
      assert.doesNotMatch(JSON.stringify(r), SECRET_RE);
    });
  }
}

test("응답 본문 상한(64KiB) 초과 → unknown, 1번", async () => {
  const st = queue(() => new Response("x".repeat(64 * 1024 + 1), { status: 200 }));
  assert.deepEqual(await M.sendSolapiOnce(ACC, MSGS.sms, { fetch: st.fetch }), { outcome: "unknown", httpCalls: 1, reason: "bad_response" });
});

test("전체 마감: 응답 헤더가 안 오면 마감 시간에 끊고 unknown, 본문 읽기 도중 멈춰도 unknown", async () => {
  const hang = { fetch: (url, init) => new Promise((_, rej) => init.signal.addEventListener("abort", () => rej(init.signal.reason))) };
  assert.deepEqual(await M.sendSolapiOnce(ACC, MSGS.sms, { fetch: hang.fetch, deadlineMs: 50 }), { outcome: "unknown", httpCalls: 1, reason: "network" });
  const slowBody = {
    fetch: async (url, init) => new Response(new ReadableStream({
      start(c) { c.enqueue(new TextEncoder().encode("{")); init.signal.addEventListener("abort", () => c.error(init.signal.reason)); },
    }), { status: 200 }),
  };
  assert.deepEqual(await M.sendSolapiOnce(ACC, MSGS.sms, { fetch: slowBody.fetch, deadlineMs: 50 }), { outcome: "unknown", httpCalls: 1, reason: "bad_response" });
});

test("요청 전 검증 실패는 HTTP 0번·rejected(precheck): 키·번호·본문·채널·템플릿", async () => {
  const bad = [
    [{ ...ACC, api_key: "" }, MSGS.sms],
    [{ ...ACC, api_secret: "" }, MSGS.sms],
    [ACC, { ...MSGS.sms, to: " " }],
    [ACC, { ...MSGS.sms, to: "010 1111 2222" }],
    [{ ...ACC, sender_phone: "" }, MSGS.sms],
    [ACC, { ...MSGS.sms, text: "" }],
    [{ ...ACC, kakao_pf_id: null }, MSGS.alimtalk],
    [{ ...ACC, kakao_pf_id: null }, MSGS.friendtalk],
    [ACC, { ...MSGS.alimtalk, templateId: "" }],
  ];
  for (const [acc, msg] of bad) {
    const st = queue(() => json(200, OK));
    assert.deepEqual(await M.sendSolapiOnce(acc, msg, { fetch: st.fetch }), { outcome: "rejected", httpCalls: 0, reason: "precheck" });
    assert.equal(st.calls, 0);
  }
});

test("전역 fetch를 쓰지 않는다(인자로 받은 fetch만)", async () => {
  let globalCalls = 0;
  globalThis.fetch = async () => { globalCalls++; return json(200, OK); };
  const st = queue(() => json(200, OK));
  await M.sendSolapiOnce(ACC, MSGS.sms, { fetch: st.fetch });
  assert.equal(globalCalls, 0);
  assert.equal(st.calls, 1);
});

// ── P2(Mac msg_48b92d818766): 실패 목록 스키마·모순 응답은 unknown ─────────────────────────────────────
const FAILED_ITEM = ALL_FAILED.failedMessageList[0];
const withFailed = (list, count = { registeredFailed: 1, registeredSuccess: 0 }) =>
  ({ failedMessageList: list, groupInfo: { count: { ...OK.groupInfo.count, ...count } } });
for (const [name, body] of [
  ["실패 목록 null", withFailed(null)],
  ["실패 목록 항목이 숫자", withFailed([1])],
  ["실패 목록 항목이 빈 객체", withFailed([{}])],
  ["실패 목록 항목 필수 필드 누락(statusCode)", withFailed([{ ...FAILED_ITEM, statusCode: undefined }])],
  ["실패 목록 항목 필드 타입 이상(messageId 숫자)", withFailed([{ ...FAILED_ITEM, messageId: 7 }])],
  ["실패 목록 2개인데 registeredFailed 1", withFailed([FAILED_ITEM, FAILED_ITEM])],
  ["2xx 접수 성공 개수 + 오류 봉투 공존", { ...OK, errorCode: "X", errorMessage: "y" }],
  ["2xx 접수 실패 + 오류 봉투 공존", { ...ALL_FAILED, errorCode: "X" }],
  ["2xx 접수 성공인데 실패 목록 항목 있음", withFailed([FAILED_ITEM], { registeredFailed: 0, registeredSuccess: 1 })],
]) {
  test(`2xx 모순·스키마 위반: ${name} → unknown(bad_response), HTTP 1번`, async () => {
    const st = queue(() => json(200, body));
    assert.deepEqual(await M.sendSolapiOnce(ACC, MSGS.sms, { fetch: st.fetch }), { outcome: "unknown", httpCalls: 1, reason: "bad_response" });
    assert.equal(st.calls, 1);
  });
}
for (const [name, body] of [
  ["400 오류 봉투 + 접수 성공 개수 공존", { errorCode: "X", errorMessage: "y", ...OK }],
  ["400 오류 봉투 + 실패 목록 공존", { errorCode: "X", errorMessage: "y", failedMessageList: [] }],
  ["400 errorCode만", { errorCode: "X" }],
  ["400 errorCode 숫자", { errorCode: 1, errorMessage: "y" }],
]) {
  test(`4xx 모순·불완전: ${name} → unknown, HTTP 1번`, async () => {
    const st = queue(() => json(400, body));
    assert.deepEqual(await M.sendSolapiOnce(ACC, MSGS.sms, { fetch: st.fetch }), { outcome: "unknown", httpCalls: 1, reason: "bad_response" });
  });
}
test("회귀: 공식 실패 항목(customFields 포함) 1개 + 개수 일치 → rejected, 정상 성공 → sent, 공식 오류 봉투 400 → rejected", async () => {
  let st = queue(() => json(200, withFailed([{ ...FAILED_ITEM, customFields: { a: "b" } }])));
  assert.equal((await M.sendSolapiOnce(ACC, MSGS.alimtalk, { fetch: st.fetch })).outcome, "rejected");
  st = queue(() => json(200, OK));
  assert.equal((await M.sendSolapiOnce(ACC, MSGS.friendtalk, { fetch: st.fetch })).outcome, "sent");
  st = queue(s400);
  assert.equal((await M.sendSolapiOnce(ACC, MSGS.sms, { fetch: st.fetch })).outcome, "rejected");
});
test("실패 항목 customFields 타입 이상 → unknown", async () => {
  const st = queue(() => json(200, withFailed([{ ...FAILED_ITEM, customFields: { a: 1 } }])));
  assert.equal((await M.sendSolapiOnce(ACC, MSGS.sms, { fetch: st.fetch })).outcome, "unknown");
});
