// W01x 생성 응답 크기 보호 시험 (2026-11-18, CC-SNS-01, Master msg_29d22717b7af, 설계 W00_BASELINE §21). 실제 DB·저장소·키·AI 호출 없음.
//  A) 서버: 성공 응답을 직렬화한 UTF-8 바이트가 상한(4,000,000)을 넘으면 이미지를 뺀 작은 응답으로 바꾼다 — 실제 라우트 POST와 조정 계층(off·shadow).
//  B) 화면이 응답을 읽는 한 곳(readGenerateResponse) — 비JSON·이미지 없는 응답은 고정 문구, 원문 노출 0.
//  C) 화면 소스 정적 확인 — 이미지가 없는 결과에서는 캡션·히스토리 등 후속 호출과 재생성이 없다.
//  ★ 한계: 이미지는 합성 바이트다(실제 공급자가 돌려주는 크기·형식이 아니다). 「플랫폼이 실제로 어느 크기에서 끊는가」는 이 시험이 보지 않는다 —
//     우리 쪽 상한이 먼저 동작하는지만 본다. 화면 컴포넌트를 실제로 그려 보지도 않는다(C는 소스 문자열 확인).
import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { readFileSync } from "node:fs";

const SRC = new URL("../src/", import.meta.url).href;
const stub = (code) => "data:text/javascript," + encodeURIComponent(code);
const STUBS = {
  "@/lib/access": stub("export const checkProgramAccessApi = (...a) => globalThis.__aifLimit.checkAccess(...a);"),
  "@/lib/apiKeys": stub("export const getUserGeminiApiKey = (...a) => globalThis.__aifLimit.getApiKey(...a);"),
  "@/lib/gemini": stub("export const generateInfluencerImage = (...a) => globalThis.__aifLimit.generate(...a);"),
  "@/lib/supabase/admin": stub("export const createAdminClient = (...a) => globalThis.__aifLimit.createAdminClient(...a);"),
};
register(stub(`
const SRC = ${JSON.stringify(SRC)}; const STUBS = ${JSON.stringify(STUBS)};
export async function resolve(s, c, n) {
  if (STUBS[s]) return { url: STUBS[s], shortCircuit: true };
  if (s === "next/server") return n("next/server.js", c);
  if (s.startsWith("@/")) return n(SRC + s.slice(2) + ".ts", c);
  try { return await n(s, c); } catch (e) { if (s.startsWith(".") && !/\\.[a-z]+$/.test(s)) return n(s + ".ts", c); throw e; }
}`));

const { POST } = await import("../src/app/api/generate-image/route.ts");
const { handleGenerateImagePost, limitResponseBody, RESPONSE_MAX_BYTES, RESPONSE_TOO_LARGE_CODE, AIF_ASSETS_MODE } = await import("../src/lib/assets/generation.ts");
const { readGenerateResponse, GENERATE_MESSAGES } = await import("../src/lib/assets/generateResponse.ts");
const { ASSET_SAVE_MESSAGES } = await import("../src/lib/assets/saveNotice.ts");
const STUDIO = readFileSync(new URL("../src/components/InfluencerStudio.tsx", import.meta.url), "utf8").replace(/\r\n/g, "\n");

const U = "abcdef01-2345-4789-8abc-def012345678";
const ASSET = "0a0b0c0d-1111-4222-8333-444455556666";
const OBJ = "99999999-aaaa-4bbb-8ccc-dddddddddddd";
const utf8 = (v) => new TextEncoder().encode(typeof v === "string" ? v : JSON.stringify(v)).length;
const req = () => new Request("http://local/api/generate-image", { method: "POST", body: JSON.stringify({ quality: "4K" }) });

// 합성 이미지: PNG 서명으로 시작하는 바이트를 base64로. 길이만 맞춘 것이고 실제 그림이 아니다.
const PNG_HEAD = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
function dataUrlOfBase64Length(len) {
  assert.equal(len % 4, 0, "base64 길이는 4의 배수");
  const bytes = new Uint8Array((len / 4) * 3);
  bytes.set(PNG_HEAD);
  const b64 = Buffer.from(bytes).toString("base64");
  assert.equal(b64.length, len);
  return "data:image/png;base64," + b64;
}
/** 직렬화한 본문이 정확히 target 바이트가 되는 imageUrl을 만든다(본문의 나머지 필드는 extra). 딱 맞출 수 없으면 꼬리 글자로 채운다 */
function imageForBodyBytes(target, extra = {}) {
  const fixed = utf8({ success: true, imageUrl: "data:image/png;base64,", ...extra });
  const room = target - fixed;
  const len = Math.floor(room / 4) * 4;
  const url = dataUrlOfBase64Length(len);
  const pad = room - len;   // 0~3바이트: off 경로 전용 꼬리(공급자가 준 문자열을 그대로 싣는 경로라 길이만 맞추면 된다)
  return url + "=".repeat(pad);
}

function world(image) {
  const n = { access: 0, key: 0, generate: 0, admin: 0 };
  const w = {
    n,
    checkAccess: async () => { n.access++; return { allowed: true, user: { id: U } }; },
    getApiKey: async () => { n.key++; return "member-own-key"; },
    generate: async () => { n.generate++; return image; },
    createAdminClient: () => { n.admin++; throw new Error("관리자 클라이언트가 만들어지면 안 됨"); },
  };
  globalThis.__aifLimit = w;
  return w;
}
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
  const deps = { rpc: async (fn, args) => { calls.push(fn); return h[fn](args); }, storage: { upload: async (p) => { calls.push("upload"); return h.upload(p); } } };
  return { calls, getAssetDeps: () => deps };
}
const off = (w) => ({ mode: "off", checkAccess: w.checkAccess, getApiKey: w.getApiKey, generate: w.generate });
const shadow = (w, a) => ({ mode: "shadow", checkAccess: w.checkAccess, getApiKey: w.getApiKey, generate: w.generate, getAssetDeps: a.getAssetDeps });
const SMALL = { success: true, imageOmitted: true, code: "RESPONSE_TOO_LARGE" };

// ───────────── A) 서버 ─────────────
test("상한은 4,000,000바이트이고 공식 문서의 4.5 MB를 어느 단위로 읽어도 그보다 작다", () => {
  assert.equal(RESPONSE_MAX_BYTES, 4_000_000);
  assert.ok(RESPONSE_MAX_BYTES < 4_500_000 && RESPONSE_MAX_BYTES < 4.5 * 1024 * 1024);
  assert.equal(RESPONSE_TOO_LARGE_CODE, "RESPONSE_TOO_LARGE");
  assert.equal(AIF_ASSETS_MODE, "off");
});

test("경계(off, 실제 직렬화 UTF-8 바이트): 상한 −1·상한은 예전 본문 그대로, 상한 +1은 이미지 없는 작은 응답", async () => {
  for (const [target, omitted] of [[RESPONSE_MAX_BYTES - 1, false], [RESPONSE_MAX_BYTES, false], [RESPONSE_MAX_BYTES + 1, true]]) {
    const image = imageForBodyBytes(target);
    assert.equal(utf8({ success: true, imageUrl: image }), target, "시험 입력이 목표 바이트와 정확히 같다");
    const w = world(image);
    const r = await handleGenerateImagePost(req(), off(w));
    assert.equal(r.status, 200);
    assert.equal(w.n.generate, 1, "공급자 호출은 정확히 1회");
    if (omitted) {
      assert.deepEqual(r.body, SMALL);
    } else {
      assert.deepEqual(Object.keys(r.body), ["success", "imageUrl"]);
      assert.equal(r.body.imageUrl, image);
      assert.equal(utf8(r.body), target);
    }
    assert.ok(utf8(r.body) <= RESPONSE_MAX_BYTES, "돌려주는 본문은 언제나 상한 이내");
  }
});

test("실제 라우트 POST(운영 상수 off): 큰 결과 → 200 + 이미지 없는 작은 JSON, 작은 결과 → 예전과 같은 본문", async () => {
  const big = dataUrlOfBase64Length(6_000_000);
  let w = world(big);
  let res = await POST(req());
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.deepEqual(JSON.parse(text), SMALL);
  assert.ok(utf8(text) < 200, `작은 응답(${utf8(text)}바이트)`);
  assert.deepEqual([w.n.generate, w.n.admin], [1, 0], "생성 1회, 관리자 클라이언트·저장 0");

  const small = dataUrlOfBase64Length(4_000);
  w = world(small);
  res = await POST(req());
  assert.deepEqual(await res.json(), { success: true, imageUrl: small });
  assert.equal(w.n.generate, 1);
});

test("한도 안이면 같은 객체를 그대로 돌려준다(본문 무변경), 200이 아닌 응답은 크기와 상관없이 건드리지 않는다", () => {
  const ok = { status: 200, body: { success: true, imageUrl: dataUrlOfBase64Length(400) } };
  assert.equal(limitResponseBody(ok), ok);
  const err = { status: 500, body: { error: "가".repeat(2_000_000) } };   // 한글 1자 = 3바이트 → 6MB
  assert.ok(utf8(err.body) > RESPONSE_MAX_BYTES);
  assert.equal(limitResponseBody(err), err);
});

test("바이트로 잰다(글자 수가 아니다): 글자 수는 상한 아래여도 UTF-8 바이트가 넘으면 줄인다", () => {
  const body = { success: true, imageUrl: "data:image/png;base64,AAAA", note: "가".repeat(1_400_000) };   // 약 140만 자, 약 4.2MB
  assert.ok(JSON.stringify(body).length < RESPONSE_MAX_BYTES && utf8(body) > RESPONSE_MAX_BYTES);
  assert.deepEqual(limitResponseBody({ status: 200, body }).body, SMALL);
});

test("shadow 경계: 저장 결과 필드까지 포함한 직렬화 바이트로 판정한다", async () => {
  const extra = { assetSaved: true, assetId: ASSET };
  // shadow는 결과를 디코드해 저장하므로 올바른 base64여야 한다 → 본문 크기는 4바이트 단위로만 움직인다.
  // 그래서 「상한 이하에서 닿을 수 있는 가장 큰 크기」와 「그다음 크기(+4, 상한 초과)」를 본다. 정확히 상한과 같은 경우는 위의 off 시험이 본다.
  const fixed = utf8({ success: true, imageUrl: "data:image/png;base64,", ...extra });
  const below = fixed + Math.floor((RESPONSE_MAX_BYTES - fixed) / 4) * 4;
  assert.ok(below <= RESPONSE_MAX_BYTES && RESPONSE_MAX_BYTES - below < 4 && below + 4 > RESPONSE_MAX_BYTES, `경계 바로 아래 ${below}, 바로 위 ${below + 4}`);
  for (const [target, omitted] of [[below, false], [below + 4, true]]) {
    const image = dataUrlOfBase64Length(target - fixed);
    const w = world(image); const a = assets();
    const r = await handleGenerateImagePost(req(), shadow(w, a));
    assert.equal(r.status, 200);
    assert.equal(w.n.generate, 1);
    assert.equal(a.calls.filter((c) => c === "upload").length, 1, "저장 업로드 1회");
    if (omitted) assert.deepEqual(r.body, { ...SMALL, ...extra });
    else { assert.equal(utf8(r.body), target); assert.equal(r.body.imageUrl, image); assert.equal(r.body.assetSaved, true); }
    assert.ok(utf8(r.body) <= RESPONSE_MAX_BYTES);
  }
});

test("shadow 초과: 저장 결과 세 값은 받은 뜻 그대로 옮기고, 별도 조회·재저장·재생성은 없다", async () => {
  const big = dataUrlOfBase64Length(6_000_000);
  // 저장 확인됨
  let w = world(big); let a = assets();
  let r = await handleGenerateImagePost(req(), shadow(w, a));
  assert.deepEqual(r.body, { ...SMALL, assetSaved: true, assetId: ASSET });
  assert.deepEqual(a.calls, ["aif_asset_precheck", "aif_asset_reserve", "upload", "aif_asset_finalize"], "저장 흐름은 예전과 같고 추가 호출이 없다");
  // 저장 불명(확정 응답이 ready가 아님)
  w = world(big); a = assets({ aif_asset_finalize: () => ({ data: "unknown", error: null }) });
  r = await handleGenerateImagePost(req(), shadow(w, a));
  assert.deepEqual(r.body, { ...SMALL, assetSaved: "unknown", assetId: ASSET, assetCode: "NOT_CONFIRMED" });
  assert.equal(w.n.generate, 1);
  // 저장 안 됨(예약 실패)
  w = world(big); a = assets({ aif_asset_reserve: () => ({ data: null, error: { message: "boom" } }) });
  r = await handleGenerateImagePost(req(), shadow(w, a));
  assert.deepEqual(r.body, { ...SMALL, assetSaved: false, assetCode: "RESERVE_FAILED" });
  assert.equal(w.n.generate, 1);
  assert.equal(JSON.stringify(r.body).includes("boom"), false, "저장 오류 원문 없음");
});

test("줄인 응답에는 정해진 필드만 실린다 — 모양이 다른 값·큰 값은 옮기지 않는다", () => {
  const huge = "x".repeat(5_000_000);
  const r = limitResponseBody({ status: 200, body: { success: true, imageUrl: huge, assetSaved: "ready", assetId: huge, assetCode: 42, error: "원문", path: "u/generated/a.png", extra: huge } });
  assert.deepEqual(r.body, SMALL);
  const kept = limitResponseBody({ status: 200, body: { success: true, imageUrl: huge, assetSaved: false, assetId: "", assetCode: "ASSET_TOO_LARGE" } });
  assert.deepEqual(kept.body, { ...SMALL, assetSaved: false, assetCode: "ASSET_TOO_LARGE" });
  assert.ok(utf8(kept.body) < 300);
});

// ───────────── B) 화면이 응답을 읽는 곳 ─────────────
const res = (ok, text) => ({ ok, text: async () => text });

test("정상 응답: 이미지와 본문을 그대로 넘긴다(예전 동작)", async () => {
  const body = { success: true, imageUrl: "data:image/png;base64,AAAA", assetSaved: true, assetId: ASSET };
  assert.deepEqual(await readGenerateResponse(res(true, JSON.stringify(body))), { kind: "image", imageUrl: body.imageUrl, body });
  // 저장 결과가 없는 예전 응답도 같다
  assert.deepEqual(await readGenerateResponse(res(true, '{"success":true,"imageUrl":"data:image/png;base64,AAAA"}')),
    { kind: "image", imageUrl: "data:image/png;base64,AAAA", body: { success: true, imageUrl: "data:image/png;base64,AAAA" } });
});

test("이미지를 싣지 못한 응답: 별도 결과 — 고정 한국어 안내, 재생성을 권하지 않는다", async () => {
  const o = await readGenerateResponse(res(true, JSON.stringify(SMALL)));
  assert.deepEqual(o, { kind: "omitted", message: GENERATE_MESSAGES.omitted });
  assert.match(GENERATE_MESSAGES.omitted, /생성됐지만/);
  assert.match(GENERATE_MESSAGES.omitted, /비용은 이미 발생했습니다/);
  assert.doesNotMatch(GENERATE_MESSAGES.omitted, /다시 생성해 주세요|다시 시도해 주세요|재시도/);
  // 저장 결과가 함께 오면 그 뜻 그대로 한 줄을 덧붙인다
  for (const [v, key] of [[true, "saved"], [false, "not_saved"], ["unknown", "unknown"]]) {
    const x = await readGenerateResponse(res(true, JSON.stringify({ ...SMALL, assetSaved: v, assetId: ASSET, assetCode: "NOT_CONFIRMED" })));
    assert.deepEqual(x, { kind: "omitted", message: `${GENERATE_MESSAGES.omitted} ${ASSET_SAVE_MESSAGES[key]}` });
    assert.equal(x.message.includes(ASSET), false);
    assert.equal(x.message.includes("NOT_CONFIRMED"), false);
  }
  // imageOmitted가 있으면 imageUrl이 같이 와도 이미지로 보지 않는다
  assert.equal((await readGenerateResponse(res(true, JSON.stringify({ ...SMALL, imageUrl: "data:image/png;base64,AAAA" })))).kind, "omitted");
});

test("JSON이 아닌 응답·읽기 실패·모양이 다른 응답: 고정 문구만 — 본문과 파싱 오류 원문이 나가지 않는다", async () => {
  const html = "<html><body>An error occurred: FUNCTION_RESPONSE_PAYLOAD_TOO_LARGE icn1::abcde-1700000000000-0123456789ab</body></html>";
  const cases = [res(false, html), res(true, html), res(true, ""), res(true, "null"), res(true, "[1,2]"), res(true, '"text"'), res(true, "{not json"),
    { ok: true, text: async () => { throw new Error("network reset by peer 10.0.0.7"); } },
    res(true, '{"success":true}'), res(true, '{"success":true,"imageUrl":""}'), res(true, '{"success":true,"imageUrl":123}'), res(true, '{"success":true,"imageUrl":null}')];
  for (const c of cases) {
    const o = await readGenerateResponse(c);
    assert.deepEqual(o, { kind: "error", message: GENERATE_MESSAGES.unreadable, needApiKey: false });
  }
  for (const leak of ["FUNCTION_RESPONSE", "icn1", "Unexpected", "JSON", "network reset", "10.0.0.7", "<html"]) assert.equal(GENERATE_MESSAGES.unreadable.includes(leak), false);
  assert.match(GENERATE_MESSAGES.unreadable, /바로 다시 누르지 말고/);
});

test("서버가 알린 오류(JSON): 서버의 안내 문구와 키 등록 안내를 예전처럼 전달한다", async () => {
  assert.deepEqual(await readGenerateResponse(res(false, '{"error":"요청이 너무 큽니다.","code":"BODY_TOO_LARGE"}')), { kind: "error", message: "요청이 너무 큽니다.", needApiKey: false });
  assert.deepEqual(await readGenerateResponse(res(false, '{"error":"키를 등록해 주세요.","needApiKey":true}')), { kind: "error", message: "키를 등록해 주세요.", needApiKey: true });
  for (const body of ['{}', '{"error":""}', '{"error":123}', '{"needApiKey":"yes"}']) {
    assert.deepEqual(await readGenerateResponse(res(false, body)), { kind: "error", message: GENERATE_MESSAGES.failed, needApiKey: false });
  }
  // 오류 응답에 imageOmitted·imageUrl이 있어도 성공으로 보지 않는다
  assert.equal((await readGenerateResponse(res(false, '{"imageOmitted":true,"imageUrl":"data:image/png;base64,AAAA"}'))).kind, "error");
});

test("서버가 줄여 보낸 응답을 화면 해석기가 그대로 받아 「이미지 없음」으로 읽는다(서버 → 화면 한 줄)", async () => {
  const w = world(dataUrlOfBase64Length(6_000_000));
  const r = await POST(req());
  const o = await readGenerateResponse({ ok: r.ok, text: () => r.text() });
  assert.deepEqual(o, { kind: "omitted", message: GENERATE_MESSAGES.omitted });
  assert.equal(w.n.generate, 1);
});

// ───────────── C) 화면 소스 ─────────────
test("생성 화면: 응답은 해석기를 거쳐 읽고, 이미지가 없으면 캡션·결과 표시·히스토리로 넘어가지 않는다", () => {
  const at = (needle) => { const i = STUDIO.indexOf(needle); assert.ok(i > 0, needle); return i; };
  const call = at('fetch("/api/generate-image"');
  const read = at("const outcome = await readGenerateResponse(imgRes);");
  const guard = at('if (outcome.kind !== "image") {');
  const thrown = at("throw new Error(outcome.message);");
  const caption = at('fetch("/api/generate-caption"');
  const shown = at("imageUrl: generatedImageUrl,");
  const history = at("saveToHistory(generatedImageUrl, generatedCaptions, configToSubmit);");
  assert.deepEqual([call, read, guard, thrown, caption, shown, history].slice().sort((a, b) => a - b), [call, read, guard, thrown, caption, shown, history], "던지는 지점이 모든 후속 호출보다 앞이다");
  assert.equal(STUDIO.includes("imgRes.json()"), false, "상태를 보기 전에 본문을 JSON으로 풀지 않는다");
  assert.equal(STUDIO.split('fetch("/api/generate-image"').length - 1, 1, "생성 호출은 한 곳(재생성 경로 없음)");
  // 이미지 없는 결과를 처리하는 구간에는 호출이 없다
  const block = STUDIO.slice(guard, thrown);
  for (const banned of ["fetch(", "saveToHistory", "setConfig", "handleGenerate", "setTimeout", "setInterval"]) assert.equal(block.includes(banned), false, banned);
  assert.match(block, /outcome\.kind === "error" && outcome\.needApiKey/);
});
