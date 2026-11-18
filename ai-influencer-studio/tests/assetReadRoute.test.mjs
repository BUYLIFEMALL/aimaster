// W01-A1 자산 조회 경로 시험 (2026-11-18, CC-SNS-01). 실제 DB·저장소·키·AI 호출 없음.
//  A) 실제 라우트 파일(src/app/api/aif/assets/[id]/route.ts)의 GET — 권한·관리자 클라이언트만 가짜 모듈(운영 상수 off).
//  B) 조회 처리(handleGetAsset)에 shadow 모드와 가짜 조회·서명 함수를 명시적으로 넣어 본다.
import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

const SRC = new URL("../src/", import.meta.url).href;
const stub = (code) => "data:text/javascript," + encodeURIComponent(code);
const STUBS = {
  "@/lib/access": stub("export const checkProgramAccessApi = (...a) => globalThis.__aifRead.checkAccess(...a);"),
  "@/lib/supabase/admin": stub("export const createAdminClient = (...a) => globalThis.__aifRead.createAdminClient(...a);"),
};
register(stub(`
const SRC = ${JSON.stringify(SRC)}; const STUBS = ${JSON.stringify(STUBS)};
export async function resolve(s, c, n) {
  if (STUBS[s]) return { url: STUBS[s], shortCircuit: true };
  if (s === "next/server") return n("next/server.js", c);
  if (s.startsWith("@/")) return n(SRC + s.slice(2) + ".ts", c);
  try { return await n(s, c); } catch (e) { if (s.startsWith(".") && !/\\.[a-z]+$/.test(s)) return n(s + ".ts", c); throw e; }
}`));

const { GET } = await import("../src/app/api/aif/assets/[id]/route.ts");
const { handleGetAsset, SIGNED_URL_TTL_SECONDS } = await import("../src/lib/assets/read.ts");
const { AIF_ASSETS_MODE } = await import("../src/lib/assets/generation.ts");

const U = "abcdef01-2345-4789-8abc-def012345678";
const OTHER = "00000000-1111-4222-8333-444444444444";
const ASSET = "0a0b0c0d-1111-4222-8333-444455556666";
const OBJ = "99999999-aaaa-4bbb-8ccc-dddddddddddd";
const PATH = `${U}/generated/${ASSET}.png`;
const SIGNED = "https://example.supabase.co/storage/v1/object/sign/aif-assets/x?token=SECRETTOKEN";
const okRow = (over = {}) => ({ id: ASSET, user_id: U, state: "ready", bucket: "aif-assets", path: PATH, object_id: OBJ, mime: "image/png", bytes: 70, ...over });

function world(access) {
  const n = { access: 0, admin: 0 };
  globalThis.__aifRead = {
    checkAccess: async () => { n.access++; return access ?? { allowed: true, user: { id: U } }; },
    createAdminClient: () => { n.admin++; throw new Error("관리자 클라이언트가 만들어지면 안 됨"); },
  };
  return n;
}
/** shadow 주입물. row·sign을 바꿔 가며 호출 기록을 남긴다 */
function shadow(over = {}) {
  const calls = [];
  let created = 0;
  const read = {
    storageOrigin: "storageOrigin" in over ? over.storageOrigin : "https://example.supabase.co",
    getAssetRow: async (userId, assetId) => { calls.push(["row", userId, assetId]); return typeof over.row === "function" ? over.row() : { data: "row" in over ? over.row : okRow(), error: null }; },
    createSignedUrl: async (path, ttl) => { calls.push(["sign", path, ttl]); return typeof over.sign === "function" ? over.sign() : { data: { signedUrl: SIGNED }, error: null }; },
  };
  const deps = { mode: "shadow", checkAccess: async () => over.access ?? { allowed: true, user: { id: U } }, getReadDeps: "getReadDeps" in over ? over.getReadDeps : () => { created++; return read; } };
  return { deps, calls, created: () => created };
}
const noStore = (r) => assert.equal(r.headers["Cache-Control"], "no-store");
const UNAVAILABLE = "ASSET_TEMPORARILY_UNAVAILABLE";

// ───────────── A) 실제 라우트 GET (운영 상수 off) ─────────────
const callRoute = async (id) => {
  const res = await GET(new Request(`http://local/api/aif/assets/${id}`, { headers: { "x-aif-assets-mode": "shadow" } }), { params: Promise.resolve({ id }) });
  return { status: res.status, body: await res.json(), cache: res.headers.get("cache-control") };
};

test("운영 상수는 off", () => assert.equal(AIF_ASSETS_MODE, "off"));

test("실제 라우트: 권한 없음 → 기존 상태·문구 그대로, 관리자 클라이언트 0, no-store", async () => {
  for (const access of [{ allowed: false, error: "로그인이 필요합니다.", status: 401 }, { allowed: false, error: "이 프로그램의 이용 권한이 없습니다. 메인 사이트에서 이용 권한을 확인해주세요.", status: 403 }]) {
    const n = world(access);
    const r = await callRoute(ASSET);
    assert.deepEqual([r.status, r.body], [access.status, { error: access.error }]);
    assert.equal(r.cache, "no-store");
    assert.deepEqual(n, { access: 1, admin: 0 });
  }
});

test("실제 라우트(off): 로그인 회원도 404 ASSET_FEATURE_OFF — 머리글로 켤 수 없고 자산용 DB·저장소 0", async () => {
  for (const id of [ASSET, "not-a-uuid", "../../etc"]) {
    const n = world();
    const r = await callRoute(id);
    assert.deepEqual([r.status, r.body.code, r.cache], [404, "ASSET_FEATURE_OFF", "no-store"]);
    assert.deepEqual(n, { access: 1, admin: 0 });
  }
});

// ───────────── B) 조회 처리 — shadow(명시 주입) ─────────────
test("off 명시 주입: 조회 의존성 생성 0", async () => {
  const s = shadow();
  const r = await handleGetAsset({ ...s.deps, mode: "off" }, ASSET);
  assert.equal(r.body.code, "ASSET_FEATURE_OFF");
  assert.equal(s.created(), 0);
  noStore(r);
});

test("shadow: 권한이 먼저 — 권한 없으면 조회 0", async () => {
  const s = shadow({ access: { allowed: false, error: "x", status: 403 } });
  const r = await handleGetAsset(s.deps, ASSET);
  assert.deepEqual([r.status, r.body], [403, { error: "x" }]);
  assert.equal(s.created(), 0);
  noStore(r);
});

test("shadow: id가 표준 UUID가 아니면 404, 조회 0", async () => {
  for (const id of ["x", ASSET.toUpperCase(), ASSET + "\n", " " + ASSET, "", null, undefined, 1, {}, `${ASSET}/../${OTHER}`]) {
    const s = shadow();
    const r = await handleGetAsset(s.deps, id);
    assert.deepEqual([r.status, r.body.code], [404, "ASSET_NOT_FOUND"], String(id));
    assert.deepEqual(s.calls, []);
    noStore(r);
  }
});

test("shadow: 정상 ready → 본인 id+uid로 조회, 짧은 서명 URL, no-store, 행의 path·object_id·user_id 필드는 응답에 싣지 않음(서명 URL 문자열 안의 경로는 별개)", async () => {
  const s = shadow();
  const r = await handleGetAsset(s.deps, ASSET);
  assert.deepEqual(r.body, { id: ASSET, state: "ready", signedUrl: SIGNED, expiresIn: SIGNED_URL_TTL_SECONDS, mime: "image/png", bytes: 70 });
  assert.equal(r.status, 200);
  noStore(r);
  assert.deepEqual(s.calls, [["row", U, ASSET], ["sign", PATH, SIGNED_URL_TTL_SECONDS]]);
  assert.ok(SIGNED_URL_TTL_SECONDS <= 300, "짧은 수명");
  assert.ok(!("path" in r.body) && !("object_id" in r.body) && !("user_id" in r.body));
});

test("shadow: 본인 행이 없거나(타 회원 포함) 응답 행의 소유·id가 다르면 같은 404, 서명 0", async () => {
  for (const row of [null, undefined, okRow({ user_id: OTHER }), okRow({ id: OTHER })]) {
    const s = shadow({ row });
    const r = await handleGetAsset(s.deps, ASSET);
    assert.deepEqual([r.status, r.body.code], [404, "ASSET_NOT_FOUND"]);
    assert.ok(!s.calls.some((c) => c[0] === "sign"));
    assert.ok(!JSON.stringify(r.body).includes(OTHER), "다른 회원 정보 미노출");
    noStore(r);
  }
});

test("shadow: 행 조회 오류·던짐·모양 이상 → 503(없음으로 단정하지 않음), 서명 0", async () => {
  const rows = [() => ({ data: null, error: { message: "permission denied secret" } }), () => { throw new Error("network secret"); }, () => null, () => ({ data: [okRow()], error: null }), () => ({ data: "ready", error: null }), () => ({ data: 1, error: null })];
  for (const row of rows) {
    const s = shadow({ row });
    const r = await handleGetAsset(s.deps, ASSET);
    assert.deepEqual([r.status, r.body.code], [503, UNAVAILABLE]);
    assert.ok(!JSON.stringify(r.body).includes("secret"));
    assert.ok(!s.calls.some((c) => c[0] === "sign"));
    noStore(r);
  }
});

test("shadow: 경로·버킷·객체 id가 계약과 다르면 503, 서명 0", async () => {
  for (const over of [{ bucket: "other" }, { path: `${OTHER}/generated/${ASSET}.png` }, { path: `${U}/generated/${OTHER}.png` }, { path: "x" }, { path: null }, { object_id: null }, { object_id: "nope" }, { state: "weird" }, { state: null }]) {
    const s = shadow({ row: okRow(over) });
    const r = await handleGetAsset(s.deps, ASSET);
    assert.deepEqual([r.status, r.body.code], [503, UNAVAILABLE], JSON.stringify(over));
    assert.ok(!s.calls.some((c) => c[0] === "sign"));
  }
});

test("shadow: reserved·unknown은 「확인 중」(202) — 서명·재생성·재업로드·자동 실행 0", async () => {
  for (const state of ["reserved", "unknown"]) {
    const s = shadow({ row: okRow({ state, object_id: null }) });
    const r = await handleGetAsset(s.deps, ASSET);
    assert.deepEqual([r.status, r.body.state, r.body.id], [202, "checking", ASSET]);
    assert.deepEqual(s.calls, [["row", U, ASSET]], "행 조회 한 번뿐");
    noStore(r);
  }
});

test("shadow: failed·missing은 구분된 404, 서명 0", async () => {
  for (const [state, code] of [["failed", "ASSET_NOT_SAVED"], ["missing", "ASSET_MISSING"]]) {
    const s = shadow({ row: okRow({ state }) });
    const r = await handleGetAsset(s.deps, ASSET);
    assert.deepEqual([r.status, r.body.code], [404, code]);
    assert.ok(!s.calls.some((c) => c[0] === "sign"));
  }
});

test("shadow: 서명 실패(404·400·오류·던짐·모양 이상·http 주소) → 503, 삭제·보관 만료로 단정하지 않고 상태를 쓰지 않음", async () => {
  const signs = [
    () => ({ data: null, error: { message: "Object not found", status: 404 } }),
    () => ({ data: null, error: { message: "Bad Request secret", status: 400 } }),
    () => ({ data: null, error: { message: "permission", status: 403 } }),
    () => { throw new Error("timeout secret"); },
    () => null,
    () => ({ data: {}, error: null }),
    () => ({ data: { signedUrl: 1 }, error: null }),
    () => ({ data: { signedUrl: "http://insecure/x" }, error: null }),
    () => ({ data: { signedUrl: "" }, error: null }),
  ];
  for (const sign of signs) {
    const s = shadow({ sign });
    const r = await handleGetAsset(s.deps, ASSET);
    assert.deepEqual([r.status, r.body.code], [503, UNAVAILABLE]);
    assert.ok(!/보관|삭제|만료/.test(JSON.stringify(r.body)), "삭제·보관 만료 문구 없음");
    assert.ok(!JSON.stringify(r.body).includes("secret"));
    assert.deepEqual(s.calls.map((c) => c[0]), ["row", "sign"], "조회 1·서명 1뿐 — 상태 쓰기·재시도 없음");
    noStore(r);
  }
});

test("shadow: 서명 URL은 기대하는 저장소 주소의 서명 경로일 때만 돌려준다(다른 호스트·다른 경로·깨진 주소·기대 주소 미설정 → 503)", async () => {
  const bad = [
    "https://evil.example.com/storage/v1/object/sign/aif-assets/x?token=t",
    "https://example.supabase.co.evil.com/storage/v1/object/sign/aif-assets/x?token=t",
    "https://example.supabase.co/storage/v1/object/public/aif-assets/x",
    "https://example.supabase.co/other?token=t",
    "https://user:pw@example.supabase.co/storage/v1/object/sign/aif-assets/x?token=t",
    "https://example.supabase.co:8443/storage/v1/object/sign/aif-assets/x?token=t",
    "https://",
    "https://example.supabase.co/storage/v1/object/sign/aif-assets/x",
  ];
  for (const url of bad) {
    const r = await handleGetAsset(shadow({ sign: () => ({ data: { signedUrl: url }, error: null }) }).deps, ASSET);
    assert.deepEqual([r.status, r.body.code], [503, UNAVAILABLE], url);
    assert.ok(!JSON.stringify(r.body).includes(url) || url === "https://", "임의 주소를 돌려주지 않음");
  }
  for (const storageOrigin of [undefined, null, "", "not a url", "http://example.supabase.co"]) {
    const r = await handleGetAsset(shadow({ storageOrigin }).deps, ASSET);
    assert.deepEqual([r.status, r.body.code], [503, UNAVAILABLE], String(storageOrigin));
  }
  assert.equal((await handleGetAsset(shadow().deps, ASSET)).status, 200, "기대 주소와 일치하면 정상");
});

test("shadow: 조회 의존성이 없거나 만들다 실패하면 503", async () => {
  for (const getReadDeps of [undefined, () => { throw new Error("env missing secret"); }]) {
    const s = shadow({ getReadDeps });
    const r = await handleGetAsset(s.deps, ASSET);
    assert.deepEqual([r.status, r.body.code], [503, UNAVAILABLE]);
    assert.ok(!JSON.stringify(r.body).includes("secret"));
  }
});

test("로그: 어떤 경로에서도 경로·토큰·오류 원문을 기록하지 않는다", async () => {
  const logged = [];
  const orig = { error: console.error, warn: console.warn, log: console.log };
  console.error = console.warn = console.log = (...a) => logged.push(a.map(String).join(" "));
  try {
    await handleGetAsset(shadow().deps, ASSET);
    await handleGetAsset(shadow({ sign: () => { throw new Error("SECRETTOKEN path " + PATH); } }).deps, ASSET);
    await handleGetAsset(shadow({ row: () => { throw new Error("SECRETTOKEN"); } }).deps, ASSET);
  } finally {
    Object.assign(console, orig);
  }
  assert.ok(logged.every((l) => !l.includes("SECRETTOKEN") && !l.includes(PATH)), logged.join("\n"));
});
