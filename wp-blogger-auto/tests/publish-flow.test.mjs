import { test } from "node:test";
import assert from "node:assert/strict";
import { publishPost, cancelScheduled, parsePublishRequest } from "../src/lib/publishFlow.ts";

const NOW = Date.parse("2026-11-11T03:00:00Z");
const PUB = "https://x.supabase.co/storage/v1/object/public/wba-images/";
const IMG = (slot, n) => ({ slot, section: n, prompt: "p", alt: `alt ${slot}`, status: "done", path: `user-a/p1/${slot}-1.jpg`, url: `${PUB}user-a/p1/${slot}-1.jpg` });

// 가짜 DB·저장소 — 실제 쓰기 없음
function fakeAdmin({ post = {}, wp = true, blogger = false } = {}) {
  const accounts = [];
  if (wp) accounts.push({ id: "acc-wp", user_id: "user-a", platform: "wordpress", external_id: "x", username: "admin", access_token: "abcdefghijklmnopqrstuvwx", refresh_token: null, token_expires_at: null, granted_scopes: [], auth_method: "app_password", app_ref: null, extra: { site_url: "https://myblog.co.kr", rest_style: "path" }, needs_reconnect: false, connected_via: "wp-blogger-auto", is_default: true, updated_at: "1" });
  if (blogger) accounts.push({ id: "acc-bl", user_id: "user-a", platform: "blogger", external_id: "g", username: "me@gmail.com", access_token: "AT", refresh_token: "RT", token_expires_at: new Date(NOW + 3600_000).toISOString(), granted_scopes: [], auth_method: "oauth", app_ref: "CID", extra: { blog_id: "111" }, needs_reconnect: false, connected_via: "wp-blogger-auto", is_default: true, updated_at: "1" });
  const tables = {
    wba_posts: [{ id: "p1", user_id: "user-a", platform: "wordpress", status: "ready", title: "겨울 캠핑", html: `<h2>텐트</h2><figure><img src="${PUB}user-a/p1/s1-1.jpg" alt="a" /></figure><p>본문</p>`, excerpt: "요약", slug: "winter-camping", tags: ["캠핑"], images: [IMG("featured", null), IMG("s1", 1)], remote_id: null, ...post }],
    member_platform_accounts: accounts,
    user_api_keys: [{ user_id: "user-a", provider: "google_client_id", api_key: "CID" }, { user_id: "user-a", provider: "google_client_secret", api_key: "S" }],
    integration_catalog: [],
  };
  return {
    tables,
    storage: { from: () => ({ download: async () => ({ data: new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" }), error: null }) }) },
    from(table) {
      const f = []; let op = "select", values = null;
      const q = {
        select() { return q; }, eq(k, v) { f.push(["eq", k, v]); return q; }, is(k, v) { f.push(["eq", k, v]); return q; },
        order() { return q; }, limit() { return q; }, update(v) { op = "update"; values = v; return q; },
        maybeSingle() { return finish(true); }, then(res, rej) { return finish(false).then(res, rej); },
      };
      async function finish(single) {
        const hit = tables[table].filter((r) => f.every(([, k, v]) => r[k] === v));
        if (op === "update") { hit.forEach((r) => Object.assign(r, values)); return { data: hit.map((h) => ({ id: h.id })), error: null }; }
        return { data: single ? (hit[0] ? structuredClone(hit[0]) : null) : hit, error: null };
      }
      return q;
    },
  };
}

function wpFetch({ postStatus = 201, postBody } = {}) {
  const calls = [];
  const fn = async (url, init = {}) => {
    const m = init.method || "GET";
    calls.push({ m, url, body: typeof init.body === "string" ? JSON.parse(init.body) : null });
    if (url.endsWith("/wp-json/")) return Response.json({ namespaces: ["wp/v2"] });
    if (url.includes("/wp/v2/media")) return Response.json({ id: calls.filter((c) => c.url.includes("/media")).length + 40, source_url: `https://myblog.co.kr/wp-content/uploads/${calls.length}.jpg` }, { status: 201 });
    if (url.includes("/wp/v2/tags") && m === "GET") return Response.json([{ id: 7, name: "캠핑" }]);
    if (/\/wp\/v2\/posts\/\d+/.test(url)) return Response.json({ id: 501, status: "draft", link: "https://myblog.co.kr/?p=501" });
    if (url.includes("/wp/v2/posts")) return Response.json(postBody ?? { id: 501, status: "publish", link: "https://myblog.co.kr/winter-camping/" }, { status: postStatus });
    throw new Error("unexpected " + url);
  };
  return { fn, calls };
}

test("PB01 워드프레스 바로 발행 — 이미지 미디어 업로드·주소 교체·대표 이미지·태그·결과 기록", async () => {
  const admin = fakeAdmin(); const { fn, calls } = wpFetch();
  const r = await publishPost(admin, "user-a", "p1", { mode: "publish", categoryIds: [3] }, { wp: { fetchImpl: fn }, now: () => NOW });
  assert.equal(r.status, "published");
  const post = calls.find((c) => c.m === "POST" && c.url.endsWith("/wp/v2/posts"));
  assert.equal(post.body.status, "publish"); assert.equal(post.body.featured_media, 41); assert.deepEqual(post.body.tags, [7]); assert.deepEqual(post.body.categories, [3]);
  assert.doesNotMatch(post.body.content, /supabase/); assert.match(post.body.content, /wp-content\/uploads/);
  const row = admin.tables.wba_posts[0];
  assert.equal(row.status, "published"); assert.equal(row.remote_id, "501"); assert.equal(row.remote_url, "https://myblog.co.kr/winter-camping/"); assert.equal(row.keep_images, false); assert.equal(row.blog_ref, "https://myblog.co.kr");
});

test("PB02 이미 발행·예약된 원고, 초안을 다시 초안으로 보내기는 다시 보내지 않음", async () => {
  for (const [status, mode] of [["published", "publish"], ["scheduled", "publish"], ["draft", "draft"]]) {
    const admin = fakeAdmin({ post: { remote_id: "501", status } }); const { fn, calls } = wpFetch();
    await assert.rejects(() => publishPost(admin, "user-a", "p1", { mode }, { wp: { fetchImpl: fn } }), (e) => e.code === "already_sent" || e.code === "locked");
    assert.equal(calls.length, 0);
  }
});

test("PB02b 워드프레스 초안 → 바로 발행: 새 글 없이 같은 글(501) 상태만 바꿈", async () => {
  const admin = fakeAdmin({ post: { remote_id: "501", status: "draft" } }); const calls = [];
  const fn = async (url, init = {}) => {
    calls.push({ m: init.method || "GET", url, body: typeof init.body === "string" ? JSON.parse(init.body) : null });
    if (url.endsWith("/wp-json/")) return Response.json({ namespaces: ["wp/v2"] });
    if (/\/wp\/v2\/posts\/501/.test(url)) return Response.json({ id: 501, status: "publish", link: "https://myblog.co.kr/winter-camping/" });
    throw new Error("unexpected " + url);
  };
  const r = await publishPost(admin, "user-a", "p1", { mode: "publish" }, { wp: { fetchImpl: fn }, now: () => NOW });
  assert.equal(r.status, "published");
  assert.equal(calls.filter((c) => c.m === "POST" && c.url.endsWith("/wp/v2/posts")).length, 0);
  const sw = calls.find((c) => c.m === "POST" && /posts\/501/.test(c.url)); assert.equal(sw.body.status, "publish");
  const row = admin.tables.wba_posts[0]; assert.equal(row.status, "published"); assert.equal(row.remote_id, "501"); assert.equal(row.keep_images, false);
});

test("PB02c 구글 블로그 초안 → 예약: 같은 글에 publish(publishDate), 예약 대기는 이미지 보관 안 함", async () => {
  const admin = fakeAdmin({ post: { platform: "blogger", remote_id: "9", status: "draft", expires_at: new Date(NOW + 30 * 864e5).toISOString() }, wp: false, blogger: true }); const sent = [];
  const fn = async (url, init = {}) => { sent.push({ url, m: init.method }); return Response.json({ id: "9", status: "SCHEDULED", published: new Date(NOW + 2 * 864e5).toISOString(), url: "https://my.blogspot.com/x.html" }); };
  const r = await publishPost(admin, "user-a", "p1", { mode: "schedule", scheduledAt: new Date(NOW + 2 * 864e5).toISOString() }, { blogger: { fetchImpl: fn, now: () => NOW } });
  assert.equal(r.status, "scheduled");
  assert.equal(sent.length, 1); assert.match(sent[0].url, /\/posts\/9\/publish\?/); assert.match(sent[0].url, /publishDate=/);
  const row = admin.tables.wba_posts[0]; assert.equal(row.status, "scheduled"); assert.equal(row.keep_images, false); assert.equal(row.image_expires_at, null);
});

test("PB02d 예약 상한 — 원고 보관 만료 하루 전보다 늦으면 보내지 않음", async () => {
  const admin = fakeAdmin({ post: { expires_at: new Date(NOW + 10 * 864e5).toISOString() } }); const { fn, calls } = wpFetch();
  await assert.rejects(() => publishPost(admin, "user-a", "p1", { mode: "schedule", scheduledAt: new Date(NOW + 9.5 * 864e5).toISOString() }, { wp: { fetchImpl: fn }, now: () => NOW }), (e) => e.code === "schedule_too_late");
  assert.equal(calls.length, 0); assert.equal(admin.tables.wba_posts[0].status, "ready");
});

test("PB03 발행 중·발행된 원고는 잠김", async () => {
  for (const status of ["publishing", "published", "scheduled", "uncertain"]) {
    await assert.rejects(() => publishPost(fakeAdmin({ post: { status } }), "user-a", "p1", { mode: "draft" }), (e) => e.code === "locked", status);
  }
});

test("PB04 보내기 전 실패(연결 없음)는 원래 상태로 되돌리고 사유 기록", async () => {
  const admin = fakeAdmin({ wp: false });
  await assert.rejects(() => publishPost(admin, "user-a", "p1", { mode: "draft" }), (e) => e.code === "auth");
  const row = admin.tables.wba_posts[0];
  assert.equal(row.status, "ready"); assert.match(row.error_detail, /연결/); assert.equal(row.remote_id, null);
});

test("PB05 글 만들기 뒤 서버 오류는 「확인 필요」, 다시 보내지 않음(글 만들기 요청 1번)", async () => {
  const admin = fakeAdmin(); const { fn, calls } = wpFetch({ postStatus: 502, postBody: { code: "x" } });
  await assert.rejects(() => publishPost(admin, "user-a", "p1", { mode: "publish" }, { wp: { fetchImpl: fn } }), (e) => e.code === "uncertain");
  assert.equal(admin.tables.wba_posts[0].status, "uncertain");
  assert.equal(calls.filter((c) => c.m === "POST" && c.url.endsWith("/wp/v2/posts")).length, 1);
});

test("PB06 구글 블로그 바로 발행 — 대표 이미지를 본문 맨 위에, 이미지 보관 표시", async () => {
  const admin = fakeAdmin({ post: { platform: "blogger" }, wp: false, blogger: true }); const sent = [];
  const fn = async (url, init = {}) => { sent.push({ url, body: init.body ? JSON.parse(init.body) : null }); return Response.json({ id: "9", status: "LIVE", url: "https://my.blogspot.com/2026/11/x.html" }); };
  const r = await publishPost(admin, "user-a", "p1", { mode: "publish" }, { blogger: { fetchImpl: fn, now: () => NOW } });
  assert.equal(r.status, "published");
  assert.match(sent[0].body.content, /^<figure><img src="[^"]+featured-1\.jpg"/); assert.match(sent[0].url, /isDraft=false/);
  const row = admin.tables.wba_posts[0]; assert.equal(row.keep_images, true); assert.equal(row.blog_ref, "111");
  assert.equal(Date.parse(row.image_expires_at) - Date.parse(row.published_at), 365 * 864e5); // 발행일 + 1년
});

test("PB07 구글 블로그 예약 — 초안은 됐는데 예약 실패면 「초안」으로 기록(중복 방지)", async () => {
  const admin = fakeAdmin({ post: { platform: "blogger" }, wp: false, blogger: true });
  const fn = async (url) => (url.includes("/publish") ? Response.json({ error: { message: "boom" } }, { status: 503 }) : Response.json({ id: "9", status: "DRAFT", url: null }));
  await assert.rejects(() => publishPost(admin, "user-a", "p1", { mode: "schedule", scheduledAt: new Date(NOW + 3600_000).toISOString() }, { blogger: { fetchImpl: fn, now: () => NOW } }));
  const row = admin.tables.wba_posts[0]; assert.equal(row.status, "draft"); assert.equal(row.remote_id, "9"); assert.match(row.error_detail, /예약을 걸지 못했습니다/);
});

test("PB08 예약 취소 → 초안 / 입력 검사", async () => {
  const admin = fakeAdmin({ post: { status: "scheduled", remote_id: "501", scheduled_at: "x" } }); const { fn } = wpFetch();
  const r = await cancelScheduled(admin, "user-a", "p1", { wp: { fetchImpl: fn } });
  assert.equal(r.status, "draft"); assert.equal(admin.tables.wba_posts[0].status, "draft"); assert.equal(admin.tables.wba_posts[0].scheduled_at, null);
  assert.throws(() => parsePublishRequest({ mode: "now" }), /발행 방식/);
  assert.deepEqual(parsePublishRequest({ mode: "schedule", scheduledAt: "2026-12-01T00:00:00Z", categoryIds: [1, "x", -2] }), { mode: "schedule", scheduledAt: "2026-12-01T00:00:00Z", categoryIds: [1] });
});
