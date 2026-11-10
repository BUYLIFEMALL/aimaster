import { test } from "node:test";
import assert from "node:assert/strict";
import { authorizeUrl, completeGoogleConnect, getValidBloggerToken, selectBlog, idTokenClaims, GOOGLE_REDIRECT_URI } from "../src/lib/googleConnect.ts";
import { PublishError } from "../src/lib/publish/types.ts";

const NOW = Date.parse("2026-11-11T00:00:00Z");
const jwt = (payload) => `h.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.s`;

// 가짜 DB(user_api_keys·member_platform_accounts·integration_catalog) — 실제 DB 쓰기 없음
function fakeAdmin({ keys = { google_client_id: "CID", google_client_secret: "SEC" }, accounts = [] } = {}) {
  const tables = {
    user_api_keys: Object.entries(keys).map(([provider, api_key]) => ({ user_id: "user-a", provider, api_key })),
    member_platform_accounts: accounts,
    integration_catalog: [{ key: "blogger", connect_program_url: "https://wp-blogger-auto.buylife.xyz" }],
  };
  const ops = [];
  return {
    tables, ops,
    from(table) {
      const f = []; let op = "select", values = null;
      const q = {
        select() { return q; }, eq(k, v) { f.push([k, v]); return q; }, order() { return q; }, limit() { return q; },
        upsert(v) { op = "upsert"; values = v; return finish(false); },
        update(v) { op = "update"; values = v; return q; },
        delete() { op = "delete"; return q; },
        maybeSingle() { return finish(true); },
        then(res, rej) { return finish(false).then(res, rej); },
      };
      async function finish(single) {
        const rows = tables[table];
        const hit = rows.filter((r) => f.every(([k, v]) => r[k] === v));
        if (op === "upsert") { ops.push({ table, op, values }); const i = rows.findIndex((r) => r.user_id === values.user_id && r.platform === values.platform && r.external_id === values.external_id); if (i >= 0) Object.assign(rows[i], values); else rows.push({ id: `acc-${rows.length + 1}`, ...values }); return { error: null }; }
        if (op === "update") { ops.push({ table, op, values, f }); hit.forEach((r) => Object.assign(r, values)); return { error: null }; }
        return { data: single ? hit[0] ?? null : hit, error: null };
      }
      return q;
    },
  };
}

function googleFetch({ token = {}, tokenStatus = 200, blogs = [{ id: "111", name: "My Travel Notes", url: "https://mytravel.blogspot.com/" }] } = {}) {
  const calls = [];
  const fn = async (url, init = {}) => {
    calls.push({ url, body: String(init.body ?? "") });
    if (url.startsWith("https://oauth2.googleapis.com/token")) {
      return Response.json({ access_token: "AT2", expires_in: 3600, scope: "openid email https://www.googleapis.com/auth/blogger", refresh_token: "RT2", id_token: jwt({ sub: "g-1", email: "me@gmail.com" }), ...token }, { status: tokenStatus });
    }
    if (url.includes("/blogger/v3/users/self/blogs")) return Response.json({ items: blogs });
    throw new Error("unexpected " + url);
  };
  return { fn, calls };
}

const bloggerRow = (o = {}) => ({ id: "acc-1", user_id: "user-a", platform: "blogger", external_id: "g-1", username: "me@gmail.com", access_token: "AT1", refresh_token: "RT1", token_expires_at: new Date(NOW + 3600_000).toISOString(), granted_scopes: ["https://www.googleapis.com/auth/blogger"], auth_method: "oauth", app_ref: "CID", extra: {}, needs_reconnect: false, connected_via: "wp-blogger-auto", ...o });

test("GC01 동의 주소 — 회원 앱 ID·고정 콜백·블로그 권한·오프라인·상태값", () => {
  const u = new URL(authorizeUrl("CID", "st123"));
  assert.equal(u.searchParams.get("client_id"), "CID");
  assert.equal(u.searchParams.get("redirect_uri"), GOOGLE_REDIRECT_URI);
  assert.match(u.searchParams.get("scope"), /auth\/blogger/);
  assert.equal(u.searchParams.get("access_type"), "offline");
  assert.equal(u.searchParams.get("state"), "st123");
});

test("GC02 연결 완료 — 공용 표에 본인 줄, 계정 번호·이메일·앱·갱신 토큰 저장", async () => {
  const admin = fakeAdmin(); const { fn, calls } = googleFetch();
  const r = await completeGoogleConnect(admin, "user-a", "CODE", { fetchImpl: fn, now: () => NOW });
  assert.equal(r.email, "me@gmail.com");
  const v = admin.ops.find((o) => o.op === "upsert").values;
  assert.equal(v.user_id, "user-a"); assert.equal(v.platform, "blogger"); assert.equal(v.external_id, "g-1");
  assert.equal(v.access_token, "AT2"); assert.equal(v.refresh_token, "RT2"); assert.equal(v.app_ref, "CID"); assert.equal(v.auth_method, "oauth");
  assert.match(calls[0].body, /client_secret=SEC/); assert.match(calls[0].body, /grant_type=authorization_code/);
});

test("GC03 블로그 권한을 빼고 동의하면 저장하지 않음", async () => {
  const admin = fakeAdmin(); const { fn } = googleFetch({ token: { scope: "openid email" } });
  await assert.rejects(() => completeGoogleConnect(admin, "user-a", "CODE", { fetchImpl: fn, now: () => NOW }), (e) => e instanceof PublishError && e.code === "forbidden");
  assert.equal(admin.ops.length, 0);
});

test("GC04 회원 구글 앱 키가 없으면 토큰 요청 없이 안내(운영자 키로 대신하지 않음)", async () => {
  const admin = fakeAdmin({ keys: {} }); const { fn, calls } = googleFetch();
  await assert.rejects(() => completeGoogleConnect(admin, "user-a", "CODE", { fetchImpl: fn }), /먼저 등록/);
  assert.equal(calls.length, 0);
});

test("GC05 토큰 — 유효하면 그대로, 만료면 본인 앱으로 갱신·저장, 앱이 바뀌면 다시 연결 표시", async () => {
  let admin = fakeAdmin({ accounts: [bloggerRow()] }); let g = googleFetch();
  assert.equal((await getValidBloggerToken(admin, "user-a", { fetchImpl: g.fn, now: () => NOW })).token, "AT1");
  assert.equal(g.calls.length, 0);

  admin = fakeAdmin({ accounts: [bloggerRow({ token_expires_at: new Date(NOW - 1000).toISOString() })] }); g = googleFetch();
  assert.equal((await getValidBloggerToken(admin, "user-a", { fetchImpl: g.fn, now: () => NOW })).token, "AT2");
  assert.match(g.calls[0].body, /grant_type=refresh_token/); assert.match(g.calls[0].body, /refresh_token=RT1/);
  assert.equal(admin.tables.member_platform_accounts[0].access_token, "AT2");

  admin = fakeAdmin({ keys: { google_client_id: "OTHER", google_client_secret: "S" }, accounts: [bloggerRow({ token_expires_at: new Date(NOW - 1000).toISOString() })] }); g = googleFetch();
  await assert.rejects(() => getValidBloggerToken(admin, "user-a", { fetchImpl: g.fn, now: () => NOW }), (e) => e.code === "auth");
  assert.equal(admin.tables.member_platform_accounts[0].needs_reconnect, true); assert.equal(g.calls.length, 0);
});

test("GC06 연결이 취소된 갱신 토큰(invalid_grant)은 다시 연결 표시", async () => {
  const admin = fakeAdmin({ accounts: [bloggerRow({ token_expires_at: new Date(NOW - 1000).toISOString() })] });
  const g = googleFetch({ tokenStatus: 400, token: { error: "invalid_grant", access_token: undefined } });
  await assert.rejects(() => getValidBloggerToken(admin, "user-a", { fetchImpl: g.fn, now: () => NOW }), (e) => e.code === "auth");
  assert.equal(admin.tables.member_platform_accounts[0].needs_reconnect, true);
});

test("GC07 블로그 고르기 — 내 목록에 있는 것만 저장", async () => {
  const admin = fakeAdmin({ accounts: [bloggerRow()] }); const g = googleFetch();
  await assert.rejects(() => selectBlog(admin, "user-a", "999", { fetchImpl: g.fn, now: () => NOW }), (e) => e.code === "not_found");
  const b = await selectBlog(admin, "user-a", "111", { fetchImpl: g.fn, now: () => NOW });
  assert.equal(b.name, "My Travel Notes");
  assert.equal(admin.tables.member_platform_accounts[0].extra.blog_id, "111");
});

test("GC08 같은 구글 계정으로 다시 연결하면 고른 블로그 유지", async () => {
  const admin = fakeAdmin({ accounts: [bloggerRow({ extra: { blog_id: "111", blog_name: "My Travel Notes" } })] }); const g = googleFetch();
  await completeGoogleConnect(admin, "user-a", "CODE", { fetchImpl: g.fn, now: () => NOW });
  assert.equal(admin.tables.member_platform_accounts[0].extra.blog_id, "111");
  assert.equal(idTokenClaims("broken"), null);
});
