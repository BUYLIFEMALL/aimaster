// W01-G3I 자산 번호 생성 경로 시험 (2026-11-19, CC-SNS-01, Master msg_48484bbd586c, 계약 W00_BASELINE §23). 실제 DB·저장소·키·AI 호출 없음.
//  A) 실제 라우트 파일(src/app/api/aif/generations/route.ts)의 POST — 권한·키·생성·관리자 클라이언트만 가짜 모듈(운영 상수 off).
//  B) 처리기(handlePostGeneration)에 shadow 모드와 가짜 의존성을 넣어 계약의 사례별로 본다(§23-8 표).
//  ★ 한계: 저장소·DB·생성은 전부 가짜다. 저장소 스트림은 시험이 만든 ReadableStream이고, 실제 저장소가 스트림을 어떻게 끊는지·중단 신호에 어떻게 반응하는지는 보지 않는다.
//     사진은 서명만 맞춘 합성 바이트다. 시간 상한 시험은 짧게 줄인 값으로 본다(실제 300초 한도 안에서의 동작이 아니다).
import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

const SRC = new URL("../src/", import.meta.url).href;
const stub = (code) => "data:text/javascript," + encodeURIComponent(code);
const STUBS = {
  "@/lib/access": stub("export const checkProgramAccessApi = (...a) => globalThis.__aifGen.checkAccess(...a);"),
  "@/lib/apiKeys": stub("export const getUserGeminiApiKey = (...a) => globalThis.__aifGen.getApiKey(...a);"),
  "@/lib/gemini": stub("export const generateInfluencerImage = (...a) => globalThis.__aifGen.generate(...a);"),
  "@/lib/supabase/admin": stub("export const createAdminClient = (...a) => globalThis.__aifGen.createAdminClient(...a);"),
};
register(stub(`
const SRC = ${JSON.stringify(SRC)}; const STUBS = ${JSON.stringify(STUBS)};
export async function resolve(s, c, n) {
  if (STUBS[s]) return { url: STUBS[s], shortCircuit: true };
  if (s === "next/server") return n("next/server.js", c);
  if (s.startsWith("@/")) return n(SRC + s.slice(2) + ".ts", c);
  try { return await n(s, c); } catch (e) { if (s.startsWith(".") && !/\\.[a-z]+$/.test(s)) return n(s + ".ts", c); throw e; }
}`));

const { POST } = await import("../src/app/api/aif/generations/route.ts");
const G = await import("../src/lib/assets/generations.ts");
const { handlePostGeneration, GENERATIONS_MESSAGES: M } = G;
const { AIF_ASSETS_MODE, NEED_KEY_MESSAGE, RESPONSE_MAX_BYTES, RESPONSE_TOO_LARGE_MESSAGE } = await import("../src/lib/assets/generation.ts");
const { collectReferences } = await import("../src/lib/referenceImage.ts");

const U = "abcdef01-2345-4789-8abc-def012345678";
const OTHER = "00000000-1111-4222-8333-444444444444";
const NEW_ASSET = "0a0b0c0d-1111-4222-8333-444455556666";
const OBJ = "99999999-aaaa-4bbb-8ccc-dddddddddddd";
const ORIGIN = "https://proj.supabase.co";
const id = (n) => `11111111-2222-4333-8444-${String(n).padStart(12, "0")}`;

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const sized = (head, n, fill = 0) => { const b = new Uint8Array(n).fill(fill); b.set(head); return b; };
const JPEG_HEAD = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00];
const sha = async (bytes) => Buffer.from(await crypto.subtle.digest("SHA-256", bytes)).toString("hex");
const dataUrl = (bytes, mime = "image/png") => `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
const RESULT = dataUrl(sized(PNG_SIG, 80, 7));

const req = (body, headers = {}) => new Request("http://local/api/aif/generations", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), headers });
/** 여러 덩어리로 흘려보내는 스트림 */
const streamOf = (bytes, chunk = 4096) => new ReadableStream({ start(c) { for (let i = 0; i < bytes.length; i += chunk) c.enqueue(bytes.subarray(i, i + chunk)); c.close(); } });

/** 가짜 세계: 자산 행·저장소 객체·호출 기록 */
function world(over = {}) {
  const calls = [];
  const n = { access: 0, key: 0, generate: 0, deps: 0, admin: 0, rows: 0, downloads: 0, signs: 0, aborted: 0 };
  const rows = new Map();
  const objects = new Map();
  const h = {
    aif_asset_precheck: () => ({ data: [{ allowed: true }], error: null }),
    aif_asset_reserve: (a) => ({ data: [{ asset_id: NEW_ASSET, path: `${a.p_user}/generated/${NEW_ASSET}.${a.p_ext}` }], error: null }),
    aif_asset_finalize: () => ({ data: "ready", error: null }),
    aif_asset_reconcile: () => ({ data: "unknown", error: null }),
    aif_asset_abort_local: () => ({ data: "failed", error: null }),
    upload: (path) => ({ data: { id: OBJ, path, fullPath: `aif-assets/${path}` }, error: null }),
    ...over.handlers,
  };
  const assetDeps = {
    storageOrigin: ORIGIN,
    rpc: async (fn, args) => { calls.push(fn); return h[fn](args); },
    storage: { upload: async (path, body, opts) => { calls.push("upload"); return h.upload(path, body, opts); } },
    getAssetRow: async (userId, assetId) => {
      n.rows++; calls.push("row");
      if (over.rowFn) return over.rowFn(userId, assetId);
      const r = rows.get(assetId);
      return { data: r && r.user_id === userId ? { ...r } : null, error: null };
    },
    downloadStream: async (path, signal) => {
      n.downloads++; calls.push("download");
      signal.addEventListener("abort", () => { n.aborted++; });
      if (over.downloadFn) return over.downloadFn(path, signal);
      const bytes = objects.get(path);
      return bytes ? { data: streamOf(bytes), error: null } : { data: null, error: { message: "Object not found boom" } };
    },
    createSignedUrl: async (path, expiresIn) => {
      n.signs++; calls.push("sign");
      if (over.signFn) return over.signFn(path, expiresIn);
      return { data: { signedUrl: `${ORIGIN}/storage/v1/object/sign/aif-assets/${path}?token=abc.def-ghi` }, error: null };
    },
  };
  const w = {
    n, calls, rows, objects, assetDeps,
    checkAccess: async () => { n.access++; return over.access ?? { allowed: true, user: { id: U } }; },
    getApiKey: async () => { n.key++; return "key" in over ? over.key : "member-own-key"; },
    generate: async (apiKey, config) => { n.generate++; w.lastGenerate = { apiKey, config }; if (over.generateThrows) throw new Error(over.generateThrows); return over.image ?? RESULT; },
    createAdminClient: () => { n.admin++; throw new Error("관리자 클라이언트가 만들어지면 안 됨"); },
    getAssetDeps: () => { n.deps++; if (over.depsThrows) throw new Error("deps boom"); return assetDeps; },
    /** 본인(또는 지정 회원)의 ready 참고 자산을 하나 심는다 */
    async put(num, kind, { user = U, bytes = sized(PNG_SIG, 100, num), mime = "image/png", ext = "png", state = "ready", stored } = {}) {
      const assetId = id(num);
      const path = `${user}/${kind}/${assetId}.${ext}`;
      rows.set(assetId, { id: assetId, user_id: user, kind, state, bucket: "aif-assets", path, mime, bytes: bytes.length, sha256: await sha(bytes) });
      objects.set(path, stored ?? bytes);
      return { assetId, path, bytes };
    },
  };
  globalThis.__aifGen = w;
  return w;
}
const shadow = (w, extra = {}) => ({ mode: "shadow", checkAccess: w.checkAccess, getApiKey: w.getApiKey, generate: w.generate, getAssetDeps: w.getAssetDeps, ...extra });
const post = (w, body, extra) => handlePostGeneration(req(body), shadow(w, extra));
const CONFIG = { age: 25, quality: "1K", location: "서울" };
/** 유료 생성·저장이 시작되지 않았어야 한다 */
function assertNothingPaid(w) {
  assert.equal(w.n.generate, 0, "생성 호출 0");
  assert.equal(w.calls.includes("aif_asset_reserve") || w.calls.includes("upload"), false, "예약·업로드 0");
}
function assertNoLeak(r, extra = []) {
  const text = JSON.stringify({ ...r.body, imageUrl: undefined, signedUrl: undefined });   // 서명 주소는 버킷·경로를 담는 것이 정상이라 따로 본다
  for (const leak of [OBJ, "aif-assets", "/ref_face/", "boom", "Object not found", ...extra]) assert.equal(text.includes(leak), false, `응답에 ${leak} 없음`);
  assert.doesNotMatch(text, /[0-9a-f]{64}/, "해시 없음");
  assert.equal(r.headers["Cache-Control"], "no-store");
}

// ───────────── A) 실제 라우트 POST (운영 상수 off) ─────────────
test("운영 상수는 off이고, 실제 라우트는 권한 확인 뒤 404 — 본인 키 조회·본문·관리자 클라이언트·생성에 닿지 않는다", async () => {
  assert.equal(AIF_ASSETS_MODE, "off");
  const w = world();
  let bodyRead = false;
  const stream = new ReadableStream({ pull(c) { bodyRead = true; c.enqueue(new TextEncoder().encode(JSON.stringify({ config: CONFIG }))); c.close(); } }, { highWaterMark: 0 });
  const res = await POST(new Request("http://local/api/aif/generations", { method: "POST", body: stream, duplex: "half" }));
  assert.equal(res.status, 404);
  assert.deepEqual(await res.json(), { error: "자료를 찾을 수 없습니다.", code: "ASSET_FEATURE_OFF" });
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.deepEqual([w.n.access, w.n.key, w.n.admin, w.n.deps, w.n.generate, bodyRead], [1, 0, 0, 0, 0, false]);
});

test("실제 라우트: 권한 없음 → 그 상태·문구 그대로, 이후 호출 0", async () => {
  const w = world({ access: { allowed: false, error: "로그인이 필요합니다.", status: 401 } });
  const res = await POST(req({ config: CONFIG }));
  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { error: "로그인이 필요합니다." });
  assert.deepEqual([w.n.key, w.n.admin, w.n.generate], [0, 0, 0]);
});

// ───────────── B) 처리기 ─────────────
test("종료 순서: 권한 → 모드 → 본인 키 → 본문. 앞에서 끝나면 뒤에 닿지 않는다", async () => {
  // off를 명시: 키 조회 0, 깨진 본문이어도 404
  let w = world();
  let r = await handlePostGeneration(req("{깨진"), { ...shadow(w), mode: "off" });
  assert.deepEqual([r.status, r.body.code, w.n.key, w.n.deps], [404, "ASSET_FEATURE_OFF", 0, 0]);
  // 권한 없음: 모드가 shadow여도 키 조회 0
  w = world({ access: { allowed: false, error: "이용 권한이 없습니다.", status: 403 } });
  r = await post(w, "{깨진");
  assert.deepEqual([r.status, r.body, w.n.key, w.n.deps], [403, { error: "이용 권한이 없습니다." }, 0, 0]);
  // 본인 키 없음: 본문을 읽지 않고(깨진 본문이어도 400 needApiKey) 의존성 0
  w = world({ key: null });
  r = await post(w, "{깨진");
  assert.deepEqual([r.status, r.body, w.n.deps], [400, { error: NEED_KEY_MESSAGE, needApiKey: true }, 0]);
  assertNothingPaid(w);
});

test("참고 자산 없는 생성: 사전 검사 → 생성 1회 → 저장 → 서명 주소. 응답에 이미지 바이트가 없다", async () => {
  const w = world();
  const r = await post(w, { config: CONFIG });
  const path = `${U}/generated/${NEW_ASSET}.png`;
  assert.deepEqual([r.status, r.body], [200, { assetId: NEW_ASSET, assetSaved: true, signedUrl: `${ORIGIN}/storage/v1/object/sign/aif-assets/${path}?token=abc.def-ghi`, expiresIn: 120 }]);
  assert.deepEqual(w.calls, ["aif_asset_precheck", "aif_asset_reserve", "upload", "aif_asset_finalize", "sign"]);
  assert.deepEqual([w.n.generate, w.n.rows, w.n.downloads], [1, 0, 0]);
  assert.deepEqual(w.lastGenerate, { apiKey: "member-own-key", config: CONFIG });
  assert.equal("imageUrl" in r.body, false);
  assertNoLeak(r);
});

test("네 장을 번호로: 서버가 받아 기존 칸에 넣고, 공급자에 붙는 순서는 요청 순서가 아니라 face → place → product(요청 순)다", async () => {
  const w = world();
  const face = await w.put(1, "ref_face");
  const place = await w.put(2, "ref_place", { bytes: sized(JPEG_HEAD, 120, 2), mime: "image/jpeg", ext: "jpg" });
  const p1 = await w.put(3, "ref_product"); const p2 = await w.put(4, "ref_product");
  // 일부러 뒤섞어 보낸다
  const references = [{ assetId: p2.assetId, role: "product" }, { assetId: place.assetId, role: "place" }, { assetId: p1.assetId, role: "product" }, { assetId: face.assetId, role: "face" }];
  const r = await post(w, { config: { ...CONFIG, isAdMode: true }, references });
  assert.equal(r.status, 200);
  assert.equal(w.n.generate, 1);
  const got = w.lastGenerate.config;
  assert.equal(got.personImage, dataUrl(face.bytes));
  assert.equal(got.placeImage, dataUrl(place.bytes, "image/jpeg"));
  assert.deepEqual(got.productImages, [dataUrl(p2.bytes), dataUrl(p1.bytes)], "상품은 요청에 적힌 순서");
  // 기존 생성 코드가 실제로 붙이는 순서(collectReferences)로 확인
  const order = collectReferences(got);
  assert.deepEqual(order.items.map((i) => i.field + (i.index ?? "")), ["personImage", "placeImage", "productImages0", "productImages1"]);
  assert.equal("lastResultImage" in got, false);
  // 행 조회를 모두 마친 뒤에 내려받기를 시작한다
  assert.deepEqual(w.calls.slice(0, 8), ["row", "row", "row", "row", "download", "download", "download", "download"]);
  assert.deepEqual(w.calls.slice(8), ["aif_asset_precheck", "aif_asset_reserve", "upload", "aif_asset_finalize", "sign"]);
});

test("본문: 256KiB 초과(선언·실제 스트림)·깨진 JSON·config 없음 → 400·413, 의존성 0·생성 0", async () => {
  assert.equal(G.GENERATIONS_BODY_MAX_BYTES, 256 * 1024);
  let w = world();
  let r = await handlePostGeneration(req({ config: CONFIG }, { "content-length": String(256 * 1024 + 1) }), shadow(w));
  assert.deepEqual([r.status, r.body.code, w.n.deps], [413, "BODY_TOO_LARGE", 0]);
  w = world();
  const big = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(`{"config":{"x":"${"x".repeat(256 * 1024)}"}}`)); c.close(); } });
  r = await handlePostGeneration(new Request("http://local/x", { method: "POST", body: big, duplex: "half" }), shadow(w));
  assert.deepEqual([r.status, r.body.code, w.n.deps], [413, "BODY_TOO_LARGE", 0]);
  for (const body of ["{깨진", "[]", "null", "{}", '{"config":[]}', '{"config":"x"}', '{"config":null}']) {
    w = world();
    r = await post(w, body);
    assert.deepEqual([r.status, r.body.code, w.n.deps], [400, "BODY_INVALID", 0], body);
    assertNothingPaid(w);
  }
});

test("사진을 본문에 직접 넣은 요청은 거절한다(두 방식 혼용 금지) — 값이 비어 있어도 칸이 있으면 400", async () => {
  for (const [k, v] of [["personImage", dataUrl(sized(PNG_SIG, 10))], ["placeImage", ""], ["productImages", []], ["lastResultImage", null]]) {
    const w = world();
    const r = await post(w, { config: { ...CONFIG, [k]: v } });
    assert.deepEqual([r.status, r.body.code, w.n.deps], [400, "REFERENCE_INLINE_NOT_ALLOWED", 0], k);
    assertNothingPaid(w);
  }
});

test("references 모양·역할: 배열 아님·항목 이상·모르는 role·base_result·중복·개수 초과·쓰이지 않는 role → 400, 행 조회 0·생성 0", async () => {
  const a = id(1), b = id(2), c = id(3), d = id(4), e = id(5);
  const cases = [
    [{ config: CONFIG, references: "x" }, "REFERENCE_INVALID"],
    [{ config: CONFIG, references: {} }, "REFERENCE_INVALID"],
    [{ config: CONFIG, references: [null] }, "REFERENCE_INVALID"],
    [{ config: CONFIG, references: [{ assetId: "not-a-uuid", role: "face" }] }, "REFERENCE_INVALID"],
    [{ config: CONFIG, references: [{ assetId: "ABCDEF01-2222-4333-8444-000000000001", role: "face" }] }, "REFERENCE_INVALID"],   // 대문자 번호는 받지 않는다
    [{ config: CONFIG, references: [{ assetId: a }] }, "REFERENCE_INVALID"],
    [{ config: CONFIG, references: [{ assetId: a, role: "background" }] }, "REFERENCE_ROLE_INVALID"],
    [{ config: CONFIG, references: [{ assetId: a, role: "FACE" }] }, "REFERENCE_ROLE_INVALID"],
    [{ config: { ...CONFIG, feedback: "더 밝게" }, references: [{ assetId: a, role: "base_result" }] }, "REFERENCE_ROLE_UNSUPPORTED"],
    [{ config: CONFIG, references: [{ assetId: a, role: "face" }, { assetId: a, role: "place" }] }, "REFERENCE_INVALID"],           // 같은 자산 두 번
    [{ config: CONFIG, references: [{ assetId: a, role: "face" }, { assetId: b, role: "face" }] }, "REFERENCE_TOO_MANY"],
    [{ config: CONFIG, references: [{ assetId: a, role: "place" }, { assetId: b, role: "place" }] }, "REFERENCE_TOO_MANY"],
    [{ config: { ...CONFIG, isAdMode: true }, references: [a, b, c, d].map((x) => ({ assetId: x, role: "product" })) }, "REFERENCE_TOO_MANY"],
    [{ config: CONFIG, references: [a, b, c, d, e, id(6), id(7), id(8), id(9)].map((x) => ({ assetId: x, role: "product" })) }, "REFERENCE_TOO_MANY"],
    [{ config: CONFIG, references: [{ assetId: a, role: "product" }] }, "REFERENCE_ROLE_NOT_APPLICABLE"],                            // 광고 모드가 아닌데 상품 사진
    [{ config: { ...CONFIG, isAdMode: false }, references: [{ assetId: a, role: "product" }] }, "REFERENCE_ROLE_NOT_APPLICABLE"],
  ];
  for (const [body, code] of cases) {
    const w = world();
    const r = await post(w, body);
    assert.deepEqual([r.status, r.body.code, w.n.deps, w.n.rows], [400, code, 0, 0], code + " " + JSON.stringify(body.references).slice(0, 60));
    assert.equal(r.body.error, M[code]);
    assertNothingPaid(w);
  }
});

test("소유·상태: 다른 회원 자산과 없는 번호는 같은 404, ready가 아니면 409·410 — 내려받기 0·생성 0", async () => {
  // 없는 번호
  let w = world();
  let r = await post(w, { config: CONFIG, references: [{ assetId: id(99), role: "face" }] });
  const notFound = [r.status, r.body];
  assert.deepEqual(notFound, [404, { error: M.REFERENCE_NOT_FOUND, code: "REFERENCE_NOT_FOUND" }]);
  // 다른 회원의 자산(가짜 조회는 회원이 다르면 행을 주지 않는다 — 실제 조회의 조건과 같다)
  w = world();
  const theirs = await w.put(1, "ref_face", { user: OTHER });
  r = await post(w, { config: CONFIG, references: [{ assetId: theirs.assetId, role: "face" }] });
  assert.deepEqual([r.status, r.body], notFound, "존재를 드러내지 않는다");
  assert.equal(w.n.downloads, 0);
  // 조회가 잘못돼 다른 회원의 행이 그대로 돌아와도(조건 누락) 처리기가 다시 확인해 거절한다
  w = world({ rowFn: async (_u, assetId) => ({ data: { id: assetId, user_id: OTHER, kind: "ref_face", state: "ready", bucket: "aif-assets", path: `${OTHER}/ref_face/${assetId}.png`, mime: "image/png", bytes: 10, sha256: "a".repeat(64) }, error: null }) });
  r = await post(w, { config: CONFIG, references: [{ assetId: id(1), role: "face" }] });
  assert.deepEqual([r.status, r.body.code, w.n.downloads], [404, "REFERENCE_NOT_FOUND", 0]);
  assertNothingPaid(w);
  for (const [state, status, code] of [["reserved", 409, "REFERENCE_NOT_READY"], ["unknown", 409, "REFERENCE_NOT_READY"], ["expired", 410, "REFERENCE_UNAVAILABLE"],
    ["missing", 410, "REFERENCE_UNAVAILABLE"], ["failed", 410, "REFERENCE_UNAVAILABLE"], ["weird", 503, "REFERENCE_READ_FAILED"]]) {
    w = world();
    const a = await w.put(1, "ref_face", { state });
    r = await post(w, { config: CONFIG, references: [{ assetId: a.assetId, role: "face" }] });
    assert.deepEqual([r.status, r.body.code, w.n.downloads], [status, code, 0], state);
    assertNothingPaid(w);
  }
});

test("role과 자산 종류가 맞지 않으면 400 — 내려받기 0·생성 0", async () => {
  for (const [kind, role, ad] of [["ref_place", "face", false], ["ref_face", "place", false], ["generated", "face", false], ["ref_face", "product", true], ["generated", "product", true]]) {
    const w = world();
    const a = await w.put(1, kind);
    const r = await post(w, { config: { ...CONFIG, isAdMode: ad }, references: [{ assetId: a.assetId, role }] });
    assert.deepEqual([r.status, r.body.code, w.n.downloads], [400, "REFERENCE_ROLE_INVALID", 0], `${role}에 ${kind}`);
    assertNothingPaid(w);
  }
});

test("행 조회 실패·이상한 행(경로·버킷·크기·해시 모양) → 503, 내려받기 0·생성 0", async () => {
  const base = (assetId) => ({ id: assetId, user_id: U, kind: "ref_face", state: "ready", bucket: "aif-assets", path: `${U}/ref_face/${assetId}.png`, mime: "image/png", bytes: 10, sha256: "a".repeat(64) });
  const fns = [
    async () => ({ data: null, error: { message: "db boom" } }),
    async () => { throw new Error("boom"); },
    async () => undefined,
    async () => ({ data: "text", error: null }),
    async (_u, a) => ({ data: { ...base(a), bucket: "other" }, error: null }),
    async (_u, a) => ({ data: { ...base(a), path: `${OTHER}/ref_face/${a}.png` }, error: null }),
    async (_u, a) => ({ data: { ...base(a), path: `${U}/ref_place/${a}.png` }, error: null }),     // 경로의 종류가 행의 종류와 다르다
    async (_u, a) => ({ data: { ...base(a), path: `${U}/ref_face/${id(77)}.png` }, error: null }),
    async (_u, a) => ({ data: { ...base(a), bytes: "10" }, error: null }),
    async (_u, a) => ({ data: { ...base(a), bytes: 0 }, error: null }),
    async (_u, a) => ({ data: { ...base(a), sha256: null }, error: null }),
    async (_u, a) => ({ data: { ...base(a), sha256: "A".repeat(64) }, error: null }),
    async (_u, a) => ({ data: { ...base(a), mime: 1 }, error: null }),
  ];
  for (const rowFn of fns) {
    const w = world({ rowFn });
    const r = await post(w, { config: CONFIG, references: [{ assetId: id(1), role: "face" }] });
    assert.deepEqual([r.status, r.body.code, w.n.downloads], [503, "REFERENCE_READ_FAILED", 0]);
    assertNothingPaid(w);
    assertNoLeak(r);
  }
});

test("크기 상한: 행의 크기가 1MiB를 넘거나 합계가 2MiB를 넘으면 413 — 내려받기를 시작하지 않는다", async () => {
  assert.equal(G.GENERATIONS_REFERENCE_TOTAL_MAX_BYTES, 2 * 1024 * 1024);
  const MiB = 1024 * 1024;
  let w = world();
  const a = await w.put(1, "ref_face");
  w.rows.get(a.assetId).bytes = MiB + 1;
  let r = await post(w, { config: CONFIG, references: [{ assetId: a.assetId, role: "face" }] });
  assert.deepEqual([r.status, r.body.code, w.n.downloads], [413, "REFERENCE_TOO_LARGE", 0]);
  // 정확히 1MiB 두 장(합계 2MiB)은 통과, 세 번째가 더해지면 초과
  w = world();
  const f = await w.put(1, "ref_face", { bytes: sized(PNG_SIG, MiB, 1) });
  const p = await w.put(2, "ref_place", { bytes: sized(PNG_SIG, MiB, 2) });
  r = await post(w, { config: CONFIG, references: [{ assetId: f.assetId, role: "face" }, { assetId: p.assetId, role: "place" }] });
  assert.deepEqual([r.status, w.n.downloads, w.n.generate], [200, 2, 1]);
  w = world();
  const f2 = await w.put(1, "ref_face", { bytes: sized(PNG_SIG, MiB, 1) });
  const p2 = await w.put(2, "ref_place", { bytes: sized(PNG_SIG, MiB, 2) });
  const q2 = await w.put(3, "ref_product", { bytes: sized(PNG_SIG, 16, 3) });
  r = await post(w, { config: { ...CONFIG, isAdMode: true }, references: [{ assetId: f2.assetId, role: "face" }, { assetId: p2.assetId, role: "place" }, { assetId: q2.assetId, role: "product" }] });
  assert.deepEqual([r.status, r.body.code, w.n.downloads], [413, "REFERENCE_TOO_LARGE", 0]);
  assertNothingPaid(w);
});

test("저장 객체 일치: 받은 길이·SHA-256·서명이 기록과 다르면 502 — 생성 0, 행 상태 무변경", async () => {
  const good = sized(PNG_SIG, 100, 5);
  const variants = [
    ["내용이 다른 같은 크기(해시 불일치)", sized(PNG_SIG, 100, 6)],
    ["짧다", good.subarray(0, 99)],
    ["서명이 다르다(JPEG)", sized(JPEG_HEAD, 100, 5)],
    ["빈 파일", new Uint8Array(0)],
  ];
  for (const [name, stored] of variants) {
    const w = world();
    const a = await w.put(1, "ref_face", { bytes: good, stored });
    const before = JSON.stringify(w.rows.get(a.assetId));
    const r = await post(w, { config: CONFIG, references: [{ assetId: a.assetId, role: "face" }] });
    assert.deepEqual([r.status, r.body], [502, { error: M.REFERENCE_MISMATCH, code: "REFERENCE_MISMATCH" }], name);
    assert.equal(JSON.stringify(w.rows.get(a.assetId)), before, "행을 바꾸지 않는다");
    assertNothingPaid(w);
    assertNoLeak(r);
  }
});

test("스트림 상한: 기록된 크기를 넘는 순간 받기를 끊는다 — 끝없이 흘러오는 스트림도 거기서 멈춘다", async () => {
  let pulled = 0; let cancelled = false;
  // 기록보다 훨씬 긴 스트림(2000덩어리 = 약 2MB). 끝을 둔다 — 상한이 빠진 코드에서도 시험이 멈추지 않고 실패로 끝나게
  const endless = () => new ReadableStream({ pull(c) { pulled++; if (pulled > 2000) { c.close(); return; } c.enqueue(new Uint8Array(1024).fill(9)); }, cancel() { cancelled = true; } }, { highWaterMark: 0 });
  const w = world({ downloadFn: async () => ({ data: endless(), error: null }) });
  const a = await w.put(1, "ref_face", { bytes: sized(PNG_SIG, 3000, 1) });
  const r = await post(w, { config: CONFIG, references: [{ assetId: a.assetId, role: "face" }] });
  assert.deepEqual([r.status, r.body.code], [502, "REFERENCE_MISMATCH"]);
  assert.equal(cancelled, true, "스트림을 취소했다");
  assert.ok(pulled <= 4, `기록된 3000바이트를 넘긴 직후 멈췄다(당긴 덩어리 ${pulled}개)`);
  assert.equal(w.n.aborted, 1, "중단 신호도 보냈다");
  assertNothingPaid(w);
});

test("내려받기 실패·오류·던짐·스트림 아님·읽기 오류 → 503, missing으로 단정하지 않는다(행 무변경)·생성 0", async () => {
  const fns = [
    async () => ({ data: null, error: { message: "Object not found boom" } }),
    async () => { throw new Error("socket boom"); },
    async () => undefined,
    async () => ({ data: "not a stream", error: null }),
    async () => ({ data: new Blob([new Uint8Array(100)]), error: null }),      // 스트림이 아니라 통째 응답이 오면 쓰지 않는다
    async () => ({ data: new ReadableStream({ start(c) { c.error(new Error("stream boom")); } }), error: null }),
    async () => ({ data: new ReadableStream({ start(c) { c.enqueue("text chunk"); c.close(); } }), error: null }),
  ];
  for (const downloadFn of fns) {
    const w = world({ downloadFn });
    const a = await w.put(1, "ref_face");
    const before = JSON.stringify(w.rows.get(a.assetId));
    const r = await post(w, { config: CONFIG, references: [{ assetId: a.assetId, role: "face" }] });
    assert.deepEqual([r.status, r.body.code], [503, "REFERENCE_READ_FAILED"]);
    assert.equal(JSON.stringify(w.rows.get(a.assetId)), before);
    assertNothingPaid(w);
    assertNoLeak(r);
  }
});

test("시간 상한: 행 조회나 내려받기가 돌아오지 않으면 기다리기를 그만두고 503 — 생성하지 않는다", async () => {
  const never = () => new Promise(() => {});
  const limits = { ioTimeoutMs: 30, loadBudgetMs: 200 };
  // 행 조회가 돌아오지 않음
  let w = world({ rowFn: never });
  let t0 = Date.now();
  let r = await post(w, { config: CONFIG, references: [{ assetId: id(1), role: "face" }] }, { limits });
  assert.deepEqual([r.status, r.body.code], [503, "REFERENCE_READ_FAILED"]);
  assert.ok(Date.now() - t0 < 1000);
  assertNothingPaid(w);
  // 내려받기 시작이 돌아오지 않음 → 중단 신호
  w = world({ downloadFn: never });
  const a = await w.put(1, "ref_face");
  r = await post(w, { config: CONFIG, references: [{ assetId: a.assetId, role: "face" }] }, { limits });
  assert.deepEqual([r.status, r.body.code, w.n.aborted], [503, "REFERENCE_READ_FAILED", 1]);
  assertNothingPaid(w);
  // 스트림이 한 덩어리 뒤 멈춤
  w = world({ downloadFn: async () => ({ data: new ReadableStream({ start(c) { c.enqueue(new Uint8Array(10)); } }), error: null }) });
  const b = await w.put(1, "ref_face");
  r = await post(w, { config: CONFIG, references: [{ assetId: b.assetId, role: "face" }] }, { limits });
  assert.deepEqual([r.status, r.body.code], [503, "REFERENCE_READ_FAILED"]);
  assertNothingPaid(w);
  // 합계 예산: 여러 장을 받는 동안 전체 예산이 지나면 남은 장을 시작하지 않는다(가짜 시계)
  let clock = 0;
  w = world({ rowFn: async (_u, assetId) => { clock += 60; const row = w.rows.get(assetId); return { data: { ...row }, error: null }; } });
  const f = await w.put(1, "ref_face"); const p = await w.put(2, "ref_place");
  r = await post(w, { config: CONFIG, references: [{ assetId: f.assetId, role: "face" }, { assetId: p.assetId, role: "place" }] }, { now: () => clock, limits: { ioTimeoutMs: 1000, loadBudgetMs: 100 } });
  assert.deepEqual([r.status, r.body.code, w.n.rows, w.n.downloads], [503, "REFERENCE_READ_FAILED", 2, 0], "두 번째 행 뒤 예산이 지나 내려받기를 시작하지 않았다");
  assertNothingPaid(w);
});

test("시간 예산 합계가 함수 한도 300초 안이다: 참고 20 + 사전 검사 10 + 생성 240 + 저장 20 + 서명 5 = 295초", () => {
  const sum = G.REFERENCE_LOAD_BUDGET_MS + G.GENERATIONS_PRECHECK_TIMEOUT_MS + G.GENERATION_CALL_BUDGET_MS + G.GENERATIONS_SAVE_TIMEOUT_MS + G.GENERATIONS_SIGN_TIMEOUT_MS;
  assert.equal(sum, 295_000);
  assert.ok(sum < G.GENERATIONS_ROUTE_LIMIT_MS);
  assert.ok(G.REFERENCE_IO_TIMEOUT_MS < G.REFERENCE_LOAD_BUDGET_MS);
});

test("저장 한도 사전 검사: 거절 507·확인 불가 503 → 생성 0. 의존성 생성 실패도 503", async () => {
  let w = world({ handlers: { aif_asset_precheck: () => ({ data: [{ allowed: false }], error: null }) } });
  let r = await post(w, { config: CONFIG });
  assert.deepEqual([r.status, r.body], [507, { error: M.STORAGE_LIMIT, code: "STORAGE_LIMIT" }]);
  assertNothingPaid(w);
  for (const precheck of [() => ({ data: null, error: { message: "boom" } }), () => { throw new Error("boom"); }, () => ({ data: [], error: null }), () => new Promise(() => {})]) {
    w = world({ handlers: { aif_asset_precheck: precheck } });
    r = await post(w, { config: CONFIG }, { limits: { precheckMs: 30 } });
    assert.deepEqual([r.status, r.body.code], [503, "ASSET_PRECHECK_UNAVAILABLE"]);
    assertNothingPaid(w);
  }
  w = world({ depsThrows: true });
  r = await post(w, { config: CONFIG });
  assert.deepEqual([r.status, r.body.code], [503, "ASSET_UNAVAILABLE"]);
  assertNothingPaid(w);
});

test("서명 실패: 저장은 확인됐으므로 자산 번호를 그대로 돌려주고 signedUrl은 null — 생성·저장을 다시 하지 않는다", async () => {
  const path = `${U}/generated/${NEW_ASSET}.png`;
  const signs = [
    async () => ({ data: null, error: { message: "sign boom" } }),
    async () => { throw new Error("boom"); },
    async () => ({ data: { signedUrl: `https://evil.example/storage/v1/object/sign/aif-assets/${path}?token=abc` }, error: null }),    // 우리 저장소 주소가 아니다
    async () => ({ data: { signedUrl: `${ORIGIN}/storage/v1/object/sign/aif-assets/${U}/generated/${id(5)}.png?token=abc` }, error: null }),   // 다른 경로
    async () => ({ data: { signedUrl: `${ORIGIN}/storage/v1/object/sign/aif-assets/${path}?token=a&download=1` }, error: null }),
    async () => new Promise(() => {}),
  ];
  for (const signFn of signs) {
    const w = world({ signFn });
    const r = await post(w, { config: CONFIG }, { limits: { signMs: 30 } });
    assert.deepEqual([r.status, r.body], [200, { assetId: NEW_ASSET, assetSaved: true, signedUrl: null }]);
    assert.deepEqual([w.n.generate, w.n.signs, w.calls.filter((c) => c === "upload").length], [1, 1, 1]);
    assertNoLeak(r, ["evil.example"]);
  }
});

test("저장 불명·안 됨: 응답에 이미지를 싣는다(서명 0). 그 응답이 상한을 넘으면 기존 422 계약 — 어느 경우에도 생성은 1회", async () => {
  // 불명(업로드 실패)
  let w = world({ handlers: { upload: () => { throw new Error("boom"); } } });
  let r = await post(w, { config: CONFIG });
  assert.deepEqual([r.status, r.body], [200, { success: true, imageUrl: RESULT, assetSaved: "unknown", assetId: NEW_ASSET, assetCode: "UPLOAD_UNKNOWN" }]);
  assert.deepEqual([w.n.generate, w.n.signs], [1, 0]);
  // 안 됨(예약 실패)
  w = world({ handlers: { aif_asset_reserve: () => ({ data: null, error: { message: "boom" } }) } });
  r = await post(w, { config: CONFIG });
  assert.deepEqual([r.status, r.body], [200, { success: true, imageUrl: RESULT, assetSaved: false, assetCode: "RESERVE_FAILED" }]);
  // 안 됨(생성 결과가 이미지가 아님)
  w = world({ image: "https://example.com/not-a-data-url" });
  r = await post(w, { config: CONFIG });
  assert.deepEqual([r.status, r.body.assetSaved, r.body.assetCode, r.body.imageUrl], [200, false, "ASSET_FORMAT", "https://example.com/not-a-data-url"]);
  // 저장이 시간 상한을 넘김 → 불명
  w = world({ handlers: { upload: () => new Promise(() => {}) } });
  r = await post(w, { config: CONFIG }, { limits: { saveMs: 30 } });
  assert.deepEqual([r.status, r.body.assetSaved, r.body.assetCode, r.body.imageUrl], [200, "unknown", "SAVE_TIMEOUT", RESULT]);
  assert.equal(w.n.generate, 1);
  // 큰 결과 + 저장 불명 → 기존 응답 상한 보호(422, 이미지 없음)
  const bigImage = dataUrl(sized(PNG_SIG, 3_200_000, 1));
  assert.ok(bigImage.length > RESPONSE_MAX_BYTES);
  w = world({ image: bigImage, handlers: { upload: () => { throw new Error("boom"); } } });
  r = await post(w, { config: CONFIG });
  assert.deepEqual([r.status, r.body], [422, { error: RESPONSE_TOO_LARGE_MESSAGE, imageOmitted: true, code: "RESPONSE_TOO_LARGE", assetSaved: "unknown", assetId: NEW_ASSET, assetCode: "UPLOAD_UNKNOWN" }]);
  assert.equal(w.n.generate, 1);
  // 큰 결과 + 저장 확인 → 이미지 바이트가 응답에 없으므로 상한과 무관하게 200
  w = world({ image: bigImage });
  r = await post(w, { config: CONFIG });
  assert.deepEqual([r.status, r.body.assetSaved, "imageUrl" in r.body], [200, true, false]);
  assert.ok(JSON.stringify(r.body).length < 600);
});

test("생성 실패: 500과 생성 함수의 안내 문구, 저장·서명 0, 재호출 0", async () => {
  const w = world({ generateThrows: "이미지 모델이 응답하지 않았습니다. 잠시 뒤 다시 시도해 주세요." });
  const a = await w.put(1, "ref_face");
  const r = await post(w, { config: CONFIG, references: [{ assetId: a.assetId, role: "face" }] });
  assert.deepEqual([r.status, r.body], [500, { error: "이미지 모델이 응답하지 않았습니다. 잠시 뒤 다시 시도해 주세요." }]);
  assert.deepEqual([w.n.generate, w.n.signs, w.calls.includes("aif_asset_reserve")], [1, 0, false]);
});

test("소유: 본문의 다른 회원 id·경로는 쓰이지 않는다 — 행 조회·사전 검사·저장 모두 세션의 회원으로", async () => {
  const seen = [];
  const w = world();
  const a = await w.put(1, "ref_face");
  const realRow = w.assetDeps.getAssetRow;
  w.assetDeps.getAssetRow = async (userId, assetId) => { seen.push(userId); return realRow(userId, assetId); };
  const r = await post(w, { config: { ...CONFIG, userId: OTHER }, userId: OTHER, user_id: OTHER, references: [{ assetId: a.assetId, role: "face", userId: OTHER, path: `${OTHER}/ref_face/x.png` }] });
  assert.equal(r.status, 200);
  assert.deepEqual(seen, [U]);
  assert.equal(r.body.signedUrl.includes(`/${U}/generated/`), true);
  assert.equal(r.body.signedUrl.includes(OTHER), false);
});

test("불변: 어떤 사례에서도 생성은 최대 1회이고, 성공·실패 응답에 경로·버킷·객체 id·해시·오류 원문이 없다", async () => {
  const worlds = [
    [world(), { config: CONFIG }],
    [world({ handlers: { upload: () => { throw new Error("boom"); } } }), { config: CONFIG }],
    [world({ handlers: { aif_asset_finalize: () => ({ data: null, error: { message: "boom" } }) } }), { config: CONFIG }],
    [world({ generateThrows: "생성 실패 안내" }), { config: CONFIG }],
    [world({ signFn: async () => ({ data: null, error: { message: "boom" } }) }), { config: CONFIG }],
  ];
  for (const [w, body] of worlds) {
    const r = await post(w, body);
    assert.ok(w.n.generate <= 1);
    assert.ok(w.calls.filter((c) => c === "upload").length <= 1, "업로드 최대 1회");
    assert.ok(w.calls.filter((c) => c === "aif_asset_reserve").length <= 1, "예약 최대 1회");
    assert.equal(w.calls.some((c) => /delete|remove/.test(c)), false);
    const text = JSON.stringify({ ...r.body, imageUrl: undefined, signedUrl: undefined });
    for (const leak of [OBJ, "aif-assets", "boom", `${U}/generated`]) assert.equal(text.includes(leak), false, leak);
  }
  for (const m of Object.values(M)) assert.match(m, /(니다|세요)\.$/, "한국어 존댓말 고정 문구");
});
