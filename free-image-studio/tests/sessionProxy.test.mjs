import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { sessionProxy } from "../src/lib/sessionProxy.ts";
import { loginFlow, safeInternalPath } from "../src/lib/loginFlow.ts";

// ── 모의 요청·응답: NextRequest처럼 cookies.set이 요청의 cookie 헤더를 함께 고친다 ──
function fakeRequest({ cookie = "", path = "/jobs", search = "?tab=1", extra = {} } = {}) {
  const headers = new Headers({ host: "free-image-studio.buylife.xyz", ...extra });
  const jar = new Map(cookie ? cookie.split("; ").map((p) => p.split("=")) : []);
  const sync = () => (jar.size ? headers.set("cookie", [...jar].map(([k, v]) => `${k}=${v}`).join("; ")) : headers.delete("cookie"));
  sync();
  return { headers, nextUrl: { pathname: path, search }, cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), set: (n, v) => (jar.set(n, v), sync()) } };
}
function fakeNext() {
  const made = [];
  const next = (headers) => {
    const res = { forwarded: headers, headers: new Headers(), setCookies: [], cookies: { set: (name, value, options) => res.setCookies.push({ name, value, options }) } };
    made.push(res);
    return res;
  };
  return { next, made };
}
const SSR_CACHE = { "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0", Expires: "0", Pragma: "no-cache" };

test("갱신 없음: 쿠키·캐시 헤더를 건드리지 않고 현재 경로만 넘긴다(밖에서 보낸 x-pathname은 덮어씀)", async () => {
  const req = fakeRequest({ cookie: "sb-a=old", extra: { "x-pathname": "/admin" } });
  const { next, made } = fakeNext();
  const res = await sessionProxy(req, { next, refresh: async (c) => void c.getAll() });
  assert.equal(made.length, 1, "응답은 한 번만 만든다");
  assert.equal(res.forwarded.get("x-pathname"), "/jobs?tab=1");
  assert.equal(res.forwarded.get("cookie"), "sb-a=old");
  assert.deepEqual(res.setCookies, []);
  assert.equal(res.headers.get("cache-control"), null, "세션 쿠키를 싣지 않는 응답에는 캐시 헤더를 덧붙이지 않는다");
});

test("갱신됨: 다음 단계로 넘기는 cookie 헤더가 새 값이고, 응답에 Set-Cookie와 캐시 헤더가 함께 실린다", async () => {
  const req = fakeRequest({ cookie: "sb-a=old; other=1" });
  const { next, made } = fakeNext();
  const res = await sessionProxy(req, {
    next,
    cookieDomain: ".buylife.xyz",
    refresh: async (c) => c.setAll([{ name: "sb-a", value: "new", options: { path: "/", httpOnly: true } }, { name: "sb-b", value: "chunk", options: { path: "/" } }], SSR_CACHE),
  });
  assert.equal(made.length, 1);
  // 서버 쪽(같은 요청의 레이아웃 getUser)이 읽을 값
  assert.equal(res.forwarded.get("cookie"), "sb-a=new; other=1; sb-b=chunk");
  assert.equal(res.forwarded.get("x-pathname"), "/jobs?tab=1");
  assert.deepEqual(req.cookies.getAll().find((c) => c.name === "sb-a"), { name: "sb-a", value: "new" });
  // 브라우저 쪽 응답
  assert.deepEqual(res.setCookies, [
    { name: "sb-a", value: "new", options: { path: "/", httpOnly: true, domain: ".buylife.xyz" } },
    { name: "sb-b", value: "chunk", options: { path: "/", domain: ".buylife.xyz" } },
  ]);
  assert.equal(res.headers.get("cache-control"), SSR_CACHE["Cache-Control"]);
  assert.equal(res.headers.get("expires"), "0");
  assert.equal(res.headers.get("pragma"), "no-cache");
});

test("캐시 헤더가 없거나 약하면 private·no-store로 막고, 쿠키 도메인이 없으면 도메인을 붙이지 않는다", async () => {
  for (const given of [undefined, {}, { "Cache-Control": "public, max-age=60" }, { "Cache-Control": "no-store" }]) {
    const { next } = fakeNext();
    const res = await sessionProxy(fakeRequest(), { next, refresh: async (c) => c.setAll([{ name: "sb-a", value: "v", options: { path: "/" } }], given) });
    const cc = res.headers.get("cache-control");
    assert.match(cc, /\bprivate\b/, JSON.stringify(given));
    assert.match(cc, /\bno-store\b/, JSON.stringify(given));
    assert.deepEqual(res.setCookies, [{ name: "sb-a", value: "v", options: { path: "/" } }]);
  }
});

test("setAll이 여러 번 불려도 쿠키를 잃지 않고 같은 이름은 마지막 값만 싣는다", async () => {
  const { next } = fakeNext();
  const res = await sessionProxy(fakeRequest({ cookie: "sb-a=old" }), {
    next,
    refresh: async (c) => {
      c.setAll([{ name: "sb-a", value: "one" }, { name: "sb-x", value: "keep" }], SSR_CACHE);
      c.setAll([{ name: "sb-a", value: "two" }]);
    },
  });
  assert.deepEqual(res.setCookies.map((c) => `${c.name}=${c.value}`).sort(), ["sb-a=two", "sb-x=keep"]);
  assert.equal(res.forwarded.get("cookie"), "sb-a=two; sb-x=keep");
  assert.match(res.headers.get("cache-control"), /no-store/);
});

test("실제 Next 요청·응답 클래스로도 같은 결과(설치된 곳이 있을 때만)", async (t) => {
  const file = fileURLToPath(new URL("../../emotion-writer/node_modules/next/server.js", import.meta.url));
  if (!existsSync(file)) return t.skip("이 장비에 설치된 Next가 없음");
  const { NextRequest, NextResponse } = (await import(pathToFileURL(file).href)).default ?? (await import(pathToFileURL(file).href));
  const req = new NextRequest("https://free-image-studio.buylife.xyz/jobs?tab=1", { headers: { cookie: "sb-a=old; other=1", "x-pathname": "/admin" } });
  const res = await sessionProxy(req, {
    next: (headers) => NextResponse.next({ request: { headers } }),
    cookieDomain: ".buylife.xyz",
    refresh: async (c) => c.setAll([{ name: "sb-a", value: "new", options: { path: "/", httpOnly: true } }], SSR_CACHE),
  });
  // Next는 다음 단계로 넘길 요청 헤더를 x-middleware-request-* 로 싣는다
  assert.equal(res.headers.get("x-middleware-request-x-pathname"), "/jobs?tab=1");
  assert.match(res.headers.get("x-middleware-request-cookie"), /sb-a=new/);
  assert.doesNotMatch(res.headers.get("x-middleware-request-cookie"), /sb-a=old/);
  const setCookie = res.headers.getSetCookie().join("\n");
  assert.match(setCookie, /sb-a=new/);
  assert.match(setCookie, /Domain=\.buylife\.xyz/i);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(res.headers.get("cache-control"), /private.*no-store/);
  assert.equal(res.headers.get("pragma"), "no-cache");
});

test("연결: proxy.ts는 본체를 그대로 부르고, 로그인 액션은 loginFlow 하나로만 돌아갈 곳을 정한다", async () => {
  const proxy = await readFile(new URL("../src/proxy.ts", import.meta.url), "utf8");
  assert.match(proxy, /return sessionProxy\(request, \{/);
  assert.match(proxy, /NextResponse\.next\(\{ request: \{ headers \} \}\)/);
  assert.match(proxy, /\{ cookies \}/, "Supabase에 본체의 getAll·setAll을 그대로 넘긴다");
  assert.ok(!/response\.cookies|request\.cookies/.test(proxy), "쿠키를 직접 만지는 코드가 따로 없다");
  const action = await readFile(new URL("../src/lib/actions/auth.ts", import.meta.url), "utf8");
  assert.match(action, /await loginFlow\(/);
  assert.match(action, /redirect\(result\.redirectTo\)/);
  assert.ok(!/sanitizeRedirect|startsWith\(/.test(action), "액션 안에 별도 경로 검사가 없다");
  assert.equal((action.match(/redirect\(/g) ?? []).length, 2, "로그인 성공과 로그아웃 두 곳뿐");
  const page = await readFile(new URL("../src/app/login/page.tsx", import.meta.url), "utf8");
  assert.match(page, /return signInAction\(state, form\)/);
});

test("돌아갈 곳: 같은 출처의 내부 경로만, 모호하면 「/」", () => {
  const ok = { "/": "/", "/jobs": "/jobs", "/jobs?x=1&y=%2F#top": "/jobs?x=1&y=%2F#top", "/a/../jobs": "/jobs", "/create?next=https://evil.example": "/create?next=https://evil.example" };
  for (const [input, out] of Object.entries(ok)) assert.equal(safeInternalPath(input), out, input);
  const bad = [null, undefined, 1, {}, "", "jobs", "https://evil.example", "//evil.example", "/\\evil.example", "/\\/evil.example", "\\\\evil.example", "/\t/evil.example", "/\n/evil.example", " /jobs", "/jobs ", "/a b", "javascript:alert(1)", "/\u0000", `/${"a".repeat(3000)}`];
  for (const input of bad) assert.equal(safeInternalPath(input), "/", JSON.stringify(input));
  // 정규화 뒤에도 바깥으로 나가지 않는다
  for (const input of ["/..//evil.example", "/.//evil.example", "/%2F%2Fevil.example"]) {
    const out = safeInternalPath(input);
    assert.ok(out.startsWith("/"), input);
    assert.equal(new URL(out, "https://free-image-studio.buylife.xyz").origin, "https://free-image-studio.buylife.xyz", `${input} → ${out}`);
  }
});

test("로그인 흐름: 정상은 검증된 경로로, 거절은 오류만(이동 없음)", async () => {
  const calls = [];
  const okSignIn = async (e, p) => (calls.push([e, p]), false);
  assert.deepEqual(await loginFlow({ email: " a@b.co ", password: "pw", redirect: "/jobs?x=1" }, okSignIn), { redirectTo: "/jobs?x=1" });
  assert.deepEqual(calls, [["a@b.co", "pw"]], "이메일은 다듬고 비밀번호는 그대로");
  for (const redirect of ["https://evil.example", "//evil.example", "/\\evil.example", null, ""]) assert.deepEqual(await loginFlow({ email: "a@b.co", password: "pw", redirect }, okSignIn), { redirectTo: "/" });
  // 거절: 잘못된 비밀번호 — 돌아갈 곳이 있어도 이동하지 않는다
  assert.deepEqual(await loginFlow({ email: "a@b.co", password: "bad", redirect: "/jobs" }, async () => true), { error: "이메일 또는 비밀번호가 올바르지 않습니다." });
  // 거절: 빈 값·문자열이 아닌 값 — 로그인 호출 자체를 하지 않는다
  let called = 0;
  for (const form of [{ email: "", password: "pw" }, { email: "a@b.co", password: "" }, { email: null, password: null }, { email: {}, password: "pw" }]) {
    assert.deepEqual(await loginFlow({ ...form, redirect: "/jobs" }, async () => (called++, false)), { error: "이메일과 비밀번호를 모두 입력해주세요." });
  }
  assert.equal(called, 0);
});
