// W01-UIC 화면용 자산 흐름 시험 (2026-11-19, CC-SNS-01, Master msg_f3348556982f, 계약 W00_BASELINE §24). 실제 서버·DB·저장소·AI 호출 없음 — fetch는 가짜를 넣는다.
//  ★ 한계: 브라우저가 아니라 Node에서 돈다. 교차 출처 차단·실제 저장소 응답·실제 화면 연결은 보지 않는다(컴포넌트 연결은 다음 단위).
//     가짜 fetch가 받은 옵션(credentials 등)을 확인할 뿐, 브라우저가 그 옵션대로 동작하는지는 이 시험의 범위가 아니다.
import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("data:text/javascript," + encodeURIComponent(
  "export async function resolve(s, c, n) { try { return await n(s, c); } catch (e) { if (s.startsWith('.') && !/\\.[a-z]+$/.test(s)) return n(s + '.ts', c); throw e; } }"
));
const F = await import("../src/lib/assets/clientFlow.ts");
const { runAssetGeneration, reloadAsset, uploadReference, fetchResultBlob, collectSlots, stripPhotoFields, isOurSignedUrl, AssetIdMemory, CLIENT_MESSAGES: M } = F;

const unhandled = [];
process.on("unhandledRejection", (e) => { unhandled.push(String(e)); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const never = () => new Promise(() => {});

const ORIGIN = "https://proj.supabase.co";
const U = "abcdef01-2345-4789-8abc-def012345678";
const RESULT_ID = "0a0b0c0d-1111-4222-8333-444455556666";
const id = (n) => `11111111-2222-4333-8444-${String(n).padStart(12, "0")}`;
const signed = (assetId = RESULT_ID, ext = "png", user = U) => `${ORIGIN}/storage/v1/object/sign/aif-assets/${user}/generated/${assetId}.${ext}?token=abc.DEF-ghi_jkl`;
const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const sized = (head, n, fill = 0) => { const b = new Uint8Array(n).fill(fill); b.set(head); return b; };
const PNG = sized(PNG_SIG, 64, 7);
const JPEG = sized([0xff, 0xd8, 0xff, 0xe0], 64, 1);
const WEBP = sized([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50], 64, 2);
const photo = (n) => `data:image/png;base64,${Buffer.from(sized(PNG_SIG, 40, n)).toString("base64")}`;
const INLINE = `data:image/png;base64,${Buffer.from(PNG).toString("base64")}`;
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const bin = (bytes, status = 200, headers = {}) => new Response(bytes, { status, headers });

/** 가짜 fetch: 경로별 응답 함수를 받고 모든 호출을 기록한다 */
function net(routes = {}) {
  const calls = [];
  let nextUpload = 0;
  const h = {
    upload: () => json(200, { assetId: id(++nextUpload), assetSaved: true }),
    generate: () => json(200, { assetId: RESULT_ID, assetSaved: true, signedUrl: signed(), expiresIn: 120 }),
    asset: () => json(200, { id: RESULT_ID, state: "ready", signedUrl: signed(), expiresIn: 120 }),
    storage: () => bin(PNG),
    ...routes,
  };
  const fetchFn = async (url, init = {}) => {
    const kind = url === "/api/aif/assets" ? "upload" : url === "/api/aif/generations" ? "generate" : url.startsWith("/api/aif/assets/") ? "asset" : url.startsWith(ORIGIN) ? "storage" : "other";
    const call = { kind, url, init, body: typeof init.body === "string" ? JSON.parse(init.body) : undefined };
    calls.push(call);
    if (kind === "other") throw new Error("예상하지 않은 주소: " + url);
    return h[kind](call);
  };
  const kinds = () => calls.map((c) => c.kind);
  const count = (k) => calls.filter((c) => c.kind === k).length;
  return { fetch: fetchFn, calls, kinds, count };
}
const deps = (n, memory = new AssetIdMemory()) => ({ fetch: n.fetch, storageOrigin: ORIGIN, memory });
const live = () => new AbortController().signal;
const CONFIG = { age: 25, quality: "1K", location: "서울", personImage: photo(1), placeImage: photo(2), productImages: [photo(3), photo(4)], isAdMode: true, lastResultImage: INLINE };
/** 결과 어디에도 서명 주소·토큰이 남지 않았는가 */
function assertNoUrl(...values) {
  for (const v of values) {
    const text = JSON.stringify(v, (_k, x) => (x instanceof Blob ? "[blob]" : x instanceof Map ? [...x] : x));
    for (const leak of ["token=", "/object/sign/", "supabase.co"]) assert.equal(text.includes(leak), false, leak);
  }
}

// ───────────── 요청 만들기 ─────────────
test("참고 사진은 얼굴 → 장소 → 상품 순서로 모으고, 상품은 광고 모드일 때만, 같은 상품 사진은 한 번만", () => {
  assert.deepEqual(collectSlots(CONFIG).map((s) => s.role), ["face", "place", "product", "product"]);
  assert.deepEqual(collectSlots({ ...CONFIG, isAdMode: false }).map((s) => s.role), ["face", "place"]);
  assert.deepEqual(collectSlots({ productImages: [photo(3)], isAdMode: true, personImage: undefined, placeImage: "" }).map((s) => s.role), ["product"]);
  // 같은 상품 사진이 여러 칸에 있어도 칸 수와 순서를 지킨다(몇 번째인지로 구분)
  assert.deepEqual(collectSlots({ isAdMode: true, productImages: [photo(3), photo(3), photo(4)] }).map((s) => [s.dataUrl, s.occurrence]), [[photo(3), 0], [photo(3), 1], [photo(4), 0]]);
  assert.deepEqual(collectSlots({ isAdMode: true, productImages: [photo(3), photo(4), photo(3)] }).map((s) => [s.dataUrl, s.occurrence]), [[photo(3), 0], [photo(4), 0], [photo(3), 1]]);
  assert.equal(collectSlots({ isAdMode: true, productImages: [photo(1), photo(2), photo(3), photo(4)] }).length, 3, "상품은 3장까지");
  // 사진이 아닌 값·서명 주소는 올릴 대상이 아니다. 직전 결과는 다루지 않는다
  assert.deepEqual(collectSlots({ personImage: "https://x/y.png", placeImage: 5, productImages: "x", isAdMode: true, lastResultImage: INLINE }), []);
});

test("생성 요청의 글자 설정: 사진 칸 4개만 빠지고 나머지는 그대로, 원본은 바뀌지 않는다", () => {
  const before = JSON.stringify(CONFIG);
  const text = stripPhotoFields(CONFIG);
  assert.deepEqual(text, { age: 25, quality: "1K", location: "서울", isAdMode: true });
  assert.equal(JSON.stringify(CONFIG), before);
});

// ───────────── 정상 흐름 ─────────────
test("새 생성 한 번: 번호 없는 사진을 순서대로 올리고 → 번호로 생성 1회 → 결과 받기 1회. 본문에 사진 칸·base64가 없다", async () => {
  const n = net();
  const memory = new AssetIdMemory();
  const r = await runAssetGeneration(deps(n, memory), CONFIG, live());
  assert.equal(r.kind, "asset");
  assert.equal(r.assetId, RESULT_ID);
  assert.deepEqual([r.blob.type, r.blob.size], ["image/png", PNG.length]);
  assert.deepEqual(n.kinds(), ["upload", "upload", "upload", "upload", "generate", "storage"]);
  // 올리기: 종류와 사진이 순서대로
  assert.deepEqual(n.calls.slice(0, 4).map((c) => [c.body.kind, c.body.image]), [["ref_face", photo(1)], ["ref_place", photo(2)], ["ref_product", photo(3)], ["ref_product", photo(4)]]);
  // 생성: 글자 설정 + 번호·역할(고정 순서)
  const gen = n.calls[4];
  assert.deepEqual(gen.body, { config: { age: 25, quality: "1K", location: "서울", isAdMode: true }, references: [{ assetId: id(1), role: "face" }, { assetId: id(2), role: "place" }, { assetId: id(3), role: "product" }, { assetId: id(4), role: "product" }] });
  assert.equal(gen.init.body.includes("base64"), false);
  assert.equal(gen.init.body.includes("data:image"), false);
  assert.deepEqual([gen.init.method, gen.init.cache], ["POST", "no-store"]);
  assert.equal(memory.size, 4);
  assertNoUrl(r, [...Object.entries(memory)]);
});

test("번호 기억: 같은 사진으로 다시 생성하면 다시 올리지 않고, 사진이 바뀐 칸만 새로 올린다. 역할이 다르면 같은 사진이어도 따로 올린다", async () => {
  const n = net();
  const memory = new AssetIdMemory();
  await runAssetGeneration(deps(n, memory), CONFIG, live());
  assert.equal(n.count("upload"), 4);
  // 같은 설정으로 다시 → 올리기 0
  await runAssetGeneration(deps(n, memory), CONFIG, live());
  assert.deepEqual([n.count("upload"), n.count("generate")], [4, 2]);
  assert.deepEqual(n.calls.filter((c) => c.kind === "generate")[1].body.references.map((x) => x.assetId), [id(1), id(2), id(3), id(4)]);
  // 얼굴 사진만 바꿈 → 그 한 장만 올리고, 옛 번호는 붙지 않는다
  await runAssetGeneration(deps(n, memory), { ...CONFIG, personImage: photo(9) }, live());
  assert.equal(n.count("upload"), 5);
  assert.deepEqual(n.calls.filter((c) => c.kind === "generate")[2].body.references.map((x) => x.assetId), [id(5), id(2), id(3), id(4)]);
  // 얼굴과 장소에 같은 사진 → 역할이 달라 각각 올린다(번호가 겹치지 않는다)
  const n2 = net(); const m2 = new AssetIdMemory();
  await runAssetGeneration(deps(n2, m2), { personImage: photo(1), placeImage: photo(1) }, live());
  assert.deepEqual([n2.count("upload"), n2.calls[2].body.references.map((x) => x.assetId)], [2, [id(1), id(2)]]);
  // 참고 사진이 없으면 올리기 0, references는 빈 배열
  const n3 = net();
  await runAssetGeneration(deps(n3), { age: 25 }, live());
  assert.deepEqual([n3.kinds(), n3.calls[0].body], [["generate", "storage"], { config: { age: 25 }, references: [] }]);
});

// ───────────── 올리기 실패·불명·모드 어긋남 ─────────────
test("올리기 실패·불명·한도 초과: 생성을 시작하지 않고, 다시 올리지 않고, 그 번호를 기억하지 않는다", async () => {
  const cases = [
    [() => json(507, { error: "저장공간이 부족합니다.", code: "STORAGE_LIMIT" }), "저장공간이 부족합니다.", 507, "STORAGE_LIMIT"],
    [() => json(400, { error: "사진 형식을 확인해 주세요.", code: "IMAGE_INVALID" }), "사진 형식을 확인해 주세요.", 400, "IMAGE_INVALID"],
    [() => json(503, { code: "ASSET_UNAVAILABLE" }), M.UPLOAD_FAILED, 503, "ASSET_UNAVAILABLE"],
    [() => json(200, { assetId: id(7), assetSaved: "unknown", assetCode: "UPLOAD_UNKNOWN" }), M.UPLOAD_UNKNOWN, 200, "UPLOAD_UNKNOWN"],
    [() => json(200, { assetId: "not-a-uuid", assetSaved: true }), M.UPLOAD_FAILED, 200, null],
    [() => json(200, { assetSaved: true }), M.UPLOAD_FAILED, 200, null],
    [() => new Response("<html>502</html>", { status: 502 }), M.UPLOAD_FAILED, 502, null],
    [() => { throw new TypeError("fetch failed RAW"); }, M.UPLOAD_NO_RESPONSE, null, null],
    [() => json(500, { error: "x".repeat(400) }), M.UPLOAD_FAILED, 500, null],
  ];
  for (const [upload, message, status, code] of cases) {
    const n = net({ upload });
    const memory = new AssetIdMemory();
    const r = await runAssetGeneration(deps(n, memory), CONFIG, live());
    assert.deepEqual(r, { kind: "error", message, status, code, needApiKey: false, stage: "upload" });
    assert.deepEqual([n.kinds(), memory.size], [["upload"], 0], "첫 장에서 멈췄고 다시 보내지 않았다");
    assert.equal(JSON.stringify(r).includes("RAW"), false);
  }
  // 둘째 장에서 실패: 첫 장의 번호는 기억하고(다음에 다시 올리지 않음), 생성은 0
  let k = 0;
  const n = net({ upload: () => (++k === 2 ? json(503, { code: "ASSET_UNAVAILABLE" }) : json(200, { assetId: id(k), assetSaved: true })) });
  const memory = new AssetIdMemory();
  const r = await runAssetGeneration(deps(n, memory), CONFIG, live());
  assert.deepEqual([r.kind, r.stage, n.kinds(), memory.size], ["error", "upload", ["upload", "upload"], 1]);
});

test("모드 어긋남(새 경로가 「꺼짐」 404): 고정 안내로 끝 — 기존 생성 경로로 넘어가지 않고 다시 보내지 않는다", async () => {
  const off = () => json(404, { error: "자료를 찾을 수 없습니다.", code: "ASSET_FEATURE_OFF" });
  // 올리기에서
  let n = net({ upload: off });
  let r = await runAssetGeneration(deps(n), CONFIG, live());
  assert.deepEqual([r, n.kinds()], [{ kind: "mode_mismatch", message: M.MODE_MISMATCH }, ["upload"]]);
  // 참고 사진이 없어 생성에서 처음 만남
  n = net({ generate: off });
  r = await runAssetGeneration(deps(n), { age: 25 }, live());
  assert.deepEqual([r, n.kinds()], [{ kind: "mode_mismatch", message: M.MODE_MISMATCH }, ["generate"]]);
  // 다시 받기에서
  n = net({ asset: off });
  assert.deepEqual([await reloadAsset(deps(n), RESULT_ID, live()), n.kinds()], [{ kind: "mode_mismatch", message: M.MODE_MISMATCH }, ["asset"]]);
  // 어떤 경우에도 기존 경로를 부르지 않았다(가짜 fetch는 모르는 주소면 던진다 — 호출 기록에도 없다)
  assert.equal(n.calls.some((c) => c.url.includes("generate-image")), false);
});

// ───────────── 생성 응답 ─────────────
test("생성 응답 — 저장 불명·안 됨: 응답에 실린 이미지를 그대로 돌려주고, 번호가 있어도 조회·결과 받기를 하지 않는다", async () => {
  let n = net({ generate: () => json(200, { success: true, imageUrl: INLINE, assetSaved: "unknown", assetId: RESULT_ID, assetCode: "SAVE_TIMEOUT" }) });
  let r = await runAssetGeneration(deps(n), { age: 25 }, live());
  assert.deepEqual([r, n.kinds()], [{ kind: "inline", imageUrl: INLINE, assetSaved: "unknown", assetId: RESULT_ID, assetCode: "SAVE_TIMEOUT" }, ["generate"]]);
  n = net({ generate: () => json(200, { success: true, imageUrl: INLINE, assetSaved: false, assetCode: "RESERVE_FAILED" }) });
  r = await runAssetGeneration(deps(n), { age: 25 }, live());
  assert.deepEqual([r, n.kinds()], [{ kind: "inline", imageUrl: INLINE, assetSaved: false, assetId: null, assetCode: "RESERVE_FAILED" }, ["generate"]]);
  // 저장 표시가 없는 응답(이론상) → 이미지는 보여 주되 저장 정보 없음
  n = net({ generate: () => json(200, { success: true, imageUrl: INLINE }) });
  r = await runAssetGeneration(deps(n), { age: 25 }, live());
  assert.deepEqual([r.kind, r.assetSaved], ["inline", null]);
});

test("생성 응답 — 422 이미지 생략: 고정 안내와 (있으면) 번호. 스스로 조회하지 않는다", async () => {
  const body = { error: "이미지는 생성됐지만 파일이 너무 커서 지금 화면으로 전달할 수 없습니다.", imageOmitted: true, code: "RESPONSE_TOO_LARGE", assetSaved: "unknown", assetId: RESULT_ID, assetCode: "SAVE_TIMEOUT" };
  let n = net({ generate: () => json(422, body) });
  let r = await runAssetGeneration(deps(n), { age: 25 }, live());
  assert.deepEqual([r, n.kinds()], [{ kind: "omitted", message: body.error, assetSaved: "unknown", assetId: RESULT_ID }, ["generate"]]);
  n = net({ generate: () => json(422, { ...body, assetId: undefined, assetSaved: false }) });
  r = await runAssetGeneration(deps(n), { age: 25 }, live());
  assert.deepEqual(r, { kind: "omitted", message: body.error, assetSaved: false, assetId: null });
  // 200으로 와도(옛 형태) 같은 조합이면 생략으로 본다
  n = net({ generate: () => json(200, body) });
  assert.equal((await runAssetGeneration(deps(n), { age: 25 }, live())).kind, "omitted");
});

test("생성 응답 — 오류: 서버의 고정 문구를 쓰고 다시 생성하지 않는다. 응답을 못 읽으면 「차감됐을 수 있다」 안내", async () => {
  const cases = [
    [() => json(400, { error: "Gemini 키를 등록해 주세요.", needApiKey: true }), { message: "Gemini 키를 등록해 주세요.", status: 400, code: null, needApiKey: true }],
    [() => json(504, { error: "제때 받지 못했습니다.", code: "GENERATION_TIMEOUT" }), { message: "제때 받지 못했습니다.", status: 504, code: "GENERATION_TIMEOUT", needApiKey: false }],
    [() => json(503, { error: "시간이 너무 걸려 생성하지 않았습니다.", code: "TIME_BUDGET_EXCEEDED" }), { message: "시간이 너무 걸려 생성하지 않았습니다.", status: 503, code: "TIME_BUDGET_EXCEEDED", needApiKey: false }],
    [() => json(500, { error: "요청이 너무 많았습니다.", code: "GENERATION_FAILED", providerCode: "RATE_LIMITED" }), { message: "요청이 너무 많았습니다.", status: 500, code: "GENERATION_FAILED", needApiKey: false }],
    [() => json(500, {}), { message: M.GENERATION_FAILED, status: 500, code: null, needApiKey: false }],
    [() => json(400, { error: "x", needApiKey: "yes" }), { message: "x", status: 400, code: null, needApiKey: false }],
    // 생성 요청을 보낸 뒤 결과를 모르고 끝난 경우는 모두 같은 코드(RESULT_UNKNOWN)와 「차감됐을 수 있다」 안내
    [() => new Response("<html>504 Gateway</html>", { status: 504 }), { message: M.GENERATION_NO_RESPONSE, status: 504, code: "RESULT_UNKNOWN", needApiKey: false }],
    [() => new Response("[1,2]", { status: 200 }), { message: M.GENERATION_NO_RESPONSE, status: 200, code: "RESULT_UNKNOWN", needApiKey: false }],
    [() => json(200, { success: true }), { message: M.GENERATION_NO_RESPONSE, status: 200, code: "RESULT_UNKNOWN", needApiKey: false }],
    [() => ({ ok: true, status: 200, headers: new Headers(), body: null, json: async () => ({ assetId: RESULT_ID, assetSaved: true }) }), { message: M.GENERATION_NO_RESPONSE, status: 200, code: "RESULT_UNKNOWN", needApiKey: false }],   // 스트림 없는 응답은 읽지 않는다
    [() => json(200, { assetSaved: true, assetId: RESULT_ID, imageUrl: "https://evil.example/x.png" }), null],     // 저장 확인 + 서명 주소 없음 → 아래에서 따로 본다
    [() => { throw new TypeError("network RAW"); }, { message: M.GENERATION_NO_RESPONSE, status: null, code: "RESULT_UNKNOWN", needApiKey: false }],
  ];
  for (const [generate, expected] of cases) {
    if (!expected) continue;
    const n = net({ generate });
    const r = await runAssetGeneration(deps(n), { age: 25 }, live());
    assert.deepEqual(r, { kind: "error", ...expected, stage: "generation" });
    assert.deepEqual(n.kinds(), ["generate"], "생성은 한 번만");
  }
  assert.match(M.GENERATION_NO_RESPONSE, /차감됐을 수 있습니다/);
});

test("참고 자산을 더 쓸 수 없다는 응답: 그 요청에 쓴 번호의 기억을 지운다 — 다시 올려 다시 생성하지는 않는다. 일시 오류는 기억을 지우지 않는다", async () => {
  for (const [status, code, forgets] of [[404, "REFERENCE_NOT_FOUND", true], [409, "REFERENCE_NOT_READY", true], [410, "REFERENCE_UNAVAILABLE", true], [502, "REFERENCE_MISMATCH", true], [400, "REFERENCE_ROLE_INVALID", true],
    [503, "REFERENCE_READ_FAILED", false], [507, "STORAGE_LIMIT", false], [500, "GENERATION_FAILED", false]]) {
    const n = net({ generate: () => json(status, { error: "안내", code }) });
    const memory = new AssetIdMemory();
    const r = await runAssetGeneration(deps(n, memory), CONFIG, live());
    assert.deepEqual([r.kind, r.code, memory.size, n.kinds()], ["error", code, forgets ? 0 : 4, ["upload", "upload", "upload", "upload", "generate"]], code);
  }
});

// ───────────── 결과 받기 ─────────────
test("결과 받기: 자격 증명 없이·캐시 없이·리다이렉트 금지·리퍼러 없이 한 번. 형식은 받은 바이트의 서명으로 정한다", async () => {
  for (const [bytes, type, ext] of [[PNG, "image/png", "png"], [JPEG, "image/jpeg", "jpg"], [WEBP, "image/webp", "webp"]]) {
    const n = net({ generate: () => json(200, { assetId: RESULT_ID, assetSaved: true, signedUrl: signed(RESULT_ID, ext) }), storage: () => bin(bytes, 200, { "content-type": "text/html" }) });
    const r = await runAssetGeneration(deps(n), { age: 25 }, live());
    assert.deepEqual([r.kind, r.blob.type, r.blob.size], ["asset", type, bytes.length], "머리말(text/html)이 아니라 서명으로");
    const s = n.calls[1];
    assert.deepEqual([s.init.method, s.init.credentials, s.init.mode, s.init.cache, s.init.redirect, s.init.referrerPolicy], ["GET", "omit", "cors", "no-store", "error", "no-referrer"]);
    assert.equal(s.init.headers, undefined, "인증 머리말을 붙이지 않는다");
    assert.ok(s.init.signal instanceof AbortSignal);
    assert.equal(new Uint8Array(await r.blob.arrayBuffer()).every((v, i) => v === bytes[i]), true);
    assertNoUrl(r);
  }
});

test("결과 받기 실패: 저장은 확인됐으므로 번호와 「다시 불러오기」 안내만 — 스스로 조회·재시도하지 않는다", async () => {
  const storages = [
    () => bin(new Uint8Array(0), 400), () => bin(PNG, 403), () => { throw new TypeError("Failed to fetch RAW"); },   // 만료·거절·교차 출처 차단
    () => bin(new Uint8Array(0)), () => bin(sized([0x47, 0x49, 0x46, 0x38], 64)), () => bin(new TextEncoder().encode("<html>error</html>")),
    () => new Response(new ReadableStream({ start(c) { c.enqueue(PNG.subarray(0, 10)); c.error(new Error("stream RAW")); } })),
  ];
  for (const storage of storages) {
    const n = net({ storage });
    const r = await runAssetGeneration(deps(n), { age: 25 }, live());
    assert.deepEqual([r, n.kinds()], [{ kind: "asset_pending", assetId: RESULT_ID, message: M.RESULT_PENDING }, ["generate", "storage"]]);
  }
  // 서명 주소가 없거나(서버가 null) 우리 저장소 주소가 아니면 아예 받으러 가지 않는다
  for (const signedUrl of [null, undefined, "", `https://evil.example/storage/v1/object/sign/aif-assets/${U}/generated/${RESULT_ID}.png?token=abc`, signed(id(5)), signed(RESULT_ID, "gif"),
    signed() + "&download=1", signed().replace("https://", "http://"), signed().replace("/generated/", "/ref_face/"), signed().replace("?token=", "/../x?token="), 42]) {
    const n = net({ generate: () => json(200, { assetId: RESULT_ID, assetSaved: true, signedUrl }) });
    const r = await runAssetGeneration(deps(n), { age: 25 }, live());
    assert.deepEqual([r.kind, r.assetId, n.kinds()], ["asset_pending", RESULT_ID, ["generate"]], String(signedUrl).slice(0, 60));
  }
});

test("결과 받기 상한: 실제로 받은 바이트를 세어 상한을 넘는 순간 끊는다(끝없는 응답·끝나지 않는 cancel·거짓 길이 머리말)", async () => {
  assert.equal(F.RESULT_MAX_BYTES, 20 * 1024 * 1024);
  const opts = (signal, maxBytes) => ({ storageOrigin: ORIGIN, assetId: RESULT_ID, signal, maxBytes });
  // 끝없는 응답 + 끝나지 않는 cancel → 상한 직후 즉시 too_large, 요청도 중단
  let pulled = 0; let cancelled = 0; let aborted = false;
  const fetchFn = async (_u, init) => {
    init.signal.addEventListener("abort", () => { aborted = true; });
    return new Response(new ReadableStream({ pull(c) { pulled++; if (pulled > 5000) { c.close(); return; } c.enqueue(pulled === 1 ? sized(PNG_SIG, 1024) : new Uint8Array(1024)); }, cancel() { cancelled++; return never(); } }, { highWaterMark: 0 }));
  };
  const t0 = Date.now();
  let r = await fetchResultBlob(fetchFn, signed(), opts(live(), 3000));
  assert.deepEqual([r, cancelled, aborted], [{ ok: false, reason: "too_large" }, 1, true]);
  assert.ok(pulled <= 5 && Date.now() - t0 < 1000, `상한 3000바이트를 넘긴 직후 멈췄다(덩어리 ${pulled}개)`);
  // 길이 머리말이 상한보다 크면 본문을 읽지 않는다
  let read = false;
  r = await fetchResultBlob(async () => new Response(new ReadableStream({ pull(c) { read = true; c.enqueue(PNG); c.close(); } }, { highWaterMark: 0 }), { headers: { "content-length": "999999" } }), signed(), opts(live(), 3000));
  assert.deepEqual([r, read], [{ ok: false, reason: "too_large" }, false]);
  // 길이 머리말은 작다고 하지만 실제는 큼 → 실제 바이트로 끊는다
  r = await fetchResultBlob(async () => new Response(new ReadableStream({ start(c) { c.enqueue(sized(PNG_SIG, 2000)); c.enqueue(new Uint8Array(2000)); c.close(); } }), { headers: { "content-length": "10" } }), signed(), opts(live(), 3000));
  assert.deepEqual(r, { ok: false, reason: "too_large" });
  // 정확히 상한은 통과
  r = await fetchResultBlob(async () => bin(sized(PNG_SIG, 3000)), signed(), opts(live(), 3000));
  assert.deepEqual([r.ok, r.blob.size], [true, 3000]);
  // 읽을 수 있는 스트림이 없는 응답은 쓰지 않는다 — 통째로 받는 길(arrayBuffer·blob)을 부르지 않는다
  let buffered = 0;
  const noStream = (body) => ({ ok: true, status: 200, headers: new Headers(), body, arrayBuffer: async () => { buffered++; return sized(PNG_SIG, 100).buffer; }, blob: async () => { buffered++; return new Blob([PNG]); }, text: async () => { buffered++; return ""; } });
  for (const body of [null, undefined, {}, { getReader: "no" }]) assert.deepEqual(await fetchResultBlob(async () => noStream(body), signed(), opts(live(), 3000)), { ok: false, reason: "no_stream" });
  assert.equal(buffered, 0);
  await sleep(10);
});

// ───────────── 취소 ─────────────
test("취소 — 올리는 중 신호가 끊기면: 그 번호를 기억하지 않고, 다음 올리기·생성을 시작하지 않는다(사진이 바뀌었거나 화면을 떠난 경우)", async () => {
  // 첫 올리기 응답이 오기 전에 끊김 → 늦게 온 번호는 기억되지 않는다
  let release;
  const n = net({ upload: () => new Promise((res) => { release = () => res(json(200, { assetId: id(1), assetSaved: true })); }) });
  const memory = new AssetIdMemory();
  const ac = new AbortController();
  const p = runAssetGeneration(deps(n, memory), CONFIG, ac.signal);
  await sleep(5);
  ac.abort();
  release();
  assert.deepEqual([await p, memory.size, n.kinds()], [{ kind: "aborted" }, 0, ["upload"]]);
  // 시작 전에 이미 끊긴 신호 → 요청 0
  const n2 = net(); const dead = new AbortController(); dead.abort();
  assert.deepEqual([await runAssetGeneration(deps(n2), CONFIG, dead.signal), n2.calls.length], [{ kind: "aborted" }, 0]);
  assert.deepEqual([await uploadReference(n2.fetch, { role: "face", dataUrl: photo(1) }, dead.signal), await reloadAsset(deps(n2), RESULT_ID, dead.signal), n2.calls.length], [{ kind: "aborted" }, { kind: "aborted" }, 0]);
  // fetch가 중단 오류를 던지는 경우(실제 브라우저의 동작)
  const ac3 = new AbortController();
  const n3 = net({ upload: (c) => new Promise((_res, rej) => c.init.signal.addEventListener("abort", () => rej(new DOMException("Aborted", "AbortError")))) });
  const m3 = new AssetIdMemory();
  const p3 = runAssetGeneration(deps(n3, m3), CONFIG, ac3.signal);
  await sleep(5); ac3.abort();
  assert.deepEqual([await p3, m3.size, n3.kinds()], [{ kind: "aborted" }, 0, ["upload"]]);
  // 모든 요청에 중단 신호가 실리고(단계별 시간 상한을 겸한 신호), 단계가 끝나면 그 신호는 끊겨 있다
  const n4 = net(); const ac4 = new AbortController();
  await runAssetGeneration(deps(n4), CONFIG, ac4.signal);
  assert.equal(n4.calls.every((c) => c.init.signal instanceof AbortSignal && c.init.signal.aborted), true);
  assert.equal(ac4.signal.aborted, false, "바깥 신호는 건드리지 않는다");
});

test("취소 — 생성 응답 대기 중·결과 받는 중에 끊기면: 결과를 돌려주지 않는다(늦게 온 결과·오류는 버린다). 이미 나간 생성은 다시 보내지 않는다", async () => {
  // 생성 응답 대기 중
  let release;
  let n = net({ generate: () => new Promise((res) => { release = () => res(json(200, { assetId: RESULT_ID, assetSaved: true, signedUrl: signed() })); }) });
  let ac = new AbortController();
  let p = runAssetGeneration(deps(n), { age: 25 }, ac.signal);
  await sleep(5); ac.abort(); release();
  assert.deepEqual([await p, n.kinds()], [{ kind: "aborted" }, ["generate"]], "결과 받기를 시작하지 않았다");
  // 결과 받는 중(본문이 멈춤 + 끝나지 않는 cancel)
  let cancelled = 0;
  n = net({ storage: () => new Response(new ReadableStream({ start(c) { c.enqueue(PNG.subarray(0, 10)); }, cancel() { cancelled++; return never(); } })) });
  ac = new AbortController();
  p = runAssetGeneration(deps(n), { age: 25 }, ac.signal);
  await sleep(10);
  const t0 = Date.now(); ac.abort();
  assert.deepEqual(await p, { kind: "aborted" });
  assert.ok(Date.now() - t0 < 500, "cancel 완료를 기다리지 않았다");
  await sleep(10);
  assert.deepEqual([cancelled, n.kinds()], [1, ["generate", "storage"]]);
  // 결과를 다 받은 직후 끊김(늦은 성공) → 버린다
  n = net({ storage: async () => { await sleep(20); return bin(PNG); } });
  ac = new AbortController();
  p = runAssetGeneration(deps(n), { age: 25 }, ac.signal);
  await sleep(5); ac.abort();
  assert.deepEqual(await p, { kind: "aborted" });
  // 다시 받기 도중 끊김
  n = net({ asset: async () => { await sleep(20); return json(200, { id: RESULT_ID, state: "ready", signedUrl: signed() }); } });
  ac = new AbortController();
  const q = reloadAsset(deps(n), RESULT_ID, ac.signal);
  await sleep(5); ac.abort();
  assert.deepEqual([await q, n.kinds()], [{ kind: "aborted" }, ["asset"]]);
});

// ───────────── 다시 받기 ─────────────
test("다시 받기: 한 번 부르면 조회 1회 + (준비됐으면) 결과 받기 1회. 스스로 되풀이하지 않는다", async () => {
  let n = net();
  let r = await reloadAsset(deps(n), RESULT_ID, live());
  assert.deepEqual([r.kind, r.assetId, r.blob.type, n.kinds()], ["asset", RESULT_ID, "image/png", ["asset", "storage"]]);
  assert.deepEqual([n.calls[0].url, n.calls[0].init.method, n.calls[0].init.cache], [`/api/aif/assets/${RESULT_ID}`, "GET", "no-store"]);
  assertNoUrl(r);
  // 확인 중(202) → 안내만, 다시 조회하지 않는다
  n = net({ asset: () => json(202, { id: RESULT_ID, state: "checking", message: "x" }) });
  assert.deepEqual([await reloadAsset(deps(n), RESULT_ID, live()), n.kinds()], [{ kind: "checking", assetId: RESULT_ID, message: M.CHECKING }, ["asset"]]);
  // 없음·만료·저장 안 됨(404) → 서버 문구
  for (const [code, error] of [["ASSET_NOT_FOUND", "자료를 찾을 수 없습니다."], ["ASSET_EXPIRED", "보관 기간이 지난 자료입니다."], ["ASSET_NOT_SAVED", "저장되지 않은 자료입니다."], ["ASSET_MISSING", "파일을 찾을 수 없습니다."]]) {
    n = net({ asset: () => json(404, { error, code }) });
    assert.deepEqual([await reloadAsset(deps(n), RESULT_ID, live()), n.kinds()], [{ kind: "gone", message: error, code }, ["asset"]]);
  }
  // 일시 오류·응답 이상·다른 번호의 응답·결과 받기 실패 → 다시 눌러 볼 수 있는 상태
  for (const over of [{ asset: () => json(503, { code: "ASSET_TEMPORARILY_UNAVAILABLE" }) }, { asset: () => { throw new TypeError("RAW"); } }, { asset: () => new Response("<html>", { status: 200 }) },
    { asset: () => json(200, { id: id(9), state: "ready", signedUrl: signed(id(9)) }) }, { asset: () => json(200, { id: RESULT_ID, state: "ready", signedUrl: signed(id(9)) }) },
    { asset: () => json(200, { id: RESULT_ID, state: "ready" }) }, { storage: () => bin(PNG, 400) },
    { asset: () => json(200, { id: id(9), state: "ready", signedUrl: signed() }) }, { asset: () => json(200, { state: "ready", signedUrl: signed() }) }, { asset: () => json(200, { id: RESULT_ID, state: "checking", signedUrl: signed() }) }]) {
    n = net(over);
    r = await reloadAsset(deps(n), RESULT_ID, live());
    assert.deepEqual([r, n.count("asset")], [{ kind: "asset_pending", assetId: RESULT_ID, message: M.RELOAD_FAILED }, 1]);
    assert.ok(n.count("storage") <= 1);
  }
  // 번호 모양이 아니면 요청하지 않는다
  n = net();
  assert.deepEqual([(await reloadAsset(deps(n), "../../etc", live())).kind, n.calls.length], ["gone", 0]);
});

// ───────────── 불변 ─────────────
test("서명 주소 판정: 우리 저장소의 그 번호의 생성 원본 주소만 받는다", () => {
  assert.equal(isOurSignedUrl(signed(), ORIGIN, RESULT_ID), true);
  assert.equal(isOurSignedUrl(signed(RESULT_ID, "jpg"), ORIGIN + "/", RESULT_ID), true);
  for (const [url, origin, asset] of [[signed(), "http://proj.supabase.co", RESULT_ID], [signed(), "https://user:pw@proj.supabase.co", RESULT_ID], [signed(), "not a url", RESULT_ID], [signed(), undefined, RESULT_ID],
    [signed(), ORIGIN, "nope"], [signed(id(2)), ORIGIN, RESULT_ID], [signed(RESULT_ID, "png", "not-a-user"), ORIGIN, RESULT_ID], [signed() + "#frag", ORIGIN, RESULT_ID], [signed() + "%0a", ORIGIN, RESULT_ID],
    [signed().replace("?token=", "?x=1&token="), ORIGIN, RESULT_ID], [signed().replace("aif-assets", "other"), ORIGIN, RESULT_ID], [`${ORIGIN}.evil.example/storage/v1/object/sign/aif-assets/${U}/generated/${RESULT_ID}.png?token=a`, ORIGIN, RESULT_ID]]) {
    assert.equal(isOurSignedUrl(url, origin, asset), false, String(url).slice(-50));
  }
});

test("불변: 어떤 사례에서도 생성은 최대 1회·결과 받기는 최대 1회이고, 기존 생성 경로를 부르지 않으며, 결과·기억에 서명 주소가 남지 않는다", async () => {
  const overs = [{}, { storage: () => bin(PNG, 403) }, { generate: () => json(500, { error: "x" }) }, { generate: () => json(200, { imageUrl: INLINE, assetSaved: "unknown", assetId: RESULT_ID }) },
    { generate: () => json(422, { error: "x", imageOmitted: true, code: "RESPONSE_TOO_LARGE" }) }, { generate: () => { throw new Error("x"); } }, { upload: () => json(503, {}) },
    { generate: () => json(404, { code: "ASSET_FEATURE_OFF" }) }, { generate: () => json(410, { error: "x", code: "REFERENCE_UNAVAILABLE" }) }];
  for (const over of overs) {
    const n = net(over);
    const memory = new AssetIdMemory();
    const r = await runAssetGeneration(deps(n, memory), CONFIG, live());
    assert.ok(n.count("generate") <= 1 && n.count("storage") <= 1 && n.count("asset") === 0 && n.count("upload") <= 4);
    assert.equal(n.calls.some((c) => c.url.includes("generate-image") || c.url.includes("/api/history")), false);
    assertNoUrl(r);
    const mem = []; for (const s of collectSlots(CONFIG)) mem.push(memory.get(s) ?? null);
    assertNoUrl(mem);
  }
  for (const m of Object.values(M)) assert.match(m, /(니다|세요)\.$/, "한국어 존댓말 고정 문구");
});

// ───────────── W01-UIC 보완(Master msg_5562dd13e7ce, 검수 재현): 유한 대기·스트림 필수·사진 기억 정리·같은 상품 사진 ─────────────
test("유한 대기 — 올리기: 응답이 오지 않거나 본문이 멈추면 상한 뒤 그만둔다. 생성 0, 번호 미기억, 다시 올리지 않는다. 늦게 온 응답은 버린다", async () => {
  const stalledBody = () => new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('{"assetId":')); }, cancel() { return never(); } }));
  for (const upload of [never, stalledBody, async () => { await sleep(80); return json(200, { assetId: id(1), assetSaved: true }); }, async () => { await sleep(80); throw new Error("late RAW"); }]) {
    const n = net({ upload });
    const memory = new AssetIdMemory();
    const t0 = Date.now();
    const r = await runAssetGeneration({ ...deps(n, memory), limits: { uploadMs: 30 } }, CONFIG, live());
    assert.deepEqual(r, { kind: "error", message: M.UPLOAD_TIMEOUT, status: null, code: "UPLOAD_TIMEOUT", needApiKey: false, stage: "upload" });
    assert.ok(Date.now() - t0 < 1000);
    await sleep(110);
    assert.deepEqual([n.kinds(), memory.size], [["upload"], 0], "늦게 온 번호를 기억하지 않았고 다음 요청도 없다");
    assert.equal(n.calls[0].init.signal.aborted, true, "요청에 중단 신호를 보냈다");
  }
  assert.match(M.UPLOAD_TIMEOUT, /보관됐는지는 확인하지 못했습니다/);
});

test("유한 대기 — 생성: 화면의 대기 상한은 서버 예산(300초)보다 길고, 지나면 「결과·차감 불명」으로 끝난다. 다시 보내지 않고 늦은 결과는 버린다", async () => {
  assert.ok(F.GENERATION_WAIT_MS > 300_000, "서버가 답할 시간을 화면이 먼저 끊지 않는다");
  const stalledBody = () => new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('{"assetSaved":true,')); }, cancel() { return never(); } }));
  for (const generate of [never, stalledBody, async () => { await sleep(80); return json(200, { assetId: RESULT_ID, assetSaved: true, signedUrl: signed() }); }, async () => { await sleep(80); throw new Error("late RAW"); }]) {
    const n = net({ generate });
    const t0 = Date.now();
    const r = await runAssetGeneration({ ...deps(n), limits: { generationMs: 30 } }, { age: 25 }, live());
    assert.deepEqual(r, { kind: "error", message: M.GENERATION_NO_RESPONSE, status: null, code: "RESULT_UNKNOWN", needApiKey: false, stage: "generation" });
    assert.ok(Date.now() - t0 < 1000);
    await sleep(110);
    assert.deepEqual(n.kinds(), ["generate"], "생성 1회, 결과 받기·재전송 0");
  }
  assert.equal(F.RESULT_UNKNOWN_CODE, "RESULT_UNKNOWN");
});

test("유한 대기 — 결과 받기·다시 받기: 멈추면 상한 뒤 「다시 불러오기」 상태로 끝난다(끝나지 않는 cancel에도). 스스로 다시 받지 않는다", async () => {
  const stalled = () => new Response(new ReadableStream({ start(c) { c.enqueue(PNG.subarray(0, 10)); }, cancel() { return never(); } }));
  for (const storage of [never, stalled, async () => { await sleep(80); return bin(PNG); }]) {
    let n = net({ storage });
    let t0 = Date.now();
    let r = await runAssetGeneration({ ...deps(n), limits: { resultMs: 30 } }, { age: 25 }, live());
    assert.deepEqual([r, n.kinds()], [{ kind: "asset_pending", assetId: RESULT_ID, message: M.RESULT_PENDING }, ["generate", "storage"]]);
    assert.ok(Date.now() - t0 < 1000);
    n = net({ storage });
    r = await reloadAsset({ ...deps(n), limits: { resultMs: 30 } }, RESULT_ID, live());
    assert.deepEqual([r, n.kinds()], [{ kind: "asset_pending", assetId: RESULT_ID, message: M.RELOAD_FAILED }, ["asset", "storage"]]);
  }
  // 조회 자체가 멈춤
  for (const asset of [never, () => new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode("{")); }, cancel() { return never(); } }))]) {
    const n = net({ asset });
    const t0 = Date.now();
    const r = await reloadAsset({ ...deps(n), limits: { reloadMs: 30 } }, RESULT_ID, live());
    assert.deepEqual([r, n.kinds()], [{ kind: "asset_pending", assetId: RESULT_ID, message: M.RELOAD_FAILED }, ["asset"]]);
    assert.ok(Date.now() - t0 < 1000);
  }
  // fetchResultBlob 단독: 시간 초과는 timeout, 바깥 취소는 aborted로 구분한다
  const o = (signal) => ({ storageOrigin: ORIGIN, assetId: RESULT_ID, signal, waitMs: 30 });
  assert.deepEqual(await fetchResultBlob(never, signed(), o(live())), { ok: false, reason: "timeout" });
  const ac = new AbortController(); setTimeout(() => ac.abort(), 10);
  assert.deepEqual(await fetchResultBlob(never, signed(), { ...o(ac.signal), waitMs: 5000 }), { ok: false, reason: "aborted" });
  await sleep(110);
});

test("API 응답도 스트림으로 상한까지만 읽는다: 너무 큰 응답·끝없는 응답·스트림 없는 응답은 쓰지 않고, res.json()을 부르지 않는다", async () => {
  assert.deepEqual([F.API_JSON_MAX_BYTES, F.GENERATION_JSON_MAX_BYTES > 4_000_000], [64 * 1024, true]);
  let jsonCalled = 0;
  const huge = () => { const r = new Response(JSON.stringify({ assetId: id(1), assetSaved: true, pad: "x".repeat(70 * 1024) })); r.json = async () => { jsonCalled++; return {}; }; return r; };
  let n = net({ upload: huge });
  let r = await runAssetGeneration(deps(n), CONFIG, live());
  assert.deepEqual([r.kind, r.stage, r.message, n.kinds()], ["error", "upload", M.UPLOAD_FAILED, ["upload"]]);
  // 끝없는 올리기 응답: 상한 직후 끊는다
  let pulled = 0;
  n = net({ upload: () => new Response(new ReadableStream({ pull(c) { pulled++; if (pulled > 4000) { c.close(); return; } c.enqueue(new Uint8Array(1024).fill(0x20)); }, cancel() { return never(); } }, { highWaterMark: 0 })) });
  r = await runAssetGeneration(deps(n), CONFIG, live());
  assert.deepEqual([r.kind, r.stage], ["error", "upload"]);
  assert.ok(pulled <= 70, `64KiB를 넘긴 직후 멈췄다(덩어리 ${pulled}개)`);
  // 생성 응답이 상한(4.5MB)을 넘으면 읽지 않고 「결과 불명」
  n = net({ generate: () => new Response(JSON.stringify({ imageUrl: "data:image/png;base64," + "A".repeat(4_600_000), assetSaved: false })) });
  r = await runAssetGeneration(deps(n), { age: 25 }, live());
  assert.deepEqual([r.kind, r.code, n.kinds()], ["error", "RESULT_UNKNOWN", ["generate"]]);
  // 상한 안의 큰 이미지 응답(약 3.9MB)은 읽는다
  const bigInline = "data:image/png;base64," + "A".repeat(3_900_000);
  n = net({ generate: () => new Response(JSON.stringify({ imageUrl: bigInline, assetSaved: false })) });
  r = await runAssetGeneration(deps(n), { age: 25 }, live());
  assert.deepEqual([r.kind, r.imageUrl.length], ["inline", bigInline.length]);
  // 스트림 없는 올리기·조회 응답
  const noStream = (body) => ({ ok: true, status: 200, headers: new Headers(), body: null, json: async () => { jsonCalled++; return body; } });
  n = net({ upload: () => noStream({ assetId: id(1), assetSaved: true }) });
  r = await runAssetGeneration(deps(n), CONFIG, live());
  assert.deepEqual([r.kind, r.stage, n.kinds()], ["error", "upload", ["upload"]]);
  n = net({ asset: () => noStream({ id: RESULT_ID, state: "ready", signedUrl: signed() }) });
  assert.deepEqual([(await reloadAsset(deps(n), RESULT_ID, live())).kind, n.kinds()], ["asset_pending", ["asset"]]);
  assert.equal(jsonCalled, 0);
  await sleep(10);
});

test("사진 기억 정리: 생성을 시작할 때 지금 칸에 있는 사진의 번호만 남는다 — 바꾸거나 뺀 사진의 번호는 지워지고 되살아나지 않는다", async () => {
  const n = net();
  const memory = new AssetIdMemory();
  await runAssetGeneration(deps(n, memory), CONFIG, live());                                  // 얼굴1·장소2·상품3·상품4
  assert.equal(memory.size, 4);
  // 얼굴을 바꾸고 상품 하나를 뺌 → 옛 얼굴·뺀 상품의 번호가 지워진다
  const next = { ...CONFIG, personImage: photo(9), productImages: [photo(4)] };
  await runAssetGeneration(deps(n, memory), next, live());
  assert.equal(memory.size, 3);
  assert.deepEqual([memory.get({ role: "face", dataUrl: photo(1) }), memory.get({ role: "product", dataUrl: photo(3) })], [undefined, undefined]);
  assert.deepEqual(n.calls.filter((c) => c.kind === "generate")[1].body.references, [{ assetId: id(5), role: "face" }, { assetId: id(2), role: "place" }, { assetId: id(4), role: "product" }]);
  // 원래 사진으로 되돌리면 옛 번호를 다시 쓰지 않고 새로 올린다(지워졌으므로)
  await runAssetGeneration(deps(n, memory), CONFIG, live());
  assert.deepEqual(n.calls.filter((c) => c.kind === "generate")[2].body.references.map((x) => x.assetId), [id(6), id(2), id(7), id(4)]);
  // 광고 모드를 끄면 상품 번호가 지워진다. 참고 사진이 하나도 없으면 기억이 빈다
  await runAssetGeneration(deps(n, memory), { ...CONFIG, isAdMode: false }, live());
  assert.equal(memory.size, 2);
  await runAssetGeneration(deps(n, memory), { age: 25 }, live());
  assert.equal(memory.size, 0);
  // 여러 번 바꿔도 기억은 칸 수(최대 5)를 넘지 않는다
  for (let i = 20; i < 40; i++) await runAssetGeneration(deps(n, memory), { ...CONFIG, personImage: photo(i), productImages: [photo(i + 100), photo(i + 200), photo(i + 300)] }, live());
  assert.equal(memory.size, 5);
});

test("같은 상품 사진: 칸 수와 순서를 지켜 칸마다 따로 올리고 서로 다른 번호를 보낸다. 다시 생성하면 다시 올리지 않는다", async () => {
  const n = net();
  const memory = new AssetIdMemory();
  const cfg = { isAdMode: true, productImages: [photo(3), photo(3), photo(3)] };
  let r = await runAssetGeneration(deps(n, memory), cfg, live());
  assert.equal(r.kind, "asset");
  assert.deepEqual(n.kinds(), ["upload", "upload", "upload", "generate", "storage"]);
  assert.deepEqual(n.calls[3].body.references, [{ assetId: id(1), role: "product" }, { assetId: id(2), role: "product" }, { assetId: id(3), role: "product" }]);
  assert.equal(new Set(n.calls[3].body.references.map((x) => x.assetId)).size, 3, "번호가 서로 다르다");
  await runAssetGeneration(deps(n, memory), cfg, live());
  assert.deepEqual([n.count("upload"), n.calls.filter((c) => c.kind === "generate")[1].body.references.map((x) => x.assetId)], [3, [id(1), id(2), id(3)]]);
  // 가운데에 다른 사진이 끼어도 순서 그대로: [A, B, A] → A의 첫째·B·A의 둘째
  const n2 = net(); const m2 = new AssetIdMemory();
  await runAssetGeneration(deps(n2, m2), { isAdMode: true, productImages: [photo(3), photo(4), photo(3)] }, live());
  assert.deepEqual(n2.calls.slice(0, 3).map((c) => c.body.image), [photo(3), photo(4), photo(3)]);
  assert.deepEqual(n2.calls[3].body.references.map((x) => x.assetId), [id(1), id(2), id(3)]);
  // 서버가 같은 번호를 두 번 돌려주면(이상 응답) 그 번호를 두 칸에 쓰지 않고 생성하지 않는다
  const n3 = net({ upload: () => json(200, { assetId: id(1), assetSaved: true }) });
  r = await runAssetGeneration(deps(n3), cfg, live());
  assert.deepEqual([r.kind, r.stage, n3.kinds()], ["error", "upload", ["upload", "upload"]]);
  // 기억은 한 번호를 한 칸에만 둔다
  const m = new AssetIdMemory();
  m.set({ role: "product", dataUrl: photo(3), occurrence: 0 }, id(1));
  m.set({ role: "product", dataUrl: photo(3), occurrence: 1 }, id(1));
  assert.deepEqual([m.size, m.get({ role: "product", dataUrl: photo(3), occurrence: 1 })], [1, undefined]);
});

test("처리되지 않은 거부가 하나도 없다", async () => {
  await sleep(80);
  assert.deepEqual(unhandled, []);
});
