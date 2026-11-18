// W01-A1 생성 라우트 연결 통합 시험 (2026-11-18, CC-SNS-01). 실제 DB·저장소·업로드·AI 호출 없음.
//  A) 실제 라우트 파일(src/app/api/generate-image/route.ts)의 POST를 그대로 부른다 — 권한·키·생성·관리자 클라이언트만 가짜 모듈로 바꾼다(운영 상수는 off).
//  B) 조정 계층(handleGenerateImagePost)에 shadow 모드와 가짜 rpc/storage를 명시적으로 넣어 본다.
import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

// 시험 전용 해석기: "@/…"는 src로, 확장자 없는 상대 import는 .ts로, 바깥 의존(권한·키·생성·관리자 클라이언트)은 globalThis.__aif 가짜로 연결(패키지·tsconfig 변경 없음)
const SRC = new URL("../src/", import.meta.url).href;
const stub = (code) => "data:text/javascript," + encodeURIComponent(code);
const STUBS = {
  "@/lib/access": stub("export const checkProgramAccessApi = (...a) => globalThis.__aif.checkAccess(...a);"),
  "@/lib/apiKeys": stub("export const getUserGeminiApiKey = (...a) => globalThis.__aif.getApiKey(...a);"),
  "@/lib/gemini": stub("export const generateInfluencerImage = (...a) => globalThis.__aif.generate(...a);"),
  "@/lib/supabase/admin": stub("export const createAdminClient = (...a) => globalThis.__aif.createAdminClient(...a);"),
};
register(stub(`
const SRC = ${JSON.stringify(SRC)}; const STUBS = ${JSON.stringify(STUBS)};
export async function resolve(s, c, n) {
  if (STUBS[s]) return { url: STUBS[s], shortCircuit: true };
  if (s === "next/server") return n("next/server.js", c);   // 실제 Next 모듈(NextResponse) — Node ESM은 확장자가 필요
  if (s.startsWith("@/")) return n(SRC + s.slice(2) + ".ts", c);
  try { return await n(s, c); } catch (e) { if (s.startsWith(".") && !/\\.[a-z]+$/.test(s)) return n(s + ".ts", c); throw e; }
}`));

const { POST } = await import("../src/app/api/generate-image/route.ts");
const { handleGenerateImagePost, AIF_ASSETS_MODE, NEED_KEY_MESSAGE } = await import("../src/lib/assets/generation.ts");
const { JSON_BODY_MAX_BYTES } = await import("../src/lib/referenceImage.ts");

const U = "abcdef01-2345-4789-8abc-def012345678";
const ASSET = "0a0b0c0d-1111-4222-8333-444455556666";
const OBJ = "99999999-aaaa-4bbb-8ccc-dddddddddddd";
const PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const IMAGE = "data:image/png;base64," + PNG_B64;
const req = (body, headers = {}) => new Request("http://local/api/generate-image", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), headers });

/** 바깥 의존 가짜 + 호출 횟수 */
function world(over = {}) {
  const n = { access: 0, key: 0, generate: 0, admin: 0 };
  const w = {
    n,
    checkAccess: async () => { n.access++; return over.access ?? { allowed: true, user: { id: U } }; },
    getApiKey: async () => { n.key++; return "key" in over ? over.key : "member-own-key"; },
    generate: async (...a) => { n.generate++; if (over.generateThrows) throw new Error(over.generateThrows); w.lastGenerateArgs = a; return over.image ?? IMAGE; },
    createAdminClient: () => { n.admin++; throw new Error("관리자 클라이언트가 만들어지면 안 됨"); },
  };
  globalThis.__aif = w;
  return w;
}
/** shadow용 가짜 rpc/storage */
function assets(over = {}) {
  const calls = [];
  const h = {
    aif_asset_precheck: () => ({ data: [{ allowed: true }], error: null }),
    aif_asset_reserve: (a) => ({ data: [{ asset_id: ASSET, path: `${a.p_user}/generated/${ASSET}.${a.p_ext}` }], error: null }),
    aif_asset_finalize: () => ({ data: "ready", error: null }),
    aif_asset_reconcile: () => ({ data: "unknown", error: null }),
    aif_asset_abort_local: () => ({ data: "failed", error: null }),
    upload: (path) => ({ data: { id: OBJ, path, fullPath: "aif-assets/" + path }, error: null }),
    ...over,
  };
  let created = 0;
  const deps = { rpc: async (fn, args) => { calls.push(fn); return h[fn](args); }, storage: { upload: async (p, b, o) => { calls.push("upload"); return h.upload(p, b, o); } } };
  return { calls, getAssetDeps: () => { created++; return deps; }, created: () => created };
}
const shadow = (w, a, extra = {}) => ({ mode: "shadow", checkAccess: w.checkAccess, getApiKey: w.getApiKey, generate: w.generate, getAssetDeps: a?.getAssetDeps, ...extra });
const json = async (res) => ({ status: res.status, body: await res.json() });

// ───────────── A) 실제 라우트 POST (운영 상수 off) ─────────────
test("운영 상수는 off", () => assert.equal(AIF_ASSETS_MODE, "off"));

test("실제 라우트: 권한 없음 → 그 상태·문구 그대로, 키 조회·생성 0", async () => {
  const w = world({ access: { allowed: false, error: "로그인이 필요합니다.", status: 401 } });
  assert.deepEqual(await json(await POST(req({}))), { status: 401, body: { error: "로그인이 필요합니다." } });
  assert.deepEqual(w.n, { access: 1, key: 0, generate: 0, admin: 0 });
});

test("실제 라우트: 본인 키 없음 → 400 needApiKey, 생성 0", async () => {
  const w = world({ key: null });
  assert.deepEqual(await json(await POST(req({}))), { status: 400, body: { error: NEED_KEY_MESSAGE, needApiKey: true } });
  assert.deepEqual(w.n, { access: 1, key: 1, generate: 0, admin: 0 });
});

test("실제 라우트: 요청 검증 실패(잘못된 참고 이미지·깨진 JSON·3MiB 초과) → 생성 0", async () => {
  for (const [r, status, code] of [
    [req({ personImage: "https://x/y.jpg" }), 400, "REFERENCE_INVALID"],
    [req("{bad"), 400, "BODY_INVALID"],
    [req("x".repeat(JSON_BODY_MAX_BYTES + 1)), 413, "BODY_TOO_LARGE"],
  ]) {
    const w = world();
    const out = await json(await POST(r));
    assert.equal(out.status, status);
    assert.equal(out.body.code, code);
    assert.deepEqual(w.n, { access: 1, key: 1, generate: 0, admin: 0 });
  }
});

test("실제 라우트(off): 정상 생성 — 응답 모양 예전 그대로, 생성 1회, 관리자 클라이언트·저장 0", async () => {
  const w = world();
  const out = await json(await POST(req({ gender: "f", quality: "2K" })));
  assert.deepEqual(out, { status: 200, body: { success: true, imageUrl: IMAGE } });
  assert.deepEqual(w.n, { access: 1, key: 1, generate: 1, admin: 0 });
  assert.equal(w.lastGenerateArgs[0], "member-own-key", "회원 본인 키로 생성");
  assert.deepEqual(w.lastGenerateArgs[1], { gender: "f", quality: "2K" });
});

test("실제 라우트: 요청 머리글·본문으로는 원본 저장을 켤 수 없다", async () => {
  const w = world();
  const out = await json(await POST(req({ AIF_ASSETS_MODE: "shadow", mode: "shadow", assetsMode: "shadow" }, { "x-aif-assets-mode": "shadow", "aif-assets-mode": "shadow" })));
  assert.deepEqual(Object.keys(out.body).sort(), ["imageUrl", "success"]);
  assert.equal(w.n.admin, 0);
});

test("실제 라우트: 생성 실패 → 500 문구 전달", async () => {
  const w = world({ generateThrows: "본인 키 한도" });
  assert.deepEqual(await json(await POST(req({}))), { status: 500, body: { error: "본인 키 한도" } });
  assert.equal(w.n.admin, 0);
});

// ───────────── B) 조정 계층 — shadow(명시 주입) ─────────────
test("off를 명시 주입: 자산 의존성 생성 0", async () => {
  const w = world(), a = assets();
  const out = await handleGenerateImagePost(req({}), { ...shadow(w, a), mode: "off" });
  assert.deepEqual(out, { status: 200, body: { success: true, imageUrl: IMAGE } });
  assert.equal(a.created(), 0);
  assert.deepEqual(a.calls, []);
});

test("shadow: 권한·키·요청 검증이 먼저 — 실패하면 사전 검사·자산 의존성 0", async () => {
  for (const [w, r] of [[world({ access: { allowed: false, error: "x", status: 403 } }), req({})], [world({ key: null }), req({})], [world(), req({ placeImage: 0 })], [world(), req("{bad")]]) {
    const a = assets();
    const out = await handleGenerateImagePost(r, shadow(w, a));
    assert.notEqual(out.status, 200);
    assert.equal(w.n.generate, 0);
    assert.equal(a.created(), 0);
    assert.deepEqual(a.calls, []);
  }
});

test("shadow: 사전 검사 denied → 507 용량 안내, 생성 0", async () => {
  const w = world(), a = assets({ aif_asset_precheck: () => ({ data: [{ allowed: false }], error: null }) });
  const out = await handleGenerateImagePost(req({ quality: "4K" }), shadow(w, a));
  assert.equal(out.status, 507);
  assert.equal(out.body.code, "STORAGE_LIMIT");
  assert.equal(w.n.generate, 0);
  assert.deepEqual(a.calls, ["aif_asset_precheck"]);
});

test("shadow: 사전 검사 확인 불가(오류·던짐·이상한 모양·의존성 없음·의존성 생성 실패·시간 초과) → 503, 생성 0", async () => {
  const cases = [
    (w) => shadow(w, assets({ aif_asset_precheck: () => ({ data: null, error: { message: "function does not exist" } }) })),
    (w) => shadow(w, assets({ aif_asset_precheck: () => { throw new Error("net"); } })),
    (w) => shadow(w, assets({ aif_asset_precheck: () => ({ data: { allowed: true }, error: null }) })),
    (w) => shadow(w, null),
    (w) => shadow(w, { getAssetDeps: () => { throw new Error("env missing"); } }),
    (w) => shadow(w, assets({ aif_asset_precheck: () => new Promise(() => {}) }), { timeouts: { precheckMs: 30 } }),
  ];
  for (const mk of cases) {
    const w = world();
    const out = await handleGenerateImagePost(req({}), mk(w));
    assert.equal(out.status, 503);
    assert.equal(out.body.code, "ASSET_PRECHECK_UNAVAILABLE");
    assert.equal(w.n.generate, 0, "확인 불가면 유료 생성 0(fail-closed)");
  }
});

test("shadow: allowed → 생성 1회 + 저장 1회, 기존 imageUrl 유지 + assetSaved/assetId 추가", async () => {
  const w = world(), a = assets();
  const out = await handleGenerateImagePost(req({ quality: "1K" }), shadow(w, a));
  assert.deepEqual(out, { status: 200, body: { success: true, imageUrl: IMAGE, assetSaved: true, assetId: ASSET } });
  assert.equal(w.n.generate, 1);
  assert.equal(a.created(), 1, "자산 의존성은 한 번만 만든다");
  assert.deepEqual(a.calls, ["aif_asset_precheck", "aif_asset_reserve", "upload", "aif_asset_finalize"]);
});

test("shadow: 저장 실패·불명이어도 생성 결과는 그대로, 추가 생성·재저장 0", async () => {
  const cases = [
    [{ upload: () => { throw new Error("timeout"); } }, "unknown", "UPLOAD_UNKNOWN", true],
    [{ aif_asset_finalize: () => ({ data: "unknown", error: null }) }, "unknown", "NOT_CONFIRMED", true],
    [{ aif_asset_reserve: () => ({ data: null, error: { message: "STORAGE_LIMIT" } }) }, false, "STORAGE_LIMIT", false],
    [{ aif_asset_reserve: () => { throw new Error("x"); } }, false, "RESERVE_FAILED", false],
  ];
  for (const [over, saved, code, hasId] of cases) {
    const w = world(), a = assets(over);
    const out = await handleGenerateImagePost(req({}), shadow(w, a));
    assert.equal(out.status, 200, code);
    assert.equal(out.body.imageUrl, IMAGE, "생성 결과 보존");
    assert.equal(out.body.success, true);
    assert.equal(out.body.assetSaved, saved);
    assert.equal(out.body.assetCode, code);
    assert.equal("assetId" in out.body, hasId);
    assert.equal(w.n.generate, 1, "추가 생성 0");
    assert.ok(a.calls.filter((c) => c === "upload").length <= 1, "재업로드 0");
  }
});

test("shadow: 생성 결과가 data URL이 아니거나 형식이 맞지 않으면 저장 0, 결과는 그대로", async () => {
  for (const image of ["https://cdn.example/x.png", "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"]) {
    const w = world({ image }), a = assets();
    const out = await handleGenerateImagePost(req({}), shadow(w, a));
    assert.deepEqual(out, { status: 200, body: { success: true, imageUrl: image, assetSaved: false, assetCode: "ASSET_FORMAT" } });
    assert.deepEqual(a.calls, ["aif_asset_precheck"], "예약·업로드 0");
  }
});

test("shadow: 저장이 시간 상한을 넘기면 불명으로 알리고 생성 결과는 그대로", async () => {
  const w = world(), a = assets({ upload: () => new Promise(() => {}) });
  const out = await handleGenerateImagePost(req({}), shadow(w, a, { timeouts: { saveMs: 30 } }));
  assert.deepEqual(out, { status: 200, body: { success: true, imageUrl: IMAGE, assetSaved: "unknown", assetCode: "SAVE_TIMEOUT" } });
  assert.equal(w.n.generate, 1);
});

test("shadow: 생성이 실패하면 500, 저장 0", async () => {
  const w = world({ generateThrows: "모델 오류" }), a = assets();
  const out = await handleGenerateImagePost(req({}), shadow(w, a));
  assert.deepEqual(out, { status: 500, body: { error: "모델 오류" } });
  assert.deepEqual(a.calls, ["aif_asset_precheck"]);
});
