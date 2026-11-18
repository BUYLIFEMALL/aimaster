// ECOM-20261118-06 공용 「API 설정」 Cloudflare 2키 카드 — 모의 시험만(실제 Cloudflare·DB·키 쓰기 0).
// 실행: node --test tests/cloudflareKeys.test.mjs  (메인 루트에 tsx·jsdom이 없어, 이미 설치된 emotion-writer의 esbuild와 ai-work-workspace의 jsdom을 빌려 묶어 실행한다. 새 설치 0)
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const esbuild = createRequire(path.join(ROOT, "emotion-writer/package.json"))("esbuild");
// 묶은 파일은 저장소 node_modules/.cache(git 제외)에 둔다 — react를 루트 node_modules에서 같은 인스턴스로 찾게 하려고.
const OUT = path.join(ROOT, "node_modules", ".cache", "cfkeys-test");
fs.mkdirSync(OUT, { recursive: true });

// 모의 Supabase(쿼리 기록)
const MOCKS = path.join(OUT, "mocks.mjs");
fs.writeFileSync(MOCKS, `
export const state = { user: null, suspended: false, rows: [], calls: [] };
function builder(table) {
  const q = { table, filters: [] , op: null };
  const api = {
    select(c) { q.op = q.op || "select"; q.cols = c; return api; },
    eq(k, v) { q.filters.push(["eq", k, v]); return api; },
    in(k, v) { q.filters.push(["in", k, v]); return api; },
    upsert(rows, opt) { q.op = "upsert"; q.rows = rows; q.opt = opt; return api; },
    delete() { q.op = "delete"; return api; },
    maybeSingle() { q.single = true; return api; },
    then(res, rej) {
      state.calls.push(q);
      if (q.table === "profiles") return Promise.resolve({ data: state.user ? { is_suspended: state.suspended } : null, error: null }).then(res, rej);
      if (q.op === "select") return Promise.resolve({ data: state.rows, error: null }).then(res, rej);
      return Promise.resolve({ error: null }).then(res, rej);
    },
  };
  return api;
}
import { createClient as realSupabase } from "@supabase/supabase-js";
export async function createClient() { return { auth: { getUser: async () => ({ data: { user: state.user ? { id: state.user } : null } }) } }; }
// state.fetch가 있으면 진짜 supabase-js(PostgREST) 클라이언트에 가짜 통신을 주입한다(실제 네트워크 0).
export function createServiceClient() {
  if (state.fetch) return realSupabase("https://example.supabase.co", "service-test-key", { auth: { persistSession: false }, global: { fetch: state.fetch } });
  return { from: (t) => builder(t) };
}
`);

async function bundle(entry, name, extra = {}) {
  const outfile = path.join(OUT, name + ".mjs");
  await esbuild.build({
    entryPoints: [path.join(ROOT, entry)],
    bundle: true, platform: "node", format: "esm", outfile, jsx: "automatic", logLevel: "error",
    nodePaths: [path.join(ROOT, "node_modules")],
    define: { "process.env.NODE_ENV": '"development"' },
    external: ["react", "react-dom", "react-dom/client"],
    plugins: [{ name: "alias", setup(b) {
      // 모의 모듈은 묶지 않고 같은 파일을 공유(시험이 쿼리 기록을 볼 수 있게)
      b.onResolve({ filter: /^@\/lib\/supabase\/(server|service)$/ }, () => ({ path: pathToFileURL(MOCKS).href, external: true }));
      b.onResolve({ filter: /^@\// }, (a) => b.resolve(path.join(ROOT, a.path.slice(2)), { kind: a.kind, resolveDir: a.resolveDir }));
    } }],
    ...extra,
  });
  return import(pathToFileURL(outfile).href);
}

const lib = await bundle("lib/integrations/cloudflareKeys.ts", "lib");
const route = await bundle("app/api/user/cloudflare-keys/route.ts", "route");
const mocks = await import(pathToFileURL(MOCKS).href);
const ACC = "0123456789abcdef0123456789abcdef";
const U = "user-A";
const req = (method, { body, headers = {}, url = "https://www.buylife.xyz/api/user/cloudflare-keys" } = {}) =>
  new Request(url, {
    method,
    headers: { host: "www.buylife.xyz", origin: "https://www.buylife.xyz", "sec-fetch-site": "same-origin", "content-type": "application/json", "x-expected-user-id": U, ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });

function fakeDeps(over = {}) {
  const log = [];
  return {
    log,
    deps: {
      getUserId: async () => (over.user === undefined ? U : over.user),
      isSuspended: async () => (over.suspended === undefined ? false : over.suspended),
      store: {
        select: async (u) => (log.push(["select", u]), { data: over.rows ?? [{ provider: "cloudflare_account_id" }], error: over.selErr ?? null }),
        upsertPair: async (u, rows) => (log.push(["upsert", u, rows]), { error: over.upErr ?? null }),
        deletePair: async (u) => (log.push(["delete", u]), { error: over.delErr ?? null }),
      },
    },
  };
}
const run = (method, opts, over) => { const f = fakeDeps(over); return lib.handleCloudflareKeys(method, req(method, opts), f.deps).then(async (r) => ({ r, body: await r.text(), log: f.log })); };

test("검사: 두 값 필수·공백/제어문자/4096 초과/이메일형 계정 ID 거절, 정상은 trim", () => {
  assert.deepEqual(lib.validateCloudflarePair({ accountId: ` ${ACC} `, token: " tok " }), { accountId: ACC, token: "tok" });
  for (const b of [{}, { accountId: ACC }, { token: "t" }, { accountId: ACC, token: "a b" }, { accountId: ACC, token: "t\u0007" }, { accountId: ACC, token: "x".repeat(4097) }, { accountId: "me@example.com", token: "t" }, { accountId: ACC, token: 123 }, null]) {
    assert.throws(() => lib.validateCloudflarePair(b), (e) => e instanceof lib.CloudflareKeyError && e.status === 400);
  }
});

test("권한 경계: 비로그인 401·정지 403·정지 확인 실패 503·기대 회원 머리글 없음 400·다른 회원 409 — DB 접근 0", async () => {
  for (const [over, opts, code] of [[{ user: null }, {}, 401], [{ suspended: true }, {}, 403], [{ suspended: null }, {}, 503], [{}, { headers: { "x-expected-user-id": "" } }, 400], [{}, { headers: { "x-expected-user-id": "user-B" } }, 409]]) {
    for (const m of ["GET", "POST", "DELETE"]) {
      const { r, log } = await run(m, { ...opts, body: m === "POST" ? { accountId: ACC, token: "t" } : undefined }, over);
      assert.equal(r.status, code, `${m} ${code}`);
      assert.equal(log.length, 0);
    }
  }
});

test("CSRF: 쓰기 요청은 같은 사이트 Origin만, JSON만, 쿼리 파라미터 거절", async () => {
  const body = { accountId: ACC, token: "t" };
  assert.equal((await run("POST", { body, headers: { origin: "https://evil.example" } })).r.status, 403);
  assert.equal((await run("POST", { body, headers: { origin: "" } })).r.status, 403);
  assert.equal((await run("POST", { body, headers: { "sec-fetch-site": "cross-site" } })).r.status, 403);
  assert.equal((await run("DELETE", { headers: { origin: "https://evil.example" } })).r.status, 403);
  assert.equal((await run("POST", { body, headers: { "content-type": "text/plain" } })).r.status, 415);
  assert.equal((await run("POST", { body: "{not json" })).r.status, 400);
  assert.equal((await run("POST", { body: JSON.stringify({ accountId: ACC, token: "t".repeat(17000) }) })).r.status, 413);
  assert.equal((await run("DELETE", { url: "https://www.buylife.xyz/api/user/cloudflare-keys?provider=openai" })).r.status, 400);
});

test("CF-F02 본문 상한: UTF-8 바이트 16384 이하만 — ASCII 정확 16384 통과·+1 413, 다바이트(한글) 글자 수 이하라도 바이트 초과 413, 머리글 거짓·없음도 스트림 누적으로 차단, 깨진 JSON 400", async () => {
  const LIMIT = 16384;
  const make = (bytes, ch = "a") => {
    const base = { accountId: ACC, token: "t", pad: "" };
    const overhead = Buffer.byteLength(JSON.stringify(base));
    const per = Buffer.byteLength(ch);
    const n = Math.floor((bytes - overhead) / per);
    const s = JSON.stringify({ ...base, pad: ch.repeat(n) });
    return s + " ".repeat(bytes - Buffer.byteLength(s)); // 남는 바이트는 JSON 뒤 공백(유효)
  };
  const exact = make(LIMIT);
  assert.equal(Buffer.byteLength(exact), LIMIT);
  assert.equal((await run("POST", { body: exact })).r.status, 200);
  assert.equal((await run("POST", { body: make(LIMIT + 1) })).r.status, 413);
  const korean = make(30000, "가"); // 글자 수는 약 1만이지만 UTF-8로 30000바이트
  assert.ok(korean.length < LIMIT && Buffer.byteLength(korean) > LIMIT);
  assert.equal((await run("POST", { body: korean })).r.status, 413);
  assert.equal((await run("POST", { body: korean, headers: { "content-length": "10" } })).r.status, 413);
  assert.equal((await run("POST", { body: make(LIMIT + 5000), headers: { "content-length": String(LIMIT + 5000) } })).r.status, 413);
  assert.equal((await run("POST", { body: "{\"accountId\":" })).r.status, 400);
  // 상한 초과 거절은 저장 0
  assert.equal((await run("POST", { body: korean })).log.length, 0);
});

test("저장: 두 행을 한 번에(원자) 세션 회원 ID로만, 본문 user_id 무시, 응답에 값 없음", async () => {
  const { r, body, log } = await run("POST", { body: { accountId: ACC, token: "secret-token-value", user_id: "evil", userId: "evil" } });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("cache-control"), "private, no-store");
  assert.equal(log.length, 1);
  const [op, uid, rows] = log[0];
  assert.equal(op, "upsert");
  assert.equal(uid, U);
  assert.deepEqual(rows.map((x) => [x.user_id, x.provider]), [[U, "cloudflare_account_id"], [U, "cloudflare_workers_ai_token"]]);
  assert.ok(!body.includes("secret-token-value") && !body.includes(ACC));
  assert.deepEqual(JSON.parse(body), { registered: { accountId: true, token: true } });
  // 한 값만 오면 저장 0
  const partial = await run("POST", { body: { token: "only" } });
  assert.equal(partial.r.status, 400);
  assert.equal(partial.log.length, 0);
});

test("조회는 등록 여부 boolean만, 삭제는 두 값 한 번에, DB 오류는 고정 문구(원문 0)", async () => {
  const g = await run("GET", {}, { rows: [{ provider: "cloudflare_account_id", api_key: "LEAK" }] });
  assert.deepEqual(JSON.parse(g.body), { registered: { accountId: true, token: false } });
  assert.ok(!g.body.includes("LEAK"));
  const d = await run("DELETE", {});
  assert.deepEqual(d.log, [["delete", U]]);
  assert.deepEqual(JSON.parse(d.body), { registered: { accountId: false, token: false } });
  // 읽기 오류는 확정 실패(500), 쓰기 오류는 반영 여부를 모르므로 「결과 불명」(502, outcome unknown) — 실패 단정 문구 0
  const gx = await run("GET", {}, { selErr: { message: "RAW-DB-ERROR" } });
  assert.equal(gx.r.status, 500);
  assert.ok(!gx.body.includes("RAW-DB-ERROR"));
  for (const [m, over] of [["POST", { upErr: { message: "RAW-DB-ERROR" } }], ["DELETE", { delErr: { message: "RAW-DB-ERROR" } }]]) {
    const x = await run(m, { body: m === "POST" ? { accountId: ACC, token: "t" } : undefined }, over);
    assert.equal(x.r.status, 502);
    const b = JSON.parse(x.body);
    assert.equal(b.outcome, "unknown");
    assert.ok(/결과를 확인하지 못했습니다/.test(b.error) && !/저장하지 못했|해제하지 못했/.test(b.error));
    assert.ok(!x.body.includes("RAW-DB-ERROR"));
  }
});

test("실제 route.ts: 서비스 클라이언트 쿼리가 본인 user_id·허용 2 provider로만 묶이고, 저장은 upsert 1회·삭제 1회", async () => {
  mocks.state.user = U; mocks.state.suspended = false; mocks.state.rows = [{ provider: "cloudflare_workers_ai_token" }]; mocks.state.calls.length = 0;
  const g = await route.GET(req("GET"));
  assert.deepEqual(await g.json(), { registered: { accountId: false, token: true } });
  const sel = mocks.state.calls.find((c) => c.table === "user_api_keys" && c.op === "select");
  assert.ok(sel.filters.some(([t, k, v]) => t === "eq" && k === "user_id" && v === U));
  assert.ok(sel.filters.some(([t, k, v]) => t === "in" && k === "provider" && v.length === 2 && v.includes("cloudflare_account_id") && v.includes("cloudflare_workers_ai_token")));
  assert.ok(!String(sel.cols).includes("api_key"));
  mocks.state.calls.length = 0;
  const p = await route.POST(req("POST", { body: { accountId: ACC, token: "t" } }));
  assert.equal(p.status, 200);
  const ups = mocks.state.calls.filter((c) => c.op === "upsert");
  assert.equal(ups.length, 1);
  assert.equal(ups[0].rows.length, 2);
  assert.equal(ups[0].opt.onConflict, "user_id,provider");
  mocks.state.calls.length = 0;
  const d = await route.DELETE(req("DELETE"));
  assert.equal(d.status, 200);
  const del = mocks.state.calls.filter((c) => c.op === "delete");
  assert.equal(del.length, 1);
  assert.ok(del[0].filters.some(([t, k, v]) => t === "eq" && k === "user_id" && v === U));
  assert.ok(del[0].filters.some(([t, k, v]) => t === "in" && k === "provider" && v.length === 2));
  mocks.state.user = null;
  assert.equal((await route.GET(req("GET"))).status, 401);
});

test("실제 PostgREST(supabase-js+주입 통신): 쓰기 중 연결 초기화·503·읽을 수 없는 응답은 결과 불명, 정상은 성공, 읽기 실패는 확정", async () => {
  mocks.state.user = U;
  const mk = (writeMode, readMode = "ok") => async (url, init = {}) => {
    const u = String(url);
    const method = (init.method || "GET").toUpperCase();
    if (u.includes("/rest/v1/profiles")) return new Response(JSON.stringify({ is_suspended: false }), { status: 200, headers: { "content-type": "application/json" } });
    if (u.includes("/rest/v1/user_api_keys") && method === "GET") {
      if (readMode === "reset") throw new TypeError("fetch failed: ECONNRESET");
      return new Response(JSON.stringify([{ provider: "cloudflare_account_id" }, { provider: "cloudflare_workers_ai_token" }]), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (writeMode === "reset") throw new TypeError("fetch failed: ECONNRESET");
    if (writeMode === "503") return new Response("Service Unavailable", { status: 503 });
    if (writeMode === "badjson") return new Response("<html>oops</html>", { status: 500, headers: { "content-type": "application/json" } });
    return new Response(null, { status: method === "DELETE" ? 204 : 201 });
  };
  for (const mode of ["reset", "503", "badjson"]) {
    mocks.state.fetch = mk(mode);
    for (const [m, call] of [["POST", () => route.POST(req("POST", { body: { accountId: ACC, token: "t" } }))], ["DELETE", () => route.DELETE(req("DELETE"))]]) {
      const r = await call();
      const b = await r.json();
      assert.equal(r.status, 502, `${m} ${mode}`);
      assert.equal(b.outcome, "unknown");
      assert.ok(!/저장하지 못했|해제하지 못했/.test(b.error));
    }
  }
  mocks.state.fetch = mk("ok");
  assert.deepEqual(await (await route.POST(req("POST", { body: { accountId: ACC, token: "t" } }))).json(), { registered: { accountId: true, token: true } });
  assert.deepEqual(await (await route.DELETE(req("DELETE"))).json(), { registered: { accountId: false, token: false } });
  // 읽기 실패는 결과 불명이 아니라 확정 「불러오지 못함」
  mocks.state.fetch = mk("ok", "reset");
  const g = await route.GET(req("GET"));
  assert.equal(g.status, 500);
  assert.ok(/불러오지 못했습니다/.test((await g.json()).error));
  mocks.state.fetch = null;
});

// ── 화면(실제 CloudflareKeysCard, jsdom) ──
const { JSDOM } = createRequire(path.join(ROOT, "ai-work-workspace/package.json"))("jsdom");
const dom = new JSDOM("<!doctype html><body></body>", { url: "https://www.buylife.xyz/api-settings" });
for (const k of ["window", "document", "HTMLElement", "HTMLInputElement", "HTMLButtonElement", "Event", "Node", "MutationObserver"]) globalThis[k] = dom.window[k] ?? globalThis[k];
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const rq = createRequire(path.join(ROOT, "package.json"));
const React = rq("react");
const { createRoot } = rq("react-dom/client");
const { act } = React;
// 카드가 쓰는 의존성(lucide-react 등)이 require("react")를 써서, 화면만 CommonJS로 묶고 require로 불러온다(같은 react 인스턴스).
await esbuild.build({
  entryPoints: [path.join(ROOT, "components/settings/CloudflareKeysCard.tsx")],
  bundle: true, platform: "node", format: "cjs", outfile: path.join(OUT, "card.cjs"), jsx: "automatic", logLevel: "error",
  nodePaths: [path.join(ROOT, "node_modules")],
  define: { "process.env.NODE_ENV": '"development"' },
  external: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  plugins: [{ name: "alias", setup(b) {
    b.onResolve({ filter: /^@\// }, (a) => b.resolve(path.join(ROOT, a.path.slice(2)), { kind: a.kind, resolveDir: a.resolveDir }));
  } }],
});
const Card = createRequire(path.join(OUT, "x.cjs"))("./card.cjs").default;
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));
const text = (h) => h.textContent.replace(/\s+/g, " ");

function mount(element) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  return { host, root, render: (el) => act(async () => root.render(el)), done: () => (root.unmount(), host.remove()) };
}

test("화면: 회원 ID 없으면 요청 0, 있으면 기대 회원 머리글로 조회, 입력칸은 비어 있음(기존 값 채움 0)", async () => {
  const calls = [];
  globalThis.fetch = async (url, o = {}) => (calls.push([String(url), o]), Response.json({ registered: { accountId: true, token: true } }));
  const m = mount();
  await m.render(React.createElement(Card, { userId: "" }));
  await act(async () => tick(5));
  assert.equal(calls.length, 0);
  await m.render(React.createElement(Card, { userId: U }));
  await act(async () => tick(5));
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1].headers["x-expected-user-id"], U);
  // 「저장되어 있음」만 말하고 토큰 유효성은 주장하지 않는다
  assert.ok(text(m.host).includes("두 값 저장됨"));
  assert.ok(text(m.host).includes("토큰이 유효한지는 확인하지 않습니다"));
  for (const i of m.host.querySelectorAll("input")) assert.equal(i.value, "");
  m.done();
});

test("화면: 회원 전환 뒤 늦게 온 이전 회원 응답은 무시(StrictMode 포함)", async () => {
  let resolveA;
  globalThis.fetch = async (_u, o) => {
    if (o.headers["x-expected-user-id"] === U) return new Promise((r) => (resolveA = () => r(Response.json({ registered: { accountId: true, token: true } }))));
    return Response.json({ registered: { accountId: false, token: false } });
  };
  const m = mount();
  await m.render(React.createElement(React.StrictMode, null, React.createElement(Card, { userId: U })));
  await m.render(React.createElement(React.StrictMode, null, React.createElement(Card, { userId: "user-B" })));
  await act(async () => tick(5));
  await act(async () => { resolveA?.(); await tick(5); });
  assert.ok(text(m.host).includes("저장된 값 없음"));
  assert.ok(!text(m.host).includes("두 값 저장됨"));
  m.done();
});

test("화면: 저장 중복 클릭은 1회, 응답 유실은 「결과 확인 못함」·자동 재전송 0, 읽기 실패 안내", async () => {
  let posts = 0;
  let release;
  globalThis.fetch = async (_u, o = {}) => {
    if (o.method === "POST") { posts++; return new Promise((_, rej) => (release = () => rej(new TypeError("network")))); }
    return Response.json({ registered: { accountId: false, token: false } });
  };
  const m = mount();
  await m.render(React.createElement(Card, { userId: U }));
  await act(async () => tick(5));
  const [acc, tok] = m.host.querySelectorAll("input");
  const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); };
  await act(async () => { set(acc, ACC); set(tok, "tok"); });
  const save = [...m.host.querySelectorAll("button")].find((b) => b.textContent.includes("저장"));
  await act(async () => { save.click(); save.click(); await tick(5); });
  assert.equal(posts, 1);
  await act(async () => { release(); await tick(10); });
  assert.ok(text(m.host).includes("결과를 확인하지 못했습니다"));
  // 결과 불명 뒤: 입력한 비밀값을 지우고, 자동 재전송 0, 명시 「등록 상태 다시 확인」 버튼
  for (const i of m.host.querySelectorAll("input")) assert.equal(i.value, "");
  await act(async () => tick(20));
  assert.equal(posts, 1);
  let gets = 0;
  globalThis.fetch = async (_u, o = {}) => { if (!o.method || o.method === "GET") gets++; return Response.json({ registered: { accountId: true, token: true } }); };
  const recheck = [...m.host.querySelectorAll("button")].find((b) => b.textContent.includes("등록 상태 다시 확인"));
  assert.ok(recheck);
  await act(async () => { recheck.click(); await tick(10); });
  assert.equal(gets, 1);
  // 재확인 결과는 「지금 저장된 상태」로만 — 원래 요청이 반영됐다고 단정하지 않음
  assert.ok(text(m.host).includes("두 값 저장됨"));
  assert.ok(!/저장했습니다|반영되었습니다|저장에 성공/.test(text(m.host)));
  m.done();
  // 서버가 결과 불명(502 outcome unknown)을 돌려준 경우도 같은 처리
  globalThis.fetch = async (_u, o = {}) => (o.method === "POST" ? Response.json({ outcome: "unknown", error: "저장 결과를 확인하지 못했습니다." }, { status: 502 }) : Response.json({ registered: { accountId: false, token: false } }));
  const m3 = mount();
  await m3.render(React.createElement(Card, { userId: U }));
  await act(async () => tick(5));
  const [a3, t3] = m3.host.querySelectorAll("input");
  await act(async () => { set(a3, ACC); set(t3, "tok"); });
  await act(async () => { [...m3.host.querySelectorAll("button")].find((b) => b.textContent.includes("저장")).click(); await tick(10); });
  assert.ok(text(m3.host).includes("결과를 확인하지 못했습니다"));
  for (const i of m3.host.querySelectorAll("input")) assert.equal(i.value, "");
  assert.ok([...m3.host.querySelectorAll("button")].some((b) => b.textContent.includes("등록 상태 다시 확인")));
  m3.done();
  // 읽기 실패
  globalThis.fetch = async () => new Response("{}", { status: 500 });
  const m2 = mount();
  await m2.render(React.createElement(Card, { userId: U }));
  await act(async () => tick(5));
  assert.ok(text(m2.host).includes("등록 상태를 불러오지 못했습니다"));
  m2.done();
});
