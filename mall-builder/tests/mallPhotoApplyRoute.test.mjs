import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import {
  APPLY_BODY_MAX, APPLY_HTTP, handleApplyPost, makeApplyDeps, isJsonContentType, normalizeTrustedOrigin, originAllowed, parseApplyBody, readApplyConfig, readCapped,
} from "../src/lib/mallPhotoApplyRoute.ts";
import { APPLY_MAX_BYTES, APPLY_TEXT } from "../src/lib/mallPhotoApply.ts";
import { DECODE_MAX_BYTES, DECODE_MAX_PIXELS, makeSharpDecoder } from "../src/lib/mallPhotoDecode.ts";
import { appliedPath, appliedPublicUrl } from "../src/lib/applySignature.ts";

// 메이커 M3 라우트 연결 후보(2026-11-19, Master msg_c33cf9f00099) — 가짜 Supabase·가짜 fetch·가짜 sharp만.
// 실제 DB·Storage·sharp·열쇠·네트워크·활성 라우트 0. 열쇠는 합성 값.
const KEY = createHash("sha256").update("qa-m3-route-synthetic-key").digest("base64");
const ORIGIN = "https://qa.supabase.test";
const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const PROPOSAL = U(10), STORE = U(1), PRODUCT = U(2), UID = U(3), APPLY = U(20);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const jpeg = (n = 100, fill = 7) => { const b = new Uint8Array(n).fill(fill); b[0] = 0xff; b[1] = 0xd8; b[2] = 0xff; b[n - 2] = 0xff; b[n - 1] = 0xd9; return b; };
const ORIGINAL = new Uint8Array([9, 9, 9, 9, 9, 9]);
const CLEAN = jpeg(200, 5);
const HEX_UUID = "abcdef12-3456-4abc-8def-0123456789ab"; // 영문 hex가 들어간 UUID(대문자 거절 사례가 실제로 다른 글자가 되도록)
const TRUSTED = ["https://shop.test"];
const CFG = { kid: "k1", keyB64: KEY, origin: ORIGIN };

const streamOf = (chunks) => new ReadableStream({ start(c) { for (const x of chunks) c.enqueue(x); c.close(); } });
const resOf = (chunks, headers = {}, ok = true) => ({ ok, body: streamOf(chunks), headers: { get: (n) => headers[n.toLowerCase()] ?? null } });

// ---- readCapped ----
test("readCapped: 상한 이하는 그대로, 넘는 순간 too_large(거짓 Content-Length 무시), 실패 null", async () => {
  assert.deepEqual([...(await readCapped(resOf([new Uint8Array([1, 2]), new Uint8Array([3])]), 3))], [1, 2, 3]);
  assert.equal(await readCapped(resOf([new Uint8Array(4)]), 3), "too_large");
  assert.equal(await readCapped(resOf([new Uint8Array(2), new Uint8Array(2)], { "content-length": "1" }), 3), "too_large"); // 머리글은 작다고 거짓말
  assert.equal(await readCapped(resOf([new Uint8Array(1)], { "content-length": "999" }), 3), "too_large"); // 선언만으로도 중단
  assert.equal(await readCapped(resOf([], {}, false), 3), null);
  assert.equal(await readCapped({ ok: true, body: null, headers: { get: () => null } }, 3), null);
  assert.equal(await readCapped(resOf(["text"]), 30), null); // 바이트가 아닌 조각
  let pulled = 0;
  const endless = { ok: true, headers: { get: () => null }, body: new ReadableStream({ pull(c) { pulled++; c.enqueue(new Uint8Array(1024)); } }) };
  assert.equal(await readCapped(endless, 4096), "too_large");
  assert.ok(pulled < 20, "끝없는 스트림은 상한 근처에서 멈춘다");
});

// ---- 본문·출처·설정 ----
test("parseApplyBody: {proposalId, force?}만 — 경로·버킷·kid·열쇠 같은 다른 칸은 거절", () => {
  assert.deepEqual(parseApplyBody(JSON.stringify({ proposalId: PROPOSAL })), { proposalId: PROPOSAL, force: false });
  assert.deepEqual(parseApplyBody(JSON.stringify({ proposalId: PROPOSAL, force: true })), { proposalId: PROPOSAL, force: true });
  assert.deepEqual(parseApplyBody(JSON.stringify({ proposalId: HEX_UUID })), { proposalId: HEX_UUID, force: false });
  assert.notEqual(HEX_UUID, HEX_UUID.toUpperCase()); // 대문자 사례가 실제로 다른 글자인지(fixture 자체 확인)
  const wrong = [];
  for (const bad of [
    "", "x", "[]", "null", JSON.stringify({}), JSON.stringify({ proposalId: "abc" }), JSON.stringify({ proposalId: HEX_UUID.toUpperCase() }), JSON.stringify({ proposalId: HEX_UUID + "0" }), JSON.stringify({ proposalId: ` ${HEX_UUID}` }),
    JSON.stringify({ proposalId: PROPOSAL, force: "true" }), JSON.stringify({ proposalId: PROPOSAL, force: 1 }),
    JSON.stringify({ proposalId: PROPOSAL, path: "x" }), JSON.stringify({ proposalId: PROPOSAL, bucket: "mall-builder-public" }),
    JSON.stringify({ proposalId: PROPOSAL, kid: "k2" }), JSON.stringify({ proposalId: PROPOSAL, keyB64: KEY }), JSON.stringify({ proposalId: PROPOSAL, origin: "https://evil.test" }),
    JSON.stringify({ proposalId: PROPOSAL, pad: "x".repeat(APPLY_BODY_MAX) }),
  ]) if (parseApplyBody(bad) !== null) wrong.push(bad.slice(0, 80));
  assert.deepEqual(wrong, []); // 한 건이 틀려도 나머지 거절 사례를 모두 확인
});

test("originAllowed: 서버 신뢰 목록과 Origin의 정확 일치만 — Host·X-Forwarded-Host로 허용이 넓어지지 않는다", () => {
  const h = (o) => ({ get: (n) => o[n] ?? null });
  assert.ok(originAllowed(h({ origin: "https://shop.test" }), TRUSTED));
  assert.ok(originAllowed(h({ origin: "https://shop.test", "sec-fetch-site": "same-origin" }), TRUSTED));
  assert.ok(originAllowed(h({ origin: "https://b.shop.test:8443" }), ["https://shop.test", "https://b.shop.test:8443"]));
  assert.ok(originAllowed(h({ origin: "http://localhost:3210" }), ["http://localhost:3210"]));
  const wrong = [];
  const bads = [
    [{ origin: "https://evil.test" }, TRUSTED],
    [{ origin: "https://evil.test", host: "evil.test", "x-forwarded-host": "evil.test" }, TRUSTED], // 요청이 Host를 꾸며도 허용 안 됨
    [{ origin: "https://evil.test", host: "shop.test", "x-forwarded-host": "shop.test" }, TRUSTED],
    [{ host: "shop.test", "x-forwarded-host": "shop.test" }, TRUSTED], // Origin 없음
    [{ origin: "null" }, TRUSTED], [{ origin: "http://shop.test" }, TRUSTED], [{ origin: "https://SHOP.test" }, TRUSTED],
    [{ origin: "https://shop.test/" }, TRUSTED], [{ origin: "https://shop.test:443" }, TRUSTED], [{ origin: "https://shop.test.evil.test" }, TRUSTED],
    [{ origin: "https://sub.shop.test" }, TRUSTED], [{ origin: "https://shop.test:8443" }, TRUSTED], [{ origin: " https://shop.test" }, TRUSTED],
    [{ origin: "https://shop.test", "sec-fetch-site": "cross-site" }, TRUSTED], [{ origin: "https://shop.test", "sec-fetch-site": "same-site" }, TRUSTED],
    [{ origin: "https://shop.test", "sec-fetch-site": "none" }, TRUSTED],
    // 잘못된 설정은 전부 차단(맞는 출처가 섞여 있어도)
    [{ origin: "https://shop.test" }, []], [{ origin: "https://shop.test" }, null], [{ origin: "https://shop.test" }, "https://shop.test"],
    [{ origin: "https://shop.test" }, ["https://shop.test", "*"]], [{ origin: "https://shop.test" }, ["https://shop.test", "https://shop.test/path"]],
    [{ origin: "https://shop.test" }, ["https://shop.test", "http://other.test"]], [{ origin: "https://shop.test" }, ["https://shop.test", ""]],
    [{ origin: "https://shop.test" }, ["https://shop.test", 5]], [{ origin: "https://shop.test" }, ["https://Shop.test"]],
    [{ origin: "https://shop.test" }, ["https://user@shop.test"]], [{ origin: "https://shop.test" }, ["shop.test"]],
    [{ origin: "http://localhost:3210" }, TRUSTED], [{ origin: "http://shop.test" }, ["http://shop.test"]],
  ];
  for (const [headers, list] of bads) if (originAllowed(h(headers), list)) wrong.push(JSON.stringify([headers, list]));
  assert.deepEqual(wrong, []);
  assert.equal(normalizeTrustedOrigin("https://shop.test"), "https://shop.test");
  assert.equal(normalizeTrustedOrigin("https://shop.test?x=1"), null);
  assert.equal(normalizeTrustedOrigin("https://shop.test#a"), null);
});

test("isJsonContentType: 정확히 application/json(+ charset=utf-8만) — 유사 타입·다른 매개변수 거절", () => {
  for (const ok of ["application/json", "Application/JSON", "application/json; charset=utf-8", "application/json;charset=UTF-8", 'application/json; charset="utf-8"'])
    assert.ok(isJsonContentType(ok), ok);
  const wrong = [];
  for (const bad of [null, "", "application/json-seq", "application/jsonp", "application/json5", "application/jsonl", "application/ld+json", "application/x-json",
    "text/json", "text/plain", "application/json; charset=euc-kr", "application/json; boundary=x", "application/json; charset=utf-8; x=1", "application/json;",
    "application/json, text/plain", " application/json", "application/json ", "application/json\n", "xapplication/json", "multipart/form-data; boundary=application/json"])
    if (isJsonContentType(bad)) wrong.push(String(bad));
  assert.deepEqual(wrong, []);
});

test("readApplyConfig: 환경변수만 — 열쇠 없음·형식 틀림·출처 없음 = null", () => {
  assert.deepEqual(readApplyConfig({ MALL_APPLY_SIGNING_KEY: KEY, NEXT_PUBLIC_SUPABASE_URL: ORIGIN }), { kid: "k1", keyB64: KEY, origin: ORIGIN });
  assert.deepEqual(readApplyConfig({ MALL_APPLY_SIGNING_KEY: ` ${KEY}\n`, MALL_APPLY_KID: "k2", NEXT_PUBLIC_SUPABASE_URL: ORIGIN }), { kid: "k2", keyB64: KEY, origin: ORIGIN });
  for (const env of [{}, { NEXT_PUBLIC_SUPABASE_URL: ORIGIN }, { MALL_APPLY_SIGNING_KEY: "short", NEXT_PUBLIC_SUPABASE_URL: ORIGIN },
    { MALL_APPLY_SIGNING_KEY: KEY }, { MALL_APPLY_SIGNING_KEY: KEY, NEXT_PUBLIC_SUPABASE_URL: "not a url" },
    { MALL_APPLY_SIGNING_KEY: KEY, MALL_APPLY_KID: "K!", NEXT_PUBLIC_SUPABASE_URL: ORIGIN }]) assert.equal(readApplyConfig(env), null);
});

// ---- 가짜 Supabase + fetch ----
function fakeBackend(script = {}) {
  const log = []; const objects = new Map(); // "bucket/path" → 바이트
  objects.set(`mall-builder-proposals/${STORE}/${PROPOSAL}.jpg`, script.original ?? ORIGINAL);
  const supabase = {
    from(table) { return { select(cols) { return { eq(col, v) { return { async maybeSingle() {
      log.push(["select", table, cols, col, v]);
      if (script.row !== undefined) return { data: script.row };
      return { data: { store_id: STORE, product_id: PRODUCT, file_path: `${STORE}/${PROPOSAL}.jpg` } };
    } }; } }; } }; },
    async rpc(fn, args) {
      log.push(["rpc", fn, args]);
      if (fn === "mall_builder_photo_apply_begin") return script.begin ?? { data: { ok: true, state: "applying", apply_id: APPLY, role: "operator" } };
      if (fn === "mall_builder_photo_apply_commit") return script.commit ?? { data: { ok: true, state: "done" } };
      return { error: { message: "unknown fn" } };
    },
    storage: { from(bucket) { return {
      async createSignedUrl(path, seconds) { log.push(["sign", bucket, path, seconds]); return script.signFail ? { error: { message: "x" } } : { data: { signedUrl: `https://signed.test/${bucket}/${path}?token=t` } }; },
      async upload(path, body, o) {
        log.push(["upload", bucket, path, body.length, o]);
        if (objects.has(`${bucket}/${path}`)) return { error: { status: 409, statusCode: "409", code: "ResourceAlreadyExists", message: "dup" } };
        objects.set(`${bucket}/${path}`, body); return {};
      },
    }; } },
  };
  const fetchFn = async (url, init) => {
    log.push(["fetch", url, init]);
    let key = null;
    if (url.startsWith("https://signed.test/")) key = url.slice("https://signed.test/".length).split("?")[0];
    else if (url.startsWith(`${ORIGIN}/storage/v1/object/public/`)) key = url.slice(`${ORIGIN}/storage/v1/object/public/`.length);
    const b = key ? objects.get(key) : null;
    if (!b) return { ok: false, body: null, headers: { get: () => null } };
    return resOf([b.subarray(0, Math.ceil(b.length / 2)), b.subarray(Math.ceil(b.length / 2))]);
  };
  const decodeCalls = [];
  const decode = async (b) => { decodeCalls.push(b.length); return script.decode !== undefined ? script.decode : { bytes: CLEAN, width: 640, height: 480 }; };
  const deps = makeApplyDeps({ supabase, decode, fetch: fetchFn, origin: ORIGIN, sha256: async (b) => sha(b), nowSeconds: () => 1_900_000_000 });
  return { log, objects, deps, decodeCalls, called: (n) => log.filter((e) => e[0] === n) };
}
const req = (body, headers = {}) => new Request("https://shop.test/s/x/admin/products/proposals/apply", {
  method: "POST", body: typeof body === "string" ? body : JSON.stringify(body),
  headers: { "content-type": "application/json", origin: "https://shop.test", ...headers },
});
const route = (b, o = {}) => ({ trustedOrigins: () => (o.trusted !== undefined ? o.trusted : TRUSTED), config: () => (o.config !== undefined ? o.config : CFG), userId: async () => (o.uid !== undefined ? o.uid : UID), deps: () => b.deps });
const out = async (res) => ({ status: res.status, body: await res.json(), cache: res.headers.get("cache-control") });

test("정상 요청: 고정 버킷에서만 읽고 쓰며, 정제 바이트가 서명 경로에 게시되고 commit 1회", async () => {
  const b = fakeBackend();
  const r = await out(await handleApplyPost(req({ proposalId: PROPOSAL }), route(b)));
  assert.deepEqual(r, { status: 200, body: { ok: true, code: "done", message: "" }, cache: "no-store" });
  const path = appliedPath(KEY, { kid: "k1", storeId: STORE, productId: PRODUCT, proposalId: PROPOSAL, applyId: APPLY, uid: UID, role: "operator", sha256: sha(CLEAN) });
  assert.deepEqual(b.called("sign").map((e) => [e[1], e[2]]), [["mall-builder-proposals", `${STORE}/${PROPOSAL}.jpg`]]);
  const up = b.called("upload"); assert.equal(up.length, 1);
  assert.equal(up[0][1], "mall-builder-applied"); assert.equal(up[0][2], path);
  assert.deepEqual({ contentType: up[0][4].contentType, upsert: up[0][4].upsert }, { contentType: "image/jpeg", upsert: false });
  assert.deepEqual([...b.objects.get(`mall-builder-applied/${path}`)], [...CLEAN]);
  const commits = b.called("rpc").filter((e) => e[1] === "mall_builder_photo_apply_commit");
  assert.equal(commits.length, 1);
  assert.equal(commits[0][2].p_public_url, appliedPublicUrl(ORIGIN, path));
  assert.equal(commits[0][2].p_sha, sha(CLEAN)); assert.equal(commits[0][2].p_size, CLEAN.length); assert.equal(commits[0][2].p_kid, "k1");
  for (const f of b.called("fetch")) assert.deepEqual(f[2], { cache: "no-store", redirect: "error" });
  assert.deepEqual(b.decodeCalls, [ORIGINAL.length]);
});

test("force는 불리언으로 begin에만 전달 — 공급사 강제는 DB가 forbidden(직원만)", async () => {
  let b = fakeBackend();
  await handleApplyPost(req({ proposalId: PROPOSAL, force: true }), route(b));
  assert.deepEqual(b.called("rpc")[0][2], { p_proposal: PROPOSAL, p_force: true });
  b = fakeBackend({ begin: { data: { ok: false, reason: "forbidden" } } });
  const r = await out(await handleApplyPost(req({ proposalId: PROPOSAL, force: true }), route(b)));
  assert.equal(r.status, 403); assert.equal(r.body.code, "forbidden");
  assert.equal(b.called("upload").length, 0); assert.equal(b.called("sign").length, 0);
});

test("요청 거절: 다른 출처·로그인 없음·본문 이상·형식 — DB·Storage 호출 0", async () => {
  const cases = [
    [req({ proposalId: PROPOSAL }, { origin: "https://evil.test" }), {}, 403],
    [req({ proposalId: PROPOSAL }, { "sec-fetch-site": "cross-site" }), {}, 403],
    [req({ proposalId: PROPOSAL }), { uid: null }, 401],
    [req({ proposalId: PROPOSAL }), { uid: "not-a-uuid" }, 401],
    [req({ proposalId: PROPOSAL, path: `${STORE}/x.jpg` }), {}, 400],
    [req("{bad json"), {}, 400],
    [req({ proposalId: PROPOSAL }, { "content-type": "text/plain" }), {}, 415],
    [req(JSON.stringify({ proposalId: PROPOSAL }) + " ".repeat(APPLY_BODY_MAX)), {}, 413],
    [new Request("https://shop.test/x", { method: "GET", headers: { origin: "https://shop.test" } }), {}, 405],
    [req({ proposalId: PROPOSAL }, { origin: "https://evil.test", "x-forwarded-host": "evil.test" }), {}, 403], // 포워딩 머리글로 허용 확대 불가
    [req({ proposalId: PROPOSAL }), { trusted: [] }, 403], [req({ proposalId: PROPOSAL }), { trusted: ["https://shop.test", "*"] }, 403], // 잘못된 설정 차단
    [req({ proposalId: PROPOSAL }, { "content-type": "application/json-seq" }), {}, 415],
    [req({ proposalId: PROPOSAL }, { "content-type": "application/json; boundary=x" }), {}, 415],
    [req({ proposalId: HEX_UUID.toUpperCase() }), {}, 400],
  ];
  const wrong = [];
  for (const [i, [request, o, status]] of cases.entries()) {
    const b = fakeBackend();
    const r = await out(await handleApplyPost(request, route(b, o)));
    if (r.status !== status || r.body.ok !== false || b.log.length !== 0) wrong.push([i, r.status, status, b.log.length]);
  }
  assert.deepEqual(wrong, []); // 한 건이 틀려도 나머지 거절 사례를 모두 확인
});

test("서버 설정 없음 = 503 config, DB·Storage 호출 0", async () => {
  const b = fakeBackend();
  const r = await out(await handleApplyPost(req({ proposalId: PROPOSAL }), route(b, { config: null })));
  assert.equal(r.status, 503); assert.equal(r.body.code, "config"); assert.equal(b.log.length, 0);
});

test("제안 파일이 5MB 초과(스트림 상한) — decode·쓰기·commit 0", async () => {
  const b = fakeBackend({ original: new Uint8Array(APPLY_MAX_BYTES + 1) });
  const r = await out(await handleApplyPost(req({ proposalId: PROPOSAL }), route(b)));
  assert.equal(r.status, 413); assert.equal(r.body.code, "too_large");
  assert.equal(b.decodeCalls.length, 0); assert.equal(b.called("upload").length, 0);
  assert.equal(b.called("rpc").filter((e) => e[1].endsWith("commit")).length, 0);
});

test("다른 몰·다른 제안 경로의 행은 읽지 않는다(서명 주소 발급 0)·디코드 실패는 게시 0", async () => {
  let b = fakeBackend({ row: { store_id: STORE, product_id: PRODUCT, file_path: `${U(99)}/${PROPOSAL}.jpg` } });
  let r = await out(await handleApplyPost(req({ proposalId: PROPOSAL }), route(b)));
  assert.equal(r.body.code, "failed"); assert.equal(b.called("sign").length + b.called("rpc").length + b.called("upload").length, 0);
  b = fakeBackend({ row: null });
  r = await out(await handleApplyPost(req({ proposalId: PROPOSAL }), route(b)));
  assert.equal(r.status, 403); assert.equal(b.called("rpc").length, 0);
  b = fakeBackend({ decode: null });
  r = await out(await handleApplyPost(req({ proposalId: PROPOSAL }), route(b)));
  assert.equal(r.status, 422); assert.equal(r.body.code, "bad_image"); assert.equal(b.called("upload").length, 0);
});

test("commit 결과 모름(오류 응답) = 502 unknown, 한 요청에 commit 1회(재시도 0)·서명 주소 발급 실패 = failed", async () => {
  let b = fakeBackend({ commit: { error: { message: "timeout at /secret/path" } } });
  let r = await out(await handleApplyPost(req({ proposalId: PROPOSAL }), route(b)));
  assert.equal(r.status, 502); assert.equal(r.body.code, "unknown");
  assert.equal(b.called("rpc").filter((e) => e[1].endsWith("commit")).length, 1);
  b = fakeBackend({ signFail: true });
  r = await out(await handleApplyPost(req({ proposalId: PROPOSAL }), route(b)));
  assert.equal(r.body.code, "failed"); assert.equal(b.called("upload").length, 0);
});

test("응답에는 고정 문구·코드뿐 — 서명 경로·열쇠·원문 오류·버킷 이름이 없다(모든 경우)", async () => {
  const scripts = [{}, { commit: { error: { message: "pg: secret detail" } } }, { commit: { data: { ok: false, reason: "bad_sig" } } },
    { begin: { data: { ok: false, reason: "stale" } } }, { begin: { data: { ok: false, reason: "busy" } } }, { decode: null }, { signFail: true }];
  for (const s of scripts) {
    const b = fakeBackend(s);
    const res = await handleApplyPost(req({ proposalId: PROPOSAL }), route(b));
    const text = await res.text();
    const o = JSON.parse(text);
    assert.deepEqual(Object.keys(o).sort(), ["code", "message", "ok"]);
    assert.equal(o.message, APPLY_TEXT[o.code]); assert.equal(res.status, APPLY_HTTP[o.code]);
    assert.ok(!text.includes(KEY) && !text.includes("mall-builder-applied") && !text.includes("secret") && !/[0-9a-f]{32}/.test(text) && !text.includes(sha(CLEAN)));
  }
  const thrower = { trustedOrigins: () => TRUSTED, config: () => CFG, userId: async () => { throw new Error("db password=hunter2"); }, deps: () => { throw new Error("x"); } };
  const t = await (await handleApplyPost(req({ proposalId: PROPOSAL }), thrower)).text();
  assert.ok(!t.includes("hunter2")); assert.equal(JSON.parse(t).code, "unknown");
});

// ---- 디코더 후보(가짜 sharp) ----
function fakeSharp(script = {}) {
  const calls = [];
  const factory = (input, options) => {
    calls.push(["open", input.length, options]);
    const chain = {
      async metadata() { calls.push(["metadata"]); if (script.metaThrow) throw new Error("bad"); return script.meta ?? { format: "jpeg", width: 800, height: 600, pages: 1 }; },
      rotate() { calls.push(["rotate"]); return chain; },
      flatten(o) { calls.push(["flatten", o]); return chain; },
      jpeg(o) { calls.push(["jpeg", o]); chain.q = o.quality; return chain; },
      async toBuffer(o) {
        calls.push(["toBuffer", o]);
        if (script.pixelThrow) throw new Error("corrupt pixel data");
        if (script.out) return script.out(chain.q);
        return { data: Buffer.from(jpeg(300, chain.q)), info: { width: 600, height: 800, format: "jpeg" } };
      },
    };
    return chain;
  };
  return { factory, calls, called: (n) => calls.filter((c) => c[0] === n) };
}

test("디코더: 실제로 픽셀을 풀어 재인코딩한 바이트만 돌려준다 — 입력 바이트를 그대로 돌려주는 가지 없음", async () => {
  const s = fakeSharp();
  const input = jpeg(500, 1);
  const got = await makeSharpDecoder(s.factory)(input);
  assert.ok(got); assert.notDeepEqual([...got.bytes], [...input]);
  assert.deepEqual({ w: got.width, h: got.height }, { w: 600, h: 800 }); // 방향 반영 뒤 치수(재인코딩 결과 기준)
  assert.equal(s.called("rotate").length, 1); assert.equal(s.called("toBuffer").length, 1);
  assert.deepEqual(s.called("jpeg")[0][1], { quality: 90, mozjpeg: false });
  for (const o of s.called("open")) assert.deepEqual(o[2], { limitInputPixels: DECODE_MAX_PIXELS, failOn: "error", sequentialRead: true, animated: false });
});

test("디코더: 머리 정보가 정상이어도 픽셀 디코드가 실패하면 null(헤더만 통과 금지)", async () => {
  const s = fakeSharp({ pixelThrow: true });
  assert.equal(await makeSharpDecoder(s.factory)(jpeg(500)), null);
  assert.equal(s.called("metadata").length, 1); assert.equal(s.called("toBuffer").length, 1);
});

test("디코더 거절: 형식 밖·치수 초과·화소 초과·움직이는 이미지·머리 오류·빈 입력·5MB 초과 입력·출력 이상", async () => {
  const metas = [{ format: "gif", width: 10, height: 10 }, { format: "svg", width: 10, height: 10 }, { width: 10, height: 10 },
    { format: "jpeg", width: 6001, height: 10 }, { format: "jpeg", width: 10, height: 0 }, { format: "jpeg", width: 10.5, height: 10 },
    { format: "jpeg" }, { format: "webp", width: 100, height: 100, pages: 3 }];
  for (const meta of metas) {
    const s = fakeSharp({ meta });
    assert.equal(await makeSharpDecoder(s.factory)(jpeg(50)), null, JSON.stringify(meta));
    assert.equal(s.called("toBuffer").length, 0);
  }
  let s = fakeSharp({ metaThrow: true }); assert.equal(await makeSharpDecoder(s.factory)(jpeg(50)), null);
  s = fakeSharp(); assert.equal(await makeSharpDecoder(s.factory)(new Uint8Array(0)), null); assert.equal(s.calls.length, 0);
  s = fakeSharp(); assert.equal(await makeSharpDecoder(s.factory)(new Uint8Array(DECODE_MAX_BYTES + 1)), null); assert.equal(s.calls.length, 0);
  s = fakeSharp(); assert.equal(await makeSharpDecoder(s.factory)("text"), null);
  for (const o of [() => ({ data: Buffer.from(jpeg(50)), info: { width: 10, height: 10, format: "png" } }),
    () => ({ data: Buffer.alloc(0), info: { width: 10, height: 10, format: "jpeg" } }),
    () => ({ data: Buffer.from(jpeg(50)), info: { width: 7000, height: 10, format: "jpeg" } })]) {
    s = fakeSharp({ out: o }); assert.equal(await makeSharpDecoder(s.factory)(jpeg(50)), null);
  }
});

test("디코더: 5MB를 넘으면 품질 90 → 80 → 70 순서로 다시 인코딩, 끝까지 넘으면 마지막 결과(호출 쪽이 too_large)", async () => {
  let s = fakeSharp({ out: (q) => ({ data: Buffer.from(jpeg(q === 90 ? DECODE_MAX_BYTES + 10 : 1000, q)), info: { width: 100, height: 100, format: "jpeg" } }) });
  let got = await makeSharpDecoder(s.factory)(jpeg(50));
  assert.equal(got.bytes.length, 1000); assert.deepEqual(s.called("jpeg").map((c) => c[1].quality), [90, 80]);
  s = fakeSharp({ out: (q) => ({ data: Buffer.from(jpeg(DECODE_MAX_BYTES + 10, q)), info: { width: 100, height: 100, format: "jpeg" } }) });
  got = await makeSharpDecoder(s.factory)(jpeg(50));
  assert.ok(got.bytes.length > DECODE_MAX_BYTES); assert.deepEqual(s.called("jpeg").map((c) => c[1].quality), [90, 80, 70]);
});

// ---- 소스 계약 ----
test("소스 계약: 활성 라우트 없음·sharp 정적 import 0·버킷은 고정 상수·로그 0·메타데이터 보존 호출 0", () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const routeSrc = readFileSync(join(root, "src/lib/mallPhotoApplyRoute.ts"), "utf8");
  const decSrc = readFileSync(join(root, "src/lib/mallPhotoDecode.ts"), "utf8");
  for (const src of [routeSrc, decSrc]) {
    assert.ok(!/from\s+["']sharp["']|require\(["']sharp["']\)|import\(["']sharp["']\)/.test(src.replace(/\/\/.*$/gm, "")));
    assert.ok(!/console\./.test(src)); assert.ok(!/["']use client["']/.test(src));
  }
  assert.ok(!/withMetadata|keepMetadata|keepExif|keepIccProfile/.test(decSrc.replace(/\/\/.*$/gm, "")));
  assert.ok(/storage\.from\(PROPOSAL_BUCKET\)/.test(routeSrc) && /storage\.from\(APPLIED_BUCKET\)/.test(routeSrc));
  assert.equal((routeSrc.match(/storage\.from\(/g) ?? []).length, 2); // 버킷 두 곳 모두 고정 상수
  assert.ok(!/x-forwarded|["']host["']/i.test(routeSrc.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, ""))); // 출처 판정에 Host·포워딩 머리글을 읽지 않는다
  assert.ok(/originAllowed\(req\.headers, d\.trustedOrigins\(\)\)/.test(routeSrc));
  assert.ok(!/process\.env/.test(routeSrc)); // 환경변수는 호출 쪽이 readApplyConfig(process.env)로 넘김
  // 활성 라우트(src/app 아래)에서 아직 이 모듈들을 쓰지 않는다
  const walk = (dir) => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
  const app = join(root, "src/app");
  if (existsSync(app)) {
    for (const f of walk(app).filter((p) => /\.(ts|tsx)$/.test(p))) {
      const t = readFileSync(f, "utf8");
      assert.ok(!/mallPhotoApplyRoute|mallPhotoDecode|mallPhotoApply["'.]/.test(t), f);
    }
  }
  assert.ok(!existsSync(join(root, "src/app/s/[store]/admin/products/proposals/apply/route.ts")));
});
