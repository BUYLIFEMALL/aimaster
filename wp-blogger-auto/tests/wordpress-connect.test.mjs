import { test } from "node:test";
import assert from "node:assert/strict";
import { connectWordpress, loadWordpressConnection, disconnectWordpress, connectErrorView, safeFetchImpl } from "../src/lib/wordpressConnect.ts";
import { PublishError } from "../src/lib/publish/types.ts";

// 가짜 DB — 실제 DB 쓰기 없음
function fakeAdmin(rows = []) {
  const ops = [];
  return {
    rows, ops,
    from(table) {
      const f = []; let op = "select", values = null;
      const q = {
        select() { return q; }, eq(k, v) { f.push([k, v]); return q; }, in(k, v) { f.push([k, v, "in"]); return q; },
        order() { return q; }, limit() { return q; },
        upsert(v) { op = "upsert"; values = v; return finish(false); },
        delete() { op = "delete"; return q; },
        maybeSingle() { return finish(true); },
        then(res, rej) { return finish(false).then(res, rej); },
      };
      async function finish(single) {
        const match = (r) => f.every(([k, v, m]) => (m === "in" ? v.includes(r[k]) : r[k] === v));
        const tbl = table === "member_platform_accounts" ? rows : [];
        if (op === "upsert") { ops.push({ table, op, values }); rows.push({ id: "acc-1", ...values }); return { error: null }; }
        const hit = tbl.filter(match);
        if (op === "delete") { ops.push({ table, op, f }); for (const h of hit) rows.splice(rows.indexOf(h), 1); return { data: hit.map((h) => ({ id: h.id })), error: null }; }
        return { data: single ? hit[0] ?? null : hit, error: null };
      }
      return q;
    },
  };
}

function wpFetch({ me = { id: 7, name: "관리자", capabilities: { publish_posts: true } }, meStatus = 200, meBody } = {}) {
  const calls = [];
  const fn = async (url, init = {}) => {
    calls.push({ url, auth: init.headers?.Authorization });
    if (url.endsWith("/wp-json/")) return Response.json({ namespaces: ["wp/v2"] });
    if (url.includes("/wp/v2/users/me")) return Response.json(meBody ?? me, { status: meStatus });
    if (url.includes("/wp/v2/categories")) return Response.json([{ id: 1, name: "미분류", parent: 0 }, { id: 5, name: "캠핑", parent: 0 }]);
    throw new Error("unexpected " + url);
  };
  return { fn, calls };
}

const INPUT = { siteUrl: "myblog.co.kr/wp-admin/", username: "admin", appPassword: "abcd efgh ijkl mnop qrst uvwx" };

test("WC01 연결 성공 — 공용 표에 회원 본인 줄로 저장, 비밀번호 띄어쓰기 제거, 카테고리 반환", async () => {
  const admin = fakeAdmin(); const { fn, calls } = wpFetch();
  const r = await connectWordpress(admin, "user-a", INPUT, { fetchImpl: fn });
  assert.equal(r.siteUrl, "https://myblog.co.kr");
  assert.equal(r.categories.length, 2);
  const saved = admin.ops.find((o) => o.op === "upsert").values;
  assert.equal(saved.user_id, "user-a"); assert.equal(saved.platform, "wordpress");
  assert.equal(saved.external_id, "https://myblog.co.kr#7"); assert.equal(saved.access_token, "abcdefghijklmnopqrstuvwx");
  assert.equal(saved.auth_method, "app_password"); assert.equal(saved.connected_via, "wp-blogger-auto");
  assert.equal(saved.extra.site_url, "https://myblog.co.kr"); assert.equal(saved.extra.rest_style, "path");
  assert.ok(calls.filter((c) => c.url.includes("/wp/v2/")).every((c) => c.auth?.startsWith("Basic ")));
});

test("WC02 발행 권한 없는 계정은 저장하지 않음", async () => {
  const admin = fakeAdmin(); const { fn } = wpFetch({ me: { id: 9, name: "구독자", capabilities: {} } });
  await assert.rejects(() => connectWordpress(admin, "user-a", INPUT, { fetchImpl: fn }), (e) => e instanceof PublishError && e.code === "forbidden");
  assert.equal(admin.ops.length, 0);
});

test("WC03 호스팅이 인증 머리글을 지우면 .htaccess 안내", async () => {
  const admin = fakeAdmin(); const { fn } = wpFetch({ meStatus: 401, meBody: { code: "rest_not_logged_in", message: "You are not currently logged in." } });
  const err = await connectWordpress(admin, "user-a", INPUT, { fetchImpl: fn }).catch((e) => e);
  const v = connectErrorView(err);
  assert.equal(v.code, "auth_header_stripped"); assert.equal(v.htaccessHint, true); assert.equal(v.status, 401);
  assert.equal(admin.ops.length, 0);
});

test("WC04 https 아닌 주소·짧은 비밀번호는 요청 전에 거절", async () => {
  const admin = fakeAdmin(); let called = 0; const fn = async () => { called++; throw new Error("x"); };
  await assert.rejects(() => connectWordpress(admin, "u", { ...INPUT, siteUrl: "http://myblog.co.kr" }, { fetchImpl: fn }), /https/);
  await assert.rejects(() => connectWordpress(admin, "u", { ...INPUT, appPassword: "short" }, { fetchImpl: fn }), /응용 비밀번호/);
  assert.equal(called, 0);
});

test("WC05 내부·사설 주소는 안전 요청이 막음(요청 나가지 않음)", async () => {
  for (const url of ["https://127.0.0.1/wp-json/", "https://localhost/wp-json/", "https://10.0.0.5/wp-json/", "https://169.254.169.254/latest/"]) {
    await assert.rejects(() => safeFetchImpl(url), (e) => e instanceof PublishError && e.code === "bad_request", url);
  }
});

test("WC06 저장된 연결 읽기 — 본인 것만, 없으면 null", async () => {
  const admin = fakeAdmin([{ id: "acc-9", user_id: "user-b", platform: "wordpress", external_id: "x", username: "b", access_token: "p", auth_method: "app_password", extra: { site_url: "https://b.com" }, needs_reconnect: false }]);
  assert.equal(await loadWordpressConnection(admin, "user-a"), null);
  const c = await loadWordpressConnection(admin, "user-b");
  assert.deepEqual({ ...c }, { accountId: "acc-9", siteUrl: "https://b.com", username: "b", appPassword: "p", restStyle: undefined });
});

test("WC07 연결 끊기는 본인·워드프레스 줄만", async () => {
  const admin = fakeAdmin([
    { id: "acc-1", user_id: "user-a", platform: "wordpress" },
    { id: "acc-2", user_id: "user-b", platform: "wordpress" },
  ]);
  assert.equal(await disconnectWordpress(admin, "user-a", "acc-2"), false);
  assert.equal(admin.rows.length, 2);
  assert.equal(await disconnectWordpress(admin, "user-a", "acc-1"), true);
  assert.deepEqual(admin.rows.map((r) => r.id), ["acc-2"]);
});
