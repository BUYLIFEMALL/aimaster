// 공용 발행 엔진 시험 — 가짜 응답(fetch 대역)만 사용, 실제 사이트·구글 호출 없음
import test from "node:test";
import assert from "node:assert/strict";
import * as wp from "../src/lib/publish/wordpress.ts";
import * as bl from "../src/lib/publish/blogger.ts";
import { PublishError } from "../src/lib/publish/types.ts";

const NOW = Date.parse("2026-11-10T00:00:00Z");
const json = (status, body) => new Response(body === undefined ? "" : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** 순서대로 응답을 돌려주는 가짜 fetch. calls에 요청을 남긴다. */
function fakeFetch(handlers) {
  const calls = [];
  const fn = async (url, init = {}) => {
    calls.push({ url, method: init.method || "GET", headers: init.headers || {}, body: init.body });
    const h = handlers.shift();
    if (!h) throw new Error(`예상하지 않은 요청: ${init.method} ${url}`);
    return typeof h === "function" ? h(url, init) : h;
  };
  fn.calls = calls;
  return fn;
}
const ROOT_OK = () => json(200, { namespaces: ["oembed/1.0", "wp/v2"] });
const conn = () => ({ siteUrl: "blog.example.com/wp-admin/", username: "owner", appPassword: "abcd efgh ijkl" });

// ── 워드프레스 ──
test("WP01 사이트 주소 정리: https 붙이기·wp-admin 제거, http는 거절", () => {
  assert.equal(wp.normalizeSiteUrl("blog.example.com/wp-admin/"), "https://blog.example.com");
  assert.equal(wp.normalizeSiteUrl("https://ex.com/sub/wp-json/"), "https://ex.com/sub");
  assert.throws(() => wp.normalizeSiteUrl("http://ex.com"), (e) => e instanceof PublishError && e.code === "bad_request");
});

test("WP02 /wp-json이 막히면 ?rest_route= 방식으로 찾음", async () => {
  const f = fakeFetch([new Response("<html>404</html>", { status: 404 }), ROOT_OK]);
  assert.equal(await wp.discoverRestStyle("ex.com", { fetchImpl: f }), "query");
  assert.match(f.calls[1].url, /\?rest_route=%2F$/);
});

test("WP03 연결 확인: Basic 인증 머리글·발행 권한", async () => {
  const f = fakeFetch([ROOT_OK, json(200, { id: 3, name: "주인", capabilities: { publish_posts: true } })]);
  const a = await wp.verifyConnection(conn(), { fetchImpl: f });
  assert.deepEqual(a, { userId: 3, name: "주인", canPublish: true, restStyle: "path" });
  assert.equal(f.calls[1].headers.Authorization, `Basic ${Buffer.from("owner:abcd efgh ijkl").toString("base64")}`);
  assert.match(f.calls[1].url, /\/wp-json\/wp\/v2\/users\/me\?context=edit$/);
});

test("WP04 호스팅이 인증 머리글을 지우면 전용 안내(auth_header_stripped)", async () => {
  const f = fakeFetch([ROOT_OK, json(401, { code: "rest_not_logged_in", message: "You are not currently logged in." })]);
  await assert.rejects(wp.verifyConnection(conn(), { fetchImpl: f }), (e) => e.code === "auth_header_stripped");
});

test("WP05 비밀번호 틀림은 auth", async () => {
  const f = fakeFetch([ROOT_OK, json(401, { code: "incorrect_password", message: "bad" })]);
  await assert.rejects(wp.verifyConnection(conn(), { fetchImpl: f }), (e) => e.code === "auth");
});

test("WP06 세 가지 방식의 status 값과 결과", async () => {
  for (const [mode, sent, back, want] of [["draft", "draft", "draft", "draft"], ["publish", "publish", "publish", "published"], ["schedule", "future", "future", "scheduled"]]) {
    const f = fakeFetch([ROOT_OK, json(201, { id: 77, status: back, link: "https://blog.example.com/?p=77", date_gmt: "2026-11-11T01:00:00" })]);
    const r = await wp.createPost(conn(), { title: "제목", html: "<p>본문</p>", mode, scheduledAt: "2026-11-11T01:00:00Z", tags: [], tagIds: [5], categoryIds: [2] }, { fetchImpl: f, now: () => NOW });
    const body = JSON.parse(f.calls[1].body);
    assert.equal(body.status, sent);
    assert.deepEqual(body.tags, [5]);
    assert.deepEqual(body.categories, [2]);
    if (mode === "schedule") assert.equal(body.date_gmt, "2026-11-11T01:00:00");
    else assert.equal(body.date_gmt, undefined);
    assert.equal(r.status, want);
    assert.equal(r.remoteId, "77");
    assert.equal(r.scheduledAt, mode === "schedule" ? "2026-11-11T01:00:00Z" : null);
  }
});

test("WP07 예약 시각이 5분 안이면 보내지 않고 거절", async () => {
  const f = fakeFetch([]);
  await assert.rejects(wp.createPost(conn(), { title: "t", html: "<p>b</p>", mode: "schedule", scheduledAt: "2026-11-10T00:02:00Z" }, { fetchImpl: f, now: () => NOW }), (e) => e.code === "bad_request");
  assert.equal(f.calls.length, 0);
});

test("WP08 글 만들기 중 서버 오류·응답 지연은 uncertain(재시도 금지 신호)", async () => {
  const f1 = fakeFetch([ROOT_OK, json(500, { code: "internal", message: "x" })]);
  await assert.rejects(wp.createPost(conn(), { title: "t", html: "<p>b</p>", mode: "publish" }, { fetchImpl: f1 }), (e) => e.code === "uncertain");
  const abort = () => { const e = new Error("aborted"); e.name = "AbortError"; throw e; };
  const f2 = fakeFetch([ROOT_OK, abort]);
  await assert.rejects(wp.createPost(conn(), { title: "t", html: "<p>b</p>", mode: "publish" }, { fetchImpl: f2 }), (e) => e.code === "uncertain");
});

test("WP09 연결 자체가 안 되면 network(전송 전 실패)", async () => {
  const refused = () => { const e = new TypeError("fetch failed"); e.cause = { code: "ECONNREFUSED" }; throw e; };
  const f = fakeFetch([ROOT_OK, refused]);
  await assert.rejects(wp.createPost(conn(), { title: "t", html: "<p>b</p>", mode: "draft" }, { fetchImpl: f }), (e) => e.code === "network");
});

test("WP10 태그: 있으면 그 ID, 없으면 만들기, 이미 있다는 오류면 다시 찾기", async () => {
  const f = fakeFetch([
    ROOT_OK,
    json(200, [{ id: 1, name: "캠핑" }]),
    json(200, []), json(201, { id: 9 }),
    json(200, [{ id: 2, name: "가을 여행" }]),
    json(200, [{ id: 3, name: "준비물 목록" }]), json(400, { code: "term_exists", message: "exists" }), json(200, [{ id: 4, name: "준비물" }]),
  ]);
  const ids = await wp.resolveTagIds(conn(), ["캠핑", "새태그", "가을 여행 ", "준비물"], { fetchImpl: f });
  assert.deepEqual(ids, [1, 9, 2, 4]);
});

// ── 구글 블로그 ──
const TOKEN = "tok";

test("BL01 초안은 isDraft=true, 결과 draft", async () => {
  const f = fakeFetch([json(200, { id: "p1", status: "DRAFT", url: "https://x.blogspot.com/p1" })]);
  const r = await bl.createPost(TOKEN, "b1", { title: "제목", html: '<p>본문<img src="https://img/1.jpg"></p>', mode: "draft", tags: ["캠핑", "캠핑", "가을,여행"] }, { fetchImpl: f });
  assert.match(f.calls[0].url, /\/blogs\/b1\/posts\?isDraft=true/);
  assert.equal(f.calls[0].headers.Authorization, "Bearer tok");
  assert.deepEqual(JSON.parse(f.calls[0].body).labels, ["캠핑", "가을 여행"]);
  assert.equal(r.status, "draft");
});

test("BL02 바로 발행은 isDraft=false, LIVE → published", async () => {
  const f = fakeFetch([json(200, { id: "p2", status: "LIVE", url: "https://x.blogspot.com/2026/11/a.html" })]);
  const r = await bl.createPost(TOKEN, "b1", { title: "t", html: "<p>b</p>", mode: "publish" }, { fetchImpl: f });
  assert.match(f.calls[0].url, /isDraft=false/);
  assert.equal(r.status, "published");
  assert.equal(r.url, "https://x.blogspot.com/2026/11/a.html");
});

test("BL03 예약은 초안 저장 → publishDate로 예약", async () => {
  const f = fakeFetch([json(200, { id: "p3", status: "DRAFT" }), json(200, { id: "p3", status: "SCHEDULED", published: "2026-11-11T01:00:00Z", url: "https://x.blogspot.com/p3" })]);
  const r = await bl.createPost(TOKEN, "b1", { title: "t", html: "<p>b</p>", mode: "schedule", scheduledAt: "2026-11-11T01:00:00Z" }, { fetchImpl: f, now: () => NOW });
  assert.match(f.calls[1].url, /\/posts\/p3\/publish\?publishDate=2026-11-11T01%3A00%3A00.000Z/);
  assert.equal(r.status, "scheduled");
  assert.equal(r.scheduledAt, "2026-11-11T01:00:00.000Z");
});

test("BL04 예약 걸기 실패 → 초안 정보(partial)와 함께 uncertain", async () => {
  const f = fakeFetch([json(200, { id: "p4", status: "DRAFT" }), json(503, { error: { code: 503, message: "backend" } })]);
  await assert.rejects(bl.createPost(TOKEN, "b1", { title: "t", html: "<p>b</p>", mode: "schedule", scheduledAt: "2026-11-11T01:00:00Z" }, { fetchImpl: f, now: () => NOW }), (e) => {
    assert.equal(e.code, "uncertain");
    assert.equal(e.partial?.remoteId, "p4");
    assert.equal(e.partial?.status, "draft");
    return true;
  });
});

test("BL05 https 아닌 이미지는 보내기 전에 거절", async () => {
  const f = fakeFetch([]);
  await assert.rejects(bl.createPost(TOKEN, "b1", { title: "t", html: '<img src="/local.png">', mode: "draft" }, { fetchImpl: f }), (e) => e.code === "bad_request");
  assert.equal(f.calls.length, 0);
});

test("BL06 토큰 만료 401은 auth, 권한 부족 403은 forbidden", async () => {
  const f1 = fakeFetch([json(401, { error: { code: 401, message: "Invalid Credentials" } })]);
  await assert.rejects(bl.listBlogs(TOKEN, { fetchImpl: f1 }), (e) => e.code === "auth");
  const f2 = fakeFetch([json(403, { error: { code: 403, message: "x", errors: [{ reason: "insufficientPermissions" }] } })]);
  await assert.rejects(bl.createPost(TOKEN, "b1", { title: "t", html: "<p>b</p>", mode: "draft" }, { fetchImpl: f2 }), (e) => e.code === "forbidden");
});

test("BL07 내 블로그 목록", async () => {
  const f = fakeFetch([json(200, { items: [{ id: "1", name: "내 블로그", url: "https://a.blogspot.com/" }] })]);
  assert.deepEqual(await bl.listBlogs(TOKEN, { fetchImpl: f }), [{ id: "1", name: "내 블로그", url: "https://a.blogspot.com/" }]);
  assert.match(f.calls[0].url, /\/users\/self\/blogs/);
});
