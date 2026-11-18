// W01-A1 저장 로직 모의 시험 (2026-11-18, CC-SNS-01). 실제 DB·실제 저장소·실제 업로드·AI 호출 없음 — rpc/storage는 가짜를 주입한다.
// 가짜 저장소 응답 모양은 설치된 @supabase/storage-js 2.117.3의 upload() 계약({ data: { id, path, fullPath }, error })을 따른다.
import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

// src 안의 확장자 없는 상대 import("./paths" 등)를 Node가 풀 수 있게 하는 시험 전용 해석기(패키지·tsconfig 변경 없음)
register("data:text/javascript," + encodeURIComponent(
  "export async function resolve(s, c, n) { try { return await n(s, c); } catch (e) { if (s.startsWith('.') && !/\\.[a-z]+$/.test(s)) return n(s + '.ts', c); throw e; } }"
));
const { saveGeneratedOriginal, precheckGenerated, verifyGeneratedBytes, decodeGeneratedDataUrl } = await import("../src/lib/assets/store.ts");
const { parseImageDataUrl, sniffImageKind, PER_IMAGE_MAX_BYTES } = await import("../src/lib/referenceImage.ts");

const b64 = (s) => new Uint8Array(Buffer.from(s, "base64"));
const PNG = b64("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==");
const JPEG = b64("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP////////////////////////////////////////////////////////////////////////////////////8AAP/AAAsIAAEAAQEBEQD/xAAUAAEAAAAAAAAAAAAAAAAAAAAD/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAAPwBH/9k=");
const WEBP = b64("UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==");
const GIF = b64("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");
const HEIC = new Uint8Array(Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypheic\0\0\0\0mif1heic"), Buffer.alloc(16)]));
const U = "abcdef01-2345-4789-8abc-def012345678";
const ASSET = "0a0b0c0d-1111-4222-8333-444455556666";
const OBJ = "99999999-aaaa-4bbb-8ccc-dddddddddddd";
const pathOf = (ext = "png") => `${U}/generated/${ASSET}.${ext}`;

/** 가짜 주입물. handlers로 함수별 응답을 바꾼다. 호출 기록을 남긴다 */
function fake(over = {}) {
  const calls = [];
  const h = {
    aif_asset_reserve: (a) => ({ data: [{ asset_id: ASSET, path: `${a.p_user}/generated/${ASSET}.${a.p_ext}` }], error: null }),
    aif_asset_finalize: () => ({ data: "ready", error: null }),
    aif_asset_reconcile: () => ({ data: "unknown", error: null }),
    aif_asset_abort_local: () => ({ data: "failed", error: null }),
    aif_asset_precheck: () => ({ data: [{ allowed: true, used_bytes: 0, quota_bytes: 100 }], error: null }),
    upload: (path) => ({ data: { id: OBJ, path, fullPath: `aif-assets/${path}` }, error: null }),
    ...over,
  };
  const rpc = async (fn, args) => { calls.push({ fn, args }); return h[fn](args); };
  const storage = { upload: async (path, body, opts) => { calls.push({ fn: "upload", args: { path, size: body.length, opts } }); return h.upload(path, body, opts); } };
  const names = () => calls.map((c) => c.fn);
  return { deps: { rpc, storage }, calls, names };
}
const save = (f, bytes = PNG, userId = U) => saveGeneratedOriginal(f.deps, { userId, bytes });
/** 어떤 경로에서도 삭제·재업로드·재생성 호출이 없어야 한다 */
function assertNoDestructive(f) {
  assert.ok(f.names().filter((n) => n === "upload").length <= 1, "업로드는 최대 1회(재업로드 0)");
  assert.ok(f.names().filter((n) => n === "aif_asset_reconcile").length <= 1, "대조는 최대 1회");
  assert.ok(!f.names().some((n) => /delete|remove/.test(n)), "삭제 호출 0");
}

test("verifyGeneratedBytes: 실제 서명 PNG·JPEG·WebP만, 20MiB 이하, SHA-256 계산", async () => {
  for (const [bytes, mime, ext] of [[PNG, "image/png", "png"], [JPEG, "image/jpeg", "jpg"], [WEBP, "image/webp", "webp"]]) {
    const r = await verifyGeneratedBytes(bytes);
    assert.equal(r.ok, true, mime);
    assert.deepEqual([r.value.mime, r.value.ext, r.value.bytes], [mime, ext, bytes.length]);
    assert.match(r.value.sha256, /^[0-9a-f]{64}$/);
    assert.equal(r.value.sha256, Buffer.from(await crypto.subtle.digest("SHA-256", bytes)).toString("hex"));
  }
  assert.equal((await verifyGeneratedBytes(GIF)).code, "ASSET_FORMAT");
  assert.equal((await verifyGeneratedBytes(HEIC)).code, "ASSET_FORMAT", "생성 원본은 HEIC를 받지 않음");
  assert.equal((await verifyGeneratedBytes(new Uint8Array([1, 2, 3]))).code, "ASSET_FORMAT");
  for (const bad of [new Uint8Array(0), null, undefined, "data", [1, 2], Buffer.from("x").buffer]) assert.equal((await verifyGeneratedBytes(bad)).code, "ASSET_EMPTY");
  const big = new Uint8Array(20 * 1024 * 1024 + 1); big.set(PNG);
  assert.equal((await verifyGeneratedBytes(big)).code, "ASSET_TOO_LARGE");
  const twoMiB = new Uint8Array(2 * 1024 * 1024); twoMiB.set(PNG);
  assert.equal((await verifyGeneratedBytes(twoMiB)).ok, true, "참고 이미지 1MiB 상한은 적용하지 않음");
});

test("기존 참고 이미지 검사는 그대로(1MiB 상한·동작 불변), 새 export는 형식만 판정", () => {
  assert.equal(PER_IMAGE_MAX_BYTES, 1024 * 1024);
  assert.equal(parseImageDataUrl("data:image/png;base64," + Buffer.from(PNG).toString("base64")).ok, true);
  const big = Buffer.concat([Buffer.from(PNG), Buffer.alloc(PER_IMAGE_MAX_BYTES)]).toString("base64");
  assert.equal(parseImageDataUrl("data:image/png;base64," + big).code, "REFERENCE_TOO_LARGE");
  assert.deepEqual([sniffImageKind(PNG), sniffImageKind(JPEG), sniffImageKind(WEBP), sniffImageKind(HEIC), sniffImageKind(GIF)], ["png", "jpeg", "webp", "heic", null]);
});

test("decodeGeneratedDataUrl: 엄격한 base64만", () => {
  const ok = decodeGeneratedDataUrl("data:image/png;base64," + Buffer.from(PNG).toString("base64"));
  assert.deepEqual(Array.from(ok), Array.from(PNG));
  for (const bad of [null, 1, "", "https://x/y.png", "data:image/png;base64,", "data:image/png;base64,ab*d", "data:image/png;base64,abc", "data:image/png;base64,abcd\n", "data:image/png,abcd"]) {
    assert.equal(decodeGeneratedDataUrl(bad), null, String(bad));
  }
});

test("정상: reserve → upload(upsert false, 실제 MIME) → finalize(응답 객체 id) → 저장됨", async () => {
  const f = fake();
  const r = await save(f, JPEG);
  assert.deepEqual(r, { assetSaved: true, assetId: ASSET });
  assert.deepEqual(f.names(), ["aif_asset_reserve", "upload", "aif_asset_finalize"]);
  const [res, up, fin] = f.calls;
  assert.deepEqual([res.args.p_user, res.args.p_kind, res.args.p_mime, res.args.p_ext, res.args.p_bytes], [U, "generated", "image/jpeg", "jpg", JPEG.length]);
  assert.match(res.args.p_sha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(up.args, { path: pathOf("jpg"), size: JPEG.length, opts: { contentType: "image/jpeg", upsert: false } });
  assert.deepEqual(fin.args, { p_asset: ASSET, p_user: U, p_object_id: OBJ });
});

test("reserve 전 로컬 검증 실패: RPC 0·업로드 0", async () => {
  for (const [bytes, user, code] of [[GIF, U, "ASSET_FORMAT"], [new Uint8Array(0), U, "ASSET_EMPTY"], [PNG, U.toUpperCase(), "INVALID_USER"], [PNG, null, "INVALID_USER"], [PNG, "x", "INVALID_USER"]]) {
    const f = fake();
    const r = await saveGeneratedOriginal(f.deps, { userId: user, bytes });
    assert.deepEqual(r, { assetSaved: false, code });
    assert.equal(f.calls.length, 0, `${code}: 호출 0`);
  }
});

test("reserve 거절·오류·던짐·이상한 모양: 업로드 0, 저장 안 됨(성공 단정 0)", async () => {
  const cases = [
    [{ aif_asset_reserve: () => ({ data: null, error: { message: "STORAGE_LIMIT" } }) }, "STORAGE_LIMIT"],
    [{ aif_asset_reserve: () => ({ data: null, error: { message: "boom secret" } }) }, "RESERVE_FAILED"],
    [{ aif_asset_reserve: () => { throw new Error("network secret"); } }, "RESERVE_FAILED"],
    [{ aif_asset_reserve: () => null }, "RESERVE_FAILED"],
    [{ aif_asset_reserve: () => ({ data: [], error: null }) }, "RESERVE_SHAPE"],
    [{ aif_asset_reserve: () => ({ data: [{ asset_id: "not-uuid", path: "x" }], error: null }) }, "RESERVE_SHAPE"],
    [{ aif_asset_reserve: () => ({ data: "ready", error: null }) }, "RESERVE_SHAPE"],
  ];
  for (const [over, code] of cases) {
    const f = fake(over);
    const r = await save(f);
    assert.equal(r.assetSaved, false, code);
    assert.equal(r.code, code);
    assert.ok(!JSON.stringify(r).includes("secret"), "원문 미노출");
    assert.deepEqual(f.names(), ["aif_asset_reserve"], `${code}: 업로드·abort 0`);
  }
});

test("reserve 후 원격 미전송이 확정된 경우에만 abort_local: 예약 경로가 계약과 다름", async () => {
  for (const badPath of [`${U}/generated/${ASSET}.jpg`, `00000000-0000-4000-8000-000000000001/generated/${ASSET}.png`, `${U}/generated/sub/${ASSET}.png`, null]) {
    const f = fake({ aif_asset_reserve: () => ({ data: [{ asset_id: ASSET, path: badPath }], error: null }) });
    const r = await save(f);
    assert.deepEqual(r, { assetSaved: false, code: "RESERVE_SHAPE", assetId: ASSET });
    assert.deepEqual(f.names(), ["aif_asset_reserve", "aif_asset_abort_local"], "업로드 0, abort 1");
    assert.deepEqual(f.calls[1].args, { p_asset: ASSET, p_user: U });
  }
});

test("업로드 시작 뒤 실패(오류·중복 경로·시간 초과 던짐·id 없음·경로 불일치·이상한 모양): unknown 유지, abort·삭제·재업로드 0", async () => {
  const uploads = [
    () => ({ data: null, error: { message: "The resource already exists", statusCode: "409" } }),
    () => ({ data: null, error: { message: "Bad Request", statusCode: "400" } }),
    () => { throw new Error("timeout secret"); },
    () => ({ data: { path: pathOf(), fullPath: "x" }, error: null }),
    () => ({ data: { id: "not-uuid", path: pathOf() }, error: null }),
    () => ({ data: { id: OBJ, path: `${U}/generated/other.png` }, error: null }),
    () => null,
    () => ({ data: "ok", error: null }),
  ];
  for (const up of uploads) {
    const f = fake({ upload: up });
    const r = await save(f);
    assert.deepEqual(r, { assetSaved: "unknown", code: "UPLOAD_UNKNOWN", assetId: ASSET });
    assert.deepEqual(f.names(), ["aif_asset_reserve", "upload", "aif_asset_reconcile"]);
    assert.deepEqual(f.calls[2].args, { p_asset: ASSET, p_user: U, p_expected_object_id: null }, "기대 객체 id 없이 대조 1회");
    assert.ok(!f.names().includes("aif_asset_abort_local"), "업로드 뒤에는 해제하지 않음");
    assertNoDestructive(f);
    assert.ok(!JSON.stringify(r).includes("secret"));
  }
});

test("finalize가 알려진 상태로 ready가 아니라고 답함(unknown·삭제 진행·INVALID_STATE·NOT_FOUND): 불명, 대조 0", async () => {
  for (const ans of ["unknown", "ASSET_DELETION_IN_PROGRESS", "INVALID_STATE", "NOT_FOUND"]) {
    const f = fake({ aif_asset_finalize: () => ({ data: ans, error: null }) });
    const r = await save(f);
    assert.deepEqual(r, { assetSaved: "unknown", code: "NOT_CONFIRMED", assetId: ASSET });
    assert.deepEqual(f.names(), ["aif_asset_reserve", "upload", "aif_asset_finalize"]);
    assertNoDestructive(f);
  }
});

test("finalize 응답 불명(오류·던짐·모르는 값): 같은 객체 id로 대조 1회 — ready면 저장됨, 아니면 불명", async () => {
  const unknownAnswers = [undefined, null, true, false, 1, { state: "ready" }, ["ready"], "READY", "ok", ""].map((d) => () => ({ data: d, error: null }));
  for (const fin of [() => ({ data: null, error: { message: "x" } }), () => { throw new Error("lost"); }, () => undefined, ...unknownAnswers]) {
    const ok = fake({ aif_asset_finalize: fin, aif_asset_reconcile: () => ({ data: "ready", error: null }) });
    assert.deepEqual(await save(ok), { assetSaved: true, assetId: ASSET });
    assert.deepEqual(ok.calls.at(-1), { fn: "aif_asset_reconcile", args: { p_asset: ASSET, p_user: U, p_expected_object_id: OBJ } });
    for (const rec of [() => ({ data: "unknown", error: null }), () => ({ data: null, error: { message: "y" } }), () => { throw new Error("z"); }, () => ({ data: "failed", error: null })]) {
      const f = fake({ aif_asset_finalize: fin, aif_asset_reconcile: rec });
      assert.deepEqual(await save(f), { assetSaved: "unknown", code: "FINALIZE_UNKNOWN", assetId: ASSET });
      assert.deepEqual(f.names(), ["aif_asset_reserve", "upload", "aif_asset_finalize", "aif_asset_reconcile"]);
      assertNoDestructive(f);
    }
  }
});

test("reserve·precheck 응답은 정확히 1행 배열만 인정(0행·2행·객체·null·원시값은 성공 단정 0)", async () => {
  const good = { asset_id: ASSET, path: pathOf() };
  for (const data of [[], [good, good], good, null, undefined, "x", 1, true, [null], [[good]], ["x"]]) {
    const f = fake({ aif_asset_reserve: () => ({ data, error: null }) });
    const r = await save(f);
    assert.deepEqual(r, { assetSaved: false, code: "RESERVE_SHAPE" }, JSON.stringify(data));
    assert.deepEqual(f.names(), ["aif_asset_reserve"], "업로드 0·abort 0(예약 id를 인정하지 않음)");
  }
  const extra = fake({ aif_asset_reserve: () => ({ data: [{ ...good, note: "extra", ready: true }], error: null }) });
  assert.deepEqual(await save(extra), { assetSaved: true, assetId: ASSET }, "추가 필드는 허용하되 판정에 쓰지 않음");
  for (const data of [[], [{ allowed: true }, { allowed: true }], { allowed: true }, null, "true", true, [null], [[{ allowed: true }]], [{ allowed: "true" }], [{ allowed: 1 }], [{}]]) {
    assert.deepEqual(await precheckGenerated(fake({ aif_asset_precheck: () => ({ data, error: null }) }).deps, U, "1K"), { status: "unavailable" }, JSON.stringify(data));
  }
  assert.deepEqual(await precheckGenerated(fake({ aif_asset_precheck: () => ({ data: [{ allowed: false, extra: 1 }], error: null }) }).deps, U, "1K"), { status: "denied" });
});

test("어떤 경우에도 던지지 않는다(생성 결과 반환을 막지 않음)", async () => {
  const boom = () => { throw new Error("x"); };
  for (const over of [{ aif_asset_reserve: boom }, { upload: boom }, { aif_asset_finalize: boom, aif_asset_reconcile: boom }, { aif_asset_abort_local: boom, aif_asset_reserve: () => ({ data: [{ asset_id: ASSET, path: "bad" }], error: null }) }]) {
    const r = await save(fake(over));
    assert.ok(r.assetSaved === false || r.assetSaved === "unknown");
  }
  const r = await saveGeneratedOriginal({ rpc: null, storage: null }, { userId: U, bytes: PNG });
  assert.equal(r.assetSaved, false);
});

test("precheckGenerated: 화질별 예상 크기로 조회, denied만 막음, 확인 불가는 unavailable", async () => {
  const f = fake();
  assert.deepEqual(await precheckGenerated(f.deps, U, "2K"), { status: "allowed" });
  assert.deepEqual(f.calls[0], { fn: "aif_asset_precheck", args: { p_user: U, p_est_bytes: 10 * 1024 * 1024 } });
  const est = async (qual) => { const g = fake(); await precheckGenerated(g.deps, U, qual); return g.calls[0].args.p_est_bytes; };
  assert.deepEqual([await est("1K"), await est("4K"), await est(undefined)], [4194304, 20971520, 20971520]);
  assert.deepEqual(await precheckGenerated(fake({ aif_asset_precheck: () => ({ data: [{ allowed: false }], error: null }) }).deps, U, "1K"), { status: "denied" });
  for (const ans of [() => ({ data: null, error: { message: "relation does not exist" } }), () => { throw new Error("x"); }, () => ({ data: [], error: null }), () => ({ data: [{ allowed: "true" }], error: null }), () => null]) {
    assert.deepEqual(await precheckGenerated(fake({ aif_asset_precheck: ans }).deps, U, "1K"), { status: "unavailable" });
  }
  const g = fake();
  assert.deepEqual(await precheckGenerated(g.deps, "bad-user", "1K"), { status: "unavailable" });
  assert.equal(g.calls.length, 0);
});

// ───────────── W01-G3S(2026-11-19, Master msg_2b300b6fcc29): 선택적 저장 진행 신호 ─────────────
test("진행 신호: 주지 않거나 비어 있으면(또는 멈추지 않으면) 결과와 호출 순서가 예전과 완전히 같다", async () => {
  const scenarios = [
    {},
    { upload: () => { throw new Error("boom"); } },
    { aif_asset_finalize: () => ({ data: null, error: { message: "boom" } }) },
    { aif_asset_reserve: () => ({ data: null, error: { message: "STORAGE_LIMIT" } }) },
    { aif_asset_reserve: (a) => ({ data: [{ asset_id: ASSET, path: `${a.p_user}/generated/other.png` }], error: null }) },
  ];
  for (const over of scenarios) {
    const base = fake(over); const r0 = await saveGeneratedOriginal(base.deps, { userId: U, bytes: PNG });
    for (const progress of [undefined, {}, { shouldStop: () => false }, { onReserved: () => {} }, { shouldStop: () => { throw new Error("x"); } }, { shouldStop: () => "yes" }]) {
      const f = fake(over);
      const r = await saveGeneratedOriginal(f.deps, { userId: U, bytes: PNG }, progress);
      assert.deepEqual(r, r0);
      assert.deepEqual(f.names(), base.names());
    }
  }
});

test("진행 신호 onReserved: 검증된 본인 예약 번호를 확보한 직후(업로드 전) 한 번만 — 번호·경로가 계약과 다르면 부르지 않는다", async () => {
  // 정상: 예약 뒤·업로드 전에 한 번
  let f = fake(); const seen = [];
  let r = await saveGeneratedOriginal(f.deps, { userId: U, bytes: PNG }, { onReserved: (id) => { seen.push([id, f.names().slice()]); } });
  assert.deepEqual(r, { assetSaved: true, assetId: ASSET });
  assert.deepEqual(seen, [[ASSET, ["aif_asset_reserve"]]]);
  // 던지는 알림은 저장을 막지 않는다
  f = fake();
  r = await saveGeneratedOriginal(f.deps, { userId: U, bytes: PNG }, { onReserved: () => { throw new Error("listener boom"); } });
  assert.deepEqual([r, f.names()], [{ assetSaved: true, assetId: ASSET }, ["aif_asset_reserve", "upload", "aif_asset_finalize"]]);
  // 부르지 않는 경우: 예약 실패 · 번호 모양 이상 · 0행/2행 · 다른 회원 경로 · 다른 번호 경로 · 로컬 검증 실패
  const bad = [
    { aif_asset_reserve: () => ({ data: null, error: { message: "boom" } }) },
    { aif_asset_reserve: () => ({ data: [{ asset_id: "not-a-uuid", path: "x" }], error: null }) },
    { aif_asset_reserve: () => ({ data: [], error: null }) },
    { aif_asset_reserve: (a) => ({ data: [{ asset_id: ASSET, path: `${a.p_user}/generated/${ASSET}.png` }, { asset_id: ASSET, path: "x" }], error: null }) },
    { aif_asset_reserve: () => ({ data: [{ asset_id: ASSET, path: `00000000-1111-4222-8333-444444444444/generated/${ASSET}.png` }], error: null }) },
    { aif_asset_reserve: (a) => ({ data: [{ asset_id: ASSET, path: `${a.p_user}/generated/${OBJ}.png` }], error: null }) },
    { aif_asset_reserve: (a) => ({ data: [{ asset_id: ASSET, path: `${a.p_user}/ref_face/${ASSET}.png` }], error: null }) },
  ];
  for (const over of bad) {
    let called = 0;
    f = fake(over);
    r = await saveGeneratedOriginal(f.deps, { userId: U, bytes: PNG }, { onReserved: () => { called++; } });
    assert.deepEqual([called, r.assetSaved, f.names().includes("upload")], [0, false, false]);
  }
  let called = 0;
  f = fake();
  r = await saveGeneratedOriginal(f.deps, { userId: U, bytes: GIF }, { onReserved: () => { called++; } });
  assert.deepEqual([called, f.names()], [0, []]);
});

test("진행 신호 shouldStop: 멈추라는 신호 뒤에는 다음 쓰기(예약·해제·업로드·확정·대조)를 시작하지 않는다 — 이미 보낸 쓰기의 결과는 그대로 쓴다", async () => {
  // 처음부터 멈춤 → 예약도 보내지 않는다
  let f = fake();
  assert.deepEqual([await saveGeneratedOriginal(f.deps, { userId: U, bytes: PNG }, { shouldStop: () => true }), f.names()], [{ assetSaved: false, code: "SAVE_STOPPED" }, []]);
  // 예약을 보낸 뒤 멈춤 → 번호는 알리고, 업로드를 시작하지 않는다. 해제(abort)도 하지 않는다
  let stop = false; let reserved = null;
  const ok = (a) => ({ data: [{ asset_id: ASSET, path: `${a.p_user}/generated/${ASSET}.${a.p_ext}` }], error: null });
  f = fake({ aif_asset_reserve: (a) => { stop = true; return ok(a); } });
  let r = await saveGeneratedOriginal(f.deps, { userId: U, bytes: PNG }, { shouldStop: () => stop, onReserved: (id) => { reserved = id; } });
  assert.deepEqual([r, f.names(), reserved], [{ assetSaved: false, code: "SAVE_STOPPED", assetId: ASSET }, ["aif_asset_reserve"], ASSET]);
  // 예약 응답의 경로가 계약과 다름 + 멈춤 → 해제를 시작하지 않는다(알림 0)
  stop = false; reserved = null;
  f = fake({ aif_asset_reserve: (a) => { stop = true; return { data: [{ asset_id: ASSET, path: `${a.p_user}/generated/other.png` }], error: null }; } });
  r = await saveGeneratedOriginal(f.deps, { userId: U, bytes: PNG }, { shouldStop: () => stop, onReserved: (id) => { reserved = id; } });
  assert.deepEqual([r, f.names(), reserved], [{ assetSaved: false, code: "SAVE_STOPPED", assetId: ASSET }, ["aif_asset_reserve"], null]);
  // 업로드를 보낸 뒤 멈춤(업로드 성공) → 확정을 시작하지 않는다. 불명
  stop = false;
  f = fake({ upload: (path) => { stop = true; return { data: { id: OBJ, path, fullPath: `aif-assets/${path}` }, error: null }; } });
  r = await saveGeneratedOriginal(f.deps, { userId: U, bytes: PNG }, { shouldStop: () => stop });
  assert.deepEqual([r, f.names()], [{ assetSaved: "unknown", code: "SAVE_STOPPED", assetId: ASSET }, ["aif_asset_reserve", "upload"]]);
  // 업로드를 보낸 뒤 멈춤(업로드 실패·던짐) → 대조를 시작하지 않는다
  for (const upload of [() => { stop = true; throw new Error("boom"); }, () => { stop = true; return { data: null, error: { message: "boom" } }; }]) {
    stop = false;
    f = fake({ upload });
    r = await saveGeneratedOriginal(f.deps, { userId: U, bytes: PNG }, { shouldStop: () => stop });
    assert.deepEqual([r, f.names()], [{ assetSaved: "unknown", code: "SAVE_STOPPED", assetId: ASSET }, ["aif_asset_reserve", "upload"]]);
  }
  // 확정을 보낸 뒤 멈춤: 확정이 ready라고 답했으면 그 결과를 쓴다(이미 보낸 쓰기) / 답이 불명이면 대조를 시작하지 않는다
  stop = false;
  f = fake({ aif_asset_finalize: () => { stop = true; return { data: "ready", error: null }; } });
  r = await saveGeneratedOriginal(f.deps, { userId: U, bytes: PNG }, { shouldStop: () => stop });
  assert.deepEqual([r, f.names()], [{ assetSaved: true, assetId: ASSET }, ["aif_asset_reserve", "upload", "aif_asset_finalize"]]);
  stop = false;
  f = fake({ aif_asset_finalize: () => { stop = true; return { data: null, error: { message: "boom" } }; } });
  r = await saveGeneratedOriginal(f.deps, { userId: U, bytes: PNG }, { shouldStop: () => stop });
  assert.deepEqual([r, f.names()], [{ assetSaved: "unknown", code: "SAVE_STOPPED", assetId: ASSET }, ["aif_asset_reserve", "upload", "aif_asset_finalize"]]);
  // 어느 경우에도 삭제·재업로드 0
  assert.equal(f.names().some((n) => /delete|remove|abort/.test(n)), false);
});
