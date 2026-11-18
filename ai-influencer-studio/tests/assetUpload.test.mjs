// W01-A2I 참고 이미지 서버 경유 업로드 시험 (2026-11-19, CC-SNS-01, Master msg_75a9a898c52d, 계약 W00_BASELINE §22). 실제 DB·저장소·키·AI 호출 없음.
//  A) 실제 라우트 파일(src/app/api/aif/assets/route.ts)의 POST — 권한·관리자 클라이언트만 가짜 모듈(운영 상수 off).
//  B) 처리기(handlePostAsset)에 shadow 모드와 가짜 rpc/storage를 명시적으로 넣어 실패 사례별로 본다(§22-5 표).
//  C) 저장 모듈의 참고 이미지 검증·저장(verifyReferenceBytes·saveReferenceImage).
//  ★ 한계: 저장소·DB는 가짜다. 가짜 저장소 응답 모양은 설치된 @supabase/storage-js 2.117.3의 upload() 계약({ data: { id, path, fullPath }, error })을 따른다.
//     실제 Supabase에서의 업로드·확정·용량 판정 통과가 아니다. 사진은 서명만 맞춘 합성 바이트다(실제 그림이 아니다).
import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

const SRC = new URL("../src/", import.meta.url).href;
const stub = (code) => "data:text/javascript," + encodeURIComponent(code);
const STUBS = {
  "@/lib/access": stub("export const checkProgramAccessApi = (...a) => globalThis.__aifUpload.checkAccess(...a);"),
  "@/lib/supabase/admin": stub("export const createAdminClient = (...a) => globalThis.__aifUpload.createAdminClient(...a);"),
};
register(stub(`
const SRC = ${JSON.stringify(SRC)}; const STUBS = ${JSON.stringify(STUBS)};
export async function resolve(s, c, n) {
  if (STUBS[s]) return { url: STUBS[s], shortCircuit: true };
  if (s === "next/server") return n("next/server.js", c);
  if (s.startsWith("@/")) return n(SRC + s.slice(2) + ".ts", c);
  try { return await n(s, c); } catch (e) { if (s.startsWith(".") && !/\\.[a-z]+$/.test(s)) return n(s + ".ts", c); throw e; }
}`));

const { POST } = await import("../src/app/api/aif/assets/route.ts");
const { handlePostAsset, UPLOAD_BODY_MAX_BYTES, UPLOAD_MESSAGES } = await import("../src/lib/assets/upload.ts");
const { saveReferenceImage, saveGeneratedOriginal, verifyReferenceBytes, REFERENCE_KINDS } = await import("../src/lib/assets/store.ts");
const { AIF_ASSETS_MODE } = await import("../src/lib/assets/generation.ts");
const { REF_MAX_BYTES } = await import("../src/lib/assets/paths.ts");

const U = "abcdef01-2345-4789-8abc-def012345678";
const OTHER = "00000000-1111-4222-8333-444444444444";
const ASSET = "0a0b0c0d-1111-4222-8333-444455556666";
const OBJ = "99999999-aaaa-4bbb-8ccc-dddddddddddd";

// 서명만 맞춘 합성 사진
const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const sized = (head, n) => { const b = new Uint8Array(n); b.set(head); return b; };
const PNG = sized(PNG_SIG, 64);
const JPEG = sized([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00], 64);
const WEBP = new Uint8Array(Buffer.from("UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==", "base64"));
const HEIC = new Uint8Array(Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypheic\0\0\0\0mif1heic"), Buffer.alloc(16)]));
const AVIF = new Uint8Array(Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypavif\0\0\0\0mif1avif"), Buffer.alloc(16)]));
const GIF = new Uint8Array(Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64"));
const dataUrl = (bytes, mime) => `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
const sha = async (bytes) => Buffer.from(await crypto.subtle.digest("SHA-256", bytes)).toString("hex");

const req = (body, headers = {}) => new Request("http://local/api/aif/assets", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), headers });
const good = (over = {}) => ({ kind: "ref_face", image: dataUrl(PNG, "image/png"), ...over });

/** 가짜 주입물: 호출 기록, 의존성 생성 횟수, 본문을 읽었는지 */
function world(over = {}) {
  const calls = [];
  const n = { access: 0, deps: 0, admin: 0 };
  const h = {
    aif_asset_reserve: (a) => ({ data: [{ asset_id: ASSET, path: `${a.p_user}/${a.p_kind}/${ASSET}.${a.p_ext}` }], error: null }),
    aif_asset_finalize: () => ({ data: "ready", error: null }),
    aif_asset_reconcile: () => ({ data: "unknown", error: null }),
    aif_asset_abort_local: () => ({ data: "failed", error: null }),
    upload: (path) => ({ data: { id: OBJ, path, fullPath: `aif-assets/${path}` }, error: null }),
    ...over.handlers,
  };
  const deps = {
    rpc: async (fn, args) => { calls.push({ fn, args }); return h[fn](args); },
    storage: { upload: async (path, body, opts) => { calls.push({ fn: "upload", args: { path, size: body.length, opts, body } }); return h.upload(path, body, opts); } },
  };
  const w = {
    n, calls, names: () => calls.map((c) => c.fn), of: (fn) => calls.filter((c) => c.fn === fn),
    checkAccess: async () => { n.access++; return over.access ?? { allowed: true, user: { id: U } }; },
    createAdminClient: () => { n.admin++; throw new Error("관리자 클라이언트가 만들어지면 안 됨"); },
    getAssetDeps: () => { n.deps++; if (over.depsThrows) throw new Error("deps boom"); return deps; },
    deps,
  };
  globalThis.__aifUpload = w;
  return w;
}
const shadow = (w, extra = {}) => ({ mode: "shadow", checkAccess: w.checkAccess, getAssetDeps: w.getAssetDeps, ...extra });
const post = (w, body, headers) => handlePostAsset(req(body, headers), shadow(w));
/** 어떤 경로에서도 재전송·삭제가 없어야 한다 */
function assertNoRetry(w) {
  assert.ok(w.of("upload").length <= 1, "업로드는 최대 1회(자동 재전송 0)");
  assert.ok(w.of("aif_asset_reserve").length <= 1, "예약은 최대 1회");
  assert.ok(w.of("aif_asset_reconcile").length <= 1, "대조는 최대 1회");
  assert.ok(!w.names().some((x) => /delete|remove/.test(x)), "삭제 호출 0");
}
const LEAKS = [U, OBJ, "aif-assets", "/ref_face/", ".png", "boom", "duplicate"];
function assertNoLeak(r, extra = []) {
  const text = JSON.stringify(r.body);
  for (const leak of [...LEAKS, ...extra]) assert.equal(text.includes(leak), false, `응답에 ${leak} 없음`);
  assert.doesNotMatch(text, /[0-9a-f]{64}/, "해시 없음");
  assert.equal(r.headers["Cache-Control"], "no-store");
}

// ───────────── A) 실제 라우트 POST (운영 상수 off) ─────────────
test("운영 상수는 off이고, 실제 라우트는 권한 확인 뒤 404 — 본문을 읽지 않고 관리자 클라이언트·저장 호출이 없다", async () => {
  assert.equal(AIF_ASSETS_MODE, "off");
  const w = world();
  let bodyRead = false;
  // highWaterMark 0: 누군가 실제로 읽을 때만 pull이 불린다(기본값이면 스트림이 스스로 한 덩어리를 미리 당긴다)
  const stream = new ReadableStream({ pull(c) { bodyRead = true; c.enqueue(new TextEncoder().encode(JSON.stringify(good()))); c.close(); } }, { highWaterMark: 0 });
  const res = await POST(new Request("http://local/api/aif/assets", { method: "POST", body: stream, duplex: "half" }));
  assert.equal(res.status, 404);
  assert.deepEqual(await res.json(), { error: "자료를 찾을 수 없습니다.", code: "ASSET_FEATURE_OFF" });
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.deepEqual([w.n.access, w.n.admin, w.n.deps, w.calls.length], [1, 0, 0, 0]);
  assert.equal(bodyRead, false, "본문 스트림을 당겨 읽지 않았다");
  // 대조: 같은 방식의 스트림을 shadow 처리기에 넣으면 읽힌다(위 감지가 실제로 동작한다는 근거)
  let read2 = false;
  const s2 = new ReadableStream({ pull(c) { read2 = true; c.enqueue(new TextEncoder().encode(JSON.stringify(good()))); c.close(); } }, { highWaterMark: 0 });
  const w2 = world();
  const r2 = await handlePostAsset(new Request("http://local/api/aif/assets", { method: "POST", body: s2, duplex: "half" }), shadow(w2));
  assert.deepEqual([r2.status, read2], [200, true]);
});

test("실제 라우트: 권한 없음 → 그 상태·문구 그대로, 이후 호출 0", async () => {
  const w = world({ access: { allowed: false, error: "로그인이 필요합니다.", status: 401 } });
  const res = await POST(req(good()));
  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { error: "로그인이 필요합니다." });
  assert.deepEqual([w.n.admin, w.calls.length], [0, 0]);
});

// ───────────── B) 처리기 (shadow 주입) ─────────────
test("off를 명시 주입: 권한이 있어도 404, 의존성 생성 0·본문 미독", async () => {
  const w = world();
  const r = await handlePostAsset(req("{이건 JSON이 아니다"), { mode: "off", checkAccess: w.checkAccess, getAssetDeps: w.getAssetDeps });
  assert.deepEqual([r.status, r.body.code, w.n.deps, w.calls.length], [404, "ASSET_FEATURE_OFF", 0, 0], "깨진 본문이어도 400이 아니라 404(읽지 않았다)");
});

test("shadow: 권한 거절이 먼저 — 본문·의존성에 닿지 않는다", async () => {
  const w = world({ access: { allowed: false, error: "이용 권한이 없습니다.", status: 403 } });
  const r = await post(w, "{깨진 본문");
  assert.deepEqual([r.status, r.body, w.n.deps, w.calls.length], [403, { error: "이용 권한이 없습니다." }, 0, 0]);
});

test("shadow 정상: 예약 → 업로드(덮어쓰기 금지) → 확정, 응답은 자산 번호와 저장됨뿐", async () => {
  const w = world();
  const r = await post(w, good());
  assert.deepEqual([r.status, r.body], [200, { assetId: ASSET, assetSaved: true }]);
  assert.deepEqual(w.names(), ["aif_asset_reserve", "upload", "aif_asset_finalize"]);
  assert.deepEqual(w.of("aif_asset_reserve")[0].args, { p_user: U, p_kind: "ref_face", p_mime: "image/png", p_ext: "png", p_bytes: PNG.length, p_sha256: await sha(PNG) }, "크기·해시는 서버가 실제 바이트로 계산한 값");
  const up = w.of("upload")[0].args;
  assert.deepEqual([up.path, up.size, up.opts], [`${U}/ref_face/${ASSET}.png`, PNG.length, { contentType: "image/png", upsert: false }]);
  assert.deepEqual(Buffer.from(up.body), Buffer.from(PNG), "올린 바이트가 받은 사진 그대로");
  assert.deepEqual(w.of("aif_asset_finalize")[0].args, { p_asset: ASSET, p_user: U, p_object_id: OBJ });
  assert.equal(w.n.deps, 1);
  assertNoLeak(r);
});

test("세 종류·네 형식이 각자의 kind·MIME·확장자로 저장된다", async () => {
  assert.deepEqual([...REFERENCE_KINDS], ["ref_face", "ref_place", "ref_product"]);
  for (const kind of REFERENCE_KINDS) {
    const w = world();
    assert.equal((await post(w, good({ kind }))).status, 200);
    assert.equal(w.of("aif_asset_reserve")[0].args.p_kind, kind);
    assert.match(w.of("upload")[0].args.path, new RegExp(`^${U}/${kind}/${ASSET}\\.png$`));
  }
  for (const [bytes, mime, ext] of [[JPEG, "image/jpeg", "jpg"], [WEBP, "image/webp", "webp"], [HEIC, "image/heic", "heic"], [HEIC, "image/heif", "heic"]]) {
    const w = world();
    const r = await post(w, good({ image: dataUrl(bytes, mime) }));
    assert.equal(r.status, 200, mime);
    const a = w.of("aif_asset_reserve")[0].args;
    assert.deepEqual([a.p_mime, a.p_ext, a.p_bytes], [mime, ext, bytes.length]);
    assert.equal(w.of("upload")[0].args.opts.contentType, mime);
  }
});

test("본문: 2MiB 초과(선언·실제 스트림)·깨진 JSON·객체가 아닌 본문 → RPC·업로드 0", async () => {
  assert.equal(UPLOAD_BODY_MAX_BYTES, 2 * 1024 * 1024);
  // 선언 길이가 상한 초과
  let w = world();
  let r = await post(w, good(), { "content-length": String(UPLOAD_BODY_MAX_BYTES + 1) });
  assert.deepEqual([r.status, r.body.code, w.calls.length, w.n.deps], [413, "BODY_TOO_LARGE", 0, 0]);
  // 선언은 없고 실제로 읽은 바이트가 상한 초과(스트림)
  w = world();
  const big = "x".repeat(UPLOAD_BODY_MAX_BYTES + 1);
  const stream = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(`{"kind":"ref_face","image":"${big}"}`)); c.close(); } });
  r = await handlePostAsset(new Request("http://local/api/aif/assets", { method: "POST", body: stream, duplex: "half" }), shadow(w));
  assert.deepEqual([r.status, r.body.code, w.calls.length, w.n.deps], [413, "BODY_TOO_LARGE", 0, 0]);
  // 정확히 상한인 본문은 크기 때문에 거절되지 않는다(내용 검사에서 400)
  w = world();
  const head = '{"kind":"ref_face","image":"';
  r = await post(w, head + "x".repeat(UPLOAD_BODY_MAX_BYTES - head.length - 2) + '"}');
  assert.deepEqual([r.status, r.body.code], [400, "IMAGE_INVALID"]);
  for (const body of ["{깨진", "[]", "null", '"text"', "123"]) {
    w = world();
    r = await post(w, body);
    assert.deepEqual([r.status, r.body.code, w.calls.length, w.n.deps], [400, "BODY_INVALID", 0, 0], body);
    assert.equal(r.body.error, UPLOAD_MESSAGES.BODY_INVALID);
  }
});

test("kind: generated·모르는 값·없음·다른 형 → 400, RPC·업로드 0", async () => {
  for (const kind of ["generated", "ref_other", "REF_FACE", "", null, undefined, 1, ["ref_face"]]) {
    const w = world();
    const r = await post(w, { kind, image: dataUrl(PNG, "image/png") });
    assert.deepEqual([r.status, r.body.code, w.calls.length, w.n.deps], [400, "KIND_INVALID", 0, 0], String(kind));
  }
});

test("사진 형식: 선언 MIME과 실제 서명이 다르거나 허용 밖이면 400 — 예약·업로드 0", async () => {
  const cases = [
    [dataUrl(JPEG, "image/png"), "IMAGE_INVALID"],            // PNG라 하고 JPEG
    [dataUrl(PNG, "image/jpeg"), "IMAGE_INVALID"],
    [dataUrl(GIF, "image/png"), "IMAGE_INVALID"],             // GIF 바이트
    [dataUrl(GIF, "image/gif"), "IMAGE_UNSUPPORTED"],         // 허용하지 않는 MIME
    [dataUrl(PNG, "image/svg+xml"), "IMAGE_UNSUPPORTED"],
    [dataUrl(AVIF, "image/heic"), "IMAGE_UNSUPPORTED"],       // AVIF 상자를 HEIC라 함
    [dataUrl(AVIF, "image/png"), "IMAGE_INVALID"],
    ["data:image/png;base64,", "IMAGE_INVALID"],              // 빈 바이트
    ["data:image/png;base64,@@@@", "IMAGE_INVALID"],          // base64 아님
    ["https://example.com/a.png", "IMAGE_INVALID"],           // 원격 주소는 가져오지 않는다
    [undefined, "IMAGE_INVALID"], [null, "IMAGE_INVALID"], [123, "IMAGE_INVALID"], [[dataUrl(PNG, "image/png")], "IMAGE_INVALID"],
  ];
  for (const [image, code] of cases) {
    const w = world();
    const r = await post(w, { kind: "ref_face", image });
    assert.deepEqual([r.status, r.body.code, w.calls.length, w.n.deps], [400, code, 0, 0], String(image).slice(0, 40));
  }
});

test("사진 크기: 디코딩 바이트 정확히 1MiB는 통과, 1MiB + 1바이트는 400(예약·업로드 0)", async () => {
  assert.equal(REF_MAX_BYTES, 1024 * 1024);
  let w = world();
  const exact = sized(PNG_SIG, REF_MAX_BYTES);
  let r = await post(w, good({ image: dataUrl(exact, "image/png") }));
  assert.deepEqual([r.status, r.body.assetSaved, w.of("aif_asset_reserve")[0].args.p_bytes, w.of("upload")[0].args.size], [200, true, REF_MAX_BYTES, REF_MAX_BYTES]);
  w = world();
  r = await post(w, good({ image: dataUrl(sized(PNG_SIG, REF_MAX_BYTES + 1), "image/png") }));
  assert.deepEqual([r.status, r.body.code, w.calls.length, w.n.deps], [400, "IMAGE_TOO_LARGE", 0, 0]);
  assert.equal(r.body.error, UPLOAD_MESSAGES.IMAGE_TOO_LARGE);
});

test("의존성을 만들지 못하면 503 — 저장 호출 0", async () => {
  let w = world({ depsThrows: true });
  let r = await post(w, good());
  assert.deepEqual([r.status, r.body.code, w.calls.length], [503, "ASSET_UNAVAILABLE", 0]);
  assertNoLeak(r);
  w = world();
  r = await handlePostAsset(req(good()), { mode: "shadow", checkAccess: w.checkAccess });
  assert.deepEqual([r.status, r.body.code], [503, "ASSET_UNAVAILABLE"]);
});

test("예약이 한도 초과 → 507, 업로드 0", async () => {
  const w = world({ handlers: { aif_asset_reserve: () => ({ data: null, error: { message: "STORAGE_LIMIT" } }) } });
  const r = await post(w, good());
  assert.deepEqual([r.status, r.body], [507, { error: UPLOAD_MESSAGES.STORAGE_LIMIT, code: "STORAGE_LIMIT" }]);
  assert.deepEqual(w.names(), ["aif_asset_reserve"]);
  assertNoRetry(w);
});

test("예약 실패·응답 모양 이상 → 503, 업로드 0·abort 0(자산 번호를 모른다)", async () => {
  const shapes = [
    () => ({ data: null, error: { message: "duplicate key value boom" } }),
    () => { throw new Error("rpc boom"); },
    () => ({ data: [], error: null }),
    () => ({ data: [{ asset_id: ASSET, path: "x" }, { asset_id: ASSET, path: "y" }], error: null }),
    () => ({ data: [{ asset_id: "not-a-uuid", path: "x" }], error: null }),
    () => ({ data: { asset_id: ASSET }, error: null }),
    () => undefined,
  ];
  for (const reserve of shapes) {
    const w = world({ handlers: { aif_asset_reserve: reserve } });
    const r = await post(w, good());
    assert.deepEqual([r.status, r.body.code], [503, "ASSET_UNAVAILABLE"]);
    assert.deepEqual(w.names(), ["aif_asset_reserve"]);
    assert.equal("assetId" in r.body, false, "저장 안 됨 응답에는 자산 번호가 없다");
    assertNoLeak(r);
  }
});

test("예약이 준 경로가 계약과 다르면 abort 1회, 업로드 0, 503", async () => {
  for (const path of [`${OTHER}/ref_face/${ASSET}.png`, `${U}/generated/${ASSET}.png`, `${U}/ref_face/${ASSET}.jpg`, `${U}/ref_face/../${ASSET}.png`, "", undefined]) {
    const w = world({ handlers: { aif_asset_reserve: () => ({ data: [{ asset_id: ASSET, path }], error: null }) } });
    const r = await post(w, good());
    assert.deepEqual([r.status, r.body.code], [503, "ASSET_UNAVAILABLE"], String(path));
    assert.deepEqual(w.names(), ["aif_asset_reserve", "aif_asset_abort_local"]);
    assert.deepEqual(w.of("aif_asset_abort_local")[0].args, { p_asset: ASSET, p_user: U });
    assert.equal("assetId" in r.body, false);
  }
});

test("업로드 오류·던짐·중복 경로 거절·응답 모양 이상 → 200 불명, abort·재업로드·삭제 0, 대조 1회(기대 id 없음)", async () => {
  const uploads = [
    () => ({ data: null, error: { message: "The resource already exists (duplicate)" } }),
    () => { throw new Error("socket hang up boom"); },
    () => new Promise((_, reject) => setTimeout(() => reject(new Error("timeout boom")), 5)),
    () => ({ data: { id: "not-a-uuid", path: `${U}/ref_face/${ASSET}.png` }, error: null }),
    () => ({ data: { id: OBJ, path: `${OTHER}/ref_face/${ASSET}.png` }, error: null }),
    () => ({ data: {}, error: null }),
    () => null,
  ];
  for (const upload of uploads) {
    const w = world({ handlers: { upload } });
    const r = await post(w, good());
    assert.deepEqual([r.status, r.body], [200, { assetId: ASSET, assetSaved: "unknown", assetCode: "UPLOAD_UNKNOWN" }]);
    assert.deepEqual(w.names(), ["aif_asset_reserve", "upload", "aif_asset_reconcile"]);
    assert.deepEqual(w.of("aif_asset_reconcile")[0].args, { p_asset: ASSET, p_user: U, p_expected_object_id: null });
    assertNoRetry(w);
    assertNoLeak(r);
  }
});

test("확정: ready면 저장됨, 알려진 다른 상태면 불명(대조 0), 응답 불명이면 같은 객체 id로 대조 1회", async () => {
  for (const state of ["unknown", "ASSET_DELETION_IN_PROGRESS", "INVALID_STATE", "NOT_FOUND"]) {
    const w = world({ handlers: { aif_asset_finalize: () => ({ data: state, error: null }) } });
    const r = await post(w, good());
    assert.deepEqual([r.status, r.body], [200, { assetId: ASSET, assetSaved: "unknown", assetCode: "NOT_CONFIRMED" }], state);
    assert.deepEqual(w.names(), ["aif_asset_reserve", "upload", "aif_asset_finalize"]);
  }
  const unclear = [() => ({ data: null, error: { message: "boom" } }), () => { throw new Error("boom"); }, () => ({ data: true, error: null }), () => ({ data: "weird", error: null }), () => undefined];
  for (const finalize of unclear) {
    let w = world({ handlers: { aif_asset_finalize: finalize } });
    let r = await post(w, good());
    assert.deepEqual(r.body, { assetId: ASSET, assetSaved: "unknown", assetCode: "FINALIZE_UNKNOWN" });
    assert.deepEqual(w.names(), ["aif_asset_reserve", "upload", "aif_asset_finalize", "aif_asset_reconcile"]);
    assert.deepEqual(w.of("aif_asset_reconcile")[0].args, { p_asset: ASSET, p_user: U, p_expected_object_id: OBJ });
    assertNoRetry(w);
    // 대조가 ready를 돌려주면 저장됨
    w = world({ handlers: { aif_asset_finalize: finalize, aif_asset_reconcile: () => ({ data: "ready", error: null }) } });
    r = await post(w, good());
    assert.deepEqual(r.body, { assetId: ASSET, assetSaved: true });
  }
});

test("소유권: 본문에 다른 회원 id·경로·자산 id·크기·해시를 넣어도 무시된다 — 세션의 회원으로만, 서버가 계산한 값으로만 저장", async () => {
  const w = world();
  const r = await post(w, { ...good(), userId: OTHER, user_id: OTHER, p_user: OTHER, assetId: OBJ, path: `${OTHER}/ref_face/${OBJ}.png`, bucket: "other", bytes: 1, sha256: "f".repeat(64), mime: "image/jpeg", ext: "jpg" });
  assert.equal(r.status, 200);
  const a = w.of("aif_asset_reserve")[0].args;
  assert.deepEqual(a, { p_user: U, p_kind: "ref_face", p_mime: "image/png", p_ext: "png", p_bytes: PNG.length, p_sha256: await sha(PNG) });
  assert.equal(w.of("upload")[0].args.path.startsWith(`${U}/`), true);
  assert.equal(JSON.stringify(w.calls.map((c) => ({ fn: c.fn, args: { ...c.args, body: undefined } }))).includes(OTHER), false, "어느 호출에도 다른 회원 id가 없다");
  assert.equal(w.of("aif_asset_finalize")[0].args.p_user, U);
});

test("같은 사진을 다시 올리면 새 예약이 한 번 더 생긴다(중복을 합치지 않는다 — 계약대로). 한 요청 안의 자동 재전송은 없다", async () => {
  const w = world();
  await post(w, good());
  await post(w, good());
  assert.deepEqual(w.names(), ["aif_asset_reserve", "upload", "aif_asset_finalize", "aif_asset_reserve", "upload", "aif_asset_finalize"]);
  assert.deepEqual(w.of("aif_asset_reserve")[0].args, w.of("aif_asset_reserve")[1].args);
});

test("응답 모양: 성공·불명·실패 어디에도 경로·버킷·객체 id·해시·오류 원문이 없다", async () => {
  const worlds = [world(), world({ handlers: { upload: () => { throw new Error("boom"); } } }), world({ handlers: { aif_asset_reserve: () => ({ data: null, error: { message: "duplicate boom" } }) } })];
  const keys = [["assetId", "assetSaved"], ["assetCode", "assetId", "assetSaved"], ["code", "error"]];
  for (let i = 0; i < worlds.length; i++) {
    const r = await post(worlds[i], good());
    assert.deepEqual(Object.keys(r.body).sort(), keys[i]);
    assertNoLeak(r);
  }
  for (const m of Object.values(UPLOAD_MESSAGES)) assert.match(m, /(니다|세요)\.$/, "한국어 존댓말 고정 문구");
});

// ───────────── C) 저장 모듈 ─────────────
test("verifyReferenceBytes: 선언 MIME과 서명이 맞을 때만, 1MiB 이하, 서버 SHA-256", async () => {
  for (const [bytes, mime, ext] of [[PNG, "image/png", "png"], [JPEG, "image/jpeg", "jpg"], [WEBP, "image/webp", "webp"], [HEIC, "image/heic", "heic"], [HEIC, "image/heif", "heic"]]) {
    const r = await verifyReferenceBytes(bytes, mime);
    assert.deepEqual(r, { ok: true, value: { mime, ext, bytes: bytes.length, sha256: await sha(bytes) } });
  }
  for (const [bytes, mime, code] of [[JPEG, "image/png", "ASSET_FORMAT"], [GIF, "image/gif", "ASSET_FORMAT"], [AVIF, "image/heic", "ASSET_FORMAT"], [PNG, "toString", "ASSET_FORMAT"], [PNG, undefined, "ASSET_FORMAT"],
    [new Uint8Array(0), "image/png", "ASSET_EMPTY"], ["text", "image/png", "ASSET_EMPTY"], [sized(PNG_SIG, REF_MAX_BYTES + 1), "image/png", "ASSET_TOO_LARGE"]]) {
    assert.deepEqual(await verifyReferenceBytes(bytes, mime), { ok: false, code });
  }
  assert.equal((await verifyReferenceBytes(sized(PNG_SIG, REF_MAX_BYTES), "image/png")).ok, true);
});

test("saveReferenceImage: 참고 이미지 종류만 받는다 — generated·모르는 값은 RPC 0으로 거절", async () => {
  for (const kind of ["generated", "ref_x", undefined, null]) {
    const w = world();
    assert.deepEqual(await saveReferenceImage(w.deps, { userId: U, kind, mime: "image/png", bytes: PNG }), { assetSaved: false, code: "ASSET_FORMAT" });
    assert.equal(w.calls.length, 0);
  }
  const w = world();
  assert.deepEqual(await saveReferenceImage(w.deps, { userId: "not-a-uuid", kind: "ref_face", mime: "image/png", bytes: PNG }), { assetSaved: false, code: "INVALID_USER" });
  assert.equal(w.calls.length, 0);
});

test("생성 원본 저장은 그대로다: 같은 뼈대를 쓰지만 kind는 generated, 1MiB를 넘는 사진도 받는다", async () => {
  const w = world({ handlers: { aif_asset_reserve: (a) => ({ data: [{ asset_id: ASSET, path: `${a.p_user}/generated/${ASSET}.${a.p_ext}` }], error: null }) } });
  const bigPng = sized(PNG_SIG, REF_MAX_BYTES + 10);
  assert.deepEqual(await saveGeneratedOriginal(w.deps, { userId: U, bytes: bigPng }), { assetSaved: true, assetId: ASSET });
  assert.equal(w.of("aif_asset_reserve")[0].args.p_kind, "generated");
  assert.equal(w.of("upload")[0].args.path, `${U}/generated/${ASSET}.png`);
  // 생성 원본은 HEIC를 받지 않는다(참고 이미지와 허용 형식이 다르다)
  const w2 = world();
  assert.deepEqual(await saveGeneratedOriginal(w2.deps, { userId: U, bytes: HEIC }), { assetSaved: false, code: "ASSET_FORMAT" });
  assert.equal(w2.calls.length, 0);
});
