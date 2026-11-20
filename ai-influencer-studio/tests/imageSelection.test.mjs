// 이미지 모델 선택 시험(모의) — 2026-11-20, CC-SNS-01, R3 1단계(주인님 「진행해보자」, Master msg_fb385d6793d7).
// 순수 규칙(src/lib/imageModels.ts) + 기존 경로(/api/generate-image)의 「키 조회 전 거절」. 실제 호출·네트워크·DB 0.
// ★ 이 시험으로 알 수 없는 것: 각 모델이 지금 실제로 제공되는지, 참조 사진을 받는지, 인물을 얼마나 지키는지(R3 2단계 비교 몫).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";

const SRC = new URL("../src/", import.meta.url).href;
const stub = (code) => "data:text/javascript," + encodeURIComponent(code);
const STUBS = {
  "@/lib/access": stub("export const checkProgramAccessApi = (...a) => globalThis.__sel.checkAccess(...a);"),
  "@/lib/apiKeys": stub("export const getUserGeminiApiKey = (...a) => globalThis.__sel.getApiKey(...a);"),
  "@/lib/supabase/admin": stub("export const createAdminClient = () => { throw new Error('관리자 클라이언트가 만들어지면 안 됨'); };"),
  "@google/genai": stub("export const Type = {}; export class GoogleGenAI { constructor() { throw new Error('글 생성은 대상 아님'); } }"),
};
const IMAGE_STUB = stub("export const generateGeminiImage = (req) => globalThis.__sel.gen(req);");
register(stub(`
const SRC = ${JSON.stringify(SRC)}; const STUBS = ${JSON.stringify(STUBS)}; const IMAGE_STUB = ${JSON.stringify(IMAGE_STUB)};
export async function resolve(s, c, n) {
  if (STUBS[s]) return { url: STUBS[s], shortCircuit: true };
  if (s === "./geminiImage" && c.parentURL && c.parentURL.endsWith("/src/lib/gemini.ts")) return { url: IMAGE_STUB, shortCircuit: true };
  if (s === "next/server") return n("next/server.js", c);
  if (s.startsWith("@/")) return n(SRC + s.slice(2) + ".ts", c);
  try { return await n(s, c); } catch (e) { if (s.startsWith(".") && !/\\.[a-z]+$/.test(s)) return n(s + ".ts", c); throw e; }
}`));

const M = await import("../src/lib/imageModels.ts");
const NB = await import("../src/lib/nanoBananaModels.ts");
const { generateInfluencerImage } = await import("../src/lib/gemini.ts");
const GenRoute = await import("../src/app/api/generate-image/route.ts");

const U = "abcdef01-2345-4789-8abc-def012345678";
const KEY = "AIza-member-own-image-key";
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
function world(over = {}) {
  const n = { access: 0, key: 0, gen: 0 };
  const w = {
    n, calls: [],
    checkAccess: async () => { n.access++; return over.access ?? { allowed: true, user: { id: U } }; },
    getApiKey: async () => { n.key++; return KEY; },
    gen: async (req) => { n.gen++; w.calls.push(req); return { base64: PNG, mimeType: "image/png" }; },
  };
  globalThis.__sel = w;
  return w;
}
const post = (body) => GenRoute.POST(new Request("http://local/api/generate-image", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), headers: { "Content-Type": "application/json" } }));
const MODEL = { top: "gemini-3-pro-image", balanced: "gemini-nano-banana-2.1", value: "gemini-3.1-flash-lite-image" };

// ── 순수 규칙 ──
test("목록: 세 등급, 기본은 최고 품질(3 Pro), 실제 모델 이름은 공용 사본과 같다", () => {
  assert.deepEqual(M.IMAGE_MODELS.map((m) => m.tier), ["top", "balanced", "value"]);
  assert.equal(M.DEFAULT_IMAGE_TIER, "top");
  for (const m of M.IMAGE_MODELS) assert.equal(NB.NANO_BANANA_MODEL_CONFIGS[m.nb].modelName, MODEL[m.tier], m.tier);
  for (const m of M.IMAGE_MODELS) { assert.match(m.label, /^(최고 품질|균형|가성비) · Gemini /); assert.doesNotMatch(m.label + m.note, /\$|달러/); }
});

test("검사: 고르지 않음(칸 없음·null)은 화질과 상관없이 통과 — 지금 동작 보존", () => {
  for (const cfg of [{}, { imageModel: null }, { quality: "8K" }, { imageModel: undefined, quality: 3 }]) assert.deepEqual(M.checkImageSelection(cfg), { ok: true }, JSON.stringify(cfg));
});

test("검사: 고른 등급은 허용 목록 안이어야 한다 — 빈 글·대소문자 다름·글자 아님·속성 이름은 거절", () => {
  for (const v of ["", "TOP", "pro", "nanobanana-pro", "gemini-3-pro-image", 1, true, {}, [], "toString", "__proto__", "constructor"]) {
    const r = M.checkImageSelection({ imageModel: v });
    assert.equal(r.ok, false, JSON.stringify(v)); assert.equal(r.code, "IMAGE_MODEL_INVALID", JSON.stringify(v));
  }
});

test("검사: 화질은 비었으면 통과(1K), 그 모델이 받는 값만 통과 — 가성비는 1K만", () => {
  const cases = [
    ["top", ["1K", "2K", "4K", "", null, undefined], ["8K", "2k", 2, "1K "]],
    ["balanced", ["1K", "2K", "4K", ""], ["8K", "512"]],
    ["value", ["1K", "", undefined], ["2K", "4K", "8K"]],
  ];
  for (const [tier, good, bad] of cases) {
    for (const q of good) assert.deepEqual(M.checkImageSelection({ imageModel: tier, quality: q }), { ok: true }, `${tier} ${q}`);
    for (const q of bad) assert.equal(M.checkImageSelection({ imageModel: tier, quality: q }).code, "IMAGE_QUALITY_UNSUPPORTED", `${tier} ${q}`);
  }
});

test("해석: 고르지 않으면 3 Pro + 화질 값 그대로(비었으면 1K), 고르면 그 모델 + 그 화질", () => {
  assert.deepEqual(M.resolveImageSelection({}), { modelName: MODEL.top, imageSize: "1K" });
  assert.deepEqual(M.resolveImageSelection({ quality: "4K" }), { modelName: MODEL.top, imageSize: "4K" });
  assert.deepEqual(M.resolveImageSelection({ quality: "8K" }), { modelName: MODEL.top, imageSize: "8K" }, "고르지 않은 요청은 예전처럼 그대로 넘긴다");
  assert.deepEqual(M.resolveImageSelection({ imageModel: "balanced", quality: "2K" }), { modelName: MODEL.balanced, imageSize: "2K" });
  assert.deepEqual(M.resolveImageSelection({ imageModel: "value" }), { modelName: MODEL.value, imageSize: "1K" });
  for (const cfg of [{ imageModel: "x" }, { imageModel: "value", quality: "4K" }]) assert.throws(() => M.resolveImageSelection(cfg), /이미지 모델|화질/);
});

test("화면용: 저장값 해석은 목록 밖이면 기본, 등급별 화질 목록", () => {
  assert.equal(M.currentImageTier("value"), "value");
  for (const v of [null, "", "x", 3, "__proto__"]) assert.equal(M.currentImageTier(v), "top", String(v));
  assert.deepEqual([...M.imageSizesOf("value")], ["1K"]);
  assert.deepEqual([...M.imageSizesOf("top")], ["1K", "2K", "4K"]);
  assert.deepEqual([...M.imageSizesOf("nope")], ["1K", "2K", "4K"]);
});

test("화면 보관: 등급 값만 읽고 쓴다 — 목록 밖 값은 쓰지 않고, 읽기·쓰기 실패는 null·false로 조용히", () => {
  const mem = () => { const m = new Map(); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) }; };
  let s = mem();
  assert.equal(M.loadImageTier(s), null);
  assert.equal(M.saveImageTier("balanced", s), true); assert.deepEqual([...s.m.entries()], [[M.IMAGE_TIER_STORAGE_KEY, "balanced"]]);
  assert.equal(M.loadImageTier(s), "balanced");
  for (const v of ["ultra", "", null, 3, { tier: "top" }, "__proto__"]) { s = mem(); assert.equal(M.saveImageTier(v, s), false, String(v)); assert.equal(s.m.size, 0); }
  s = mem(); s.m.set(M.IMAGE_TIER_STORAGE_KEY, "asset-1234-secret"); assert.equal(M.loadImageTier(s), null, "목록 밖 저장값은 무시");
  const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("quota"); } };
  assert.equal(M.loadImageTier(broken), null); assert.equal(M.saveImageTier("top", broken), false);
  assert.equal(M.loadImageTier(null), null); assert.equal(M.saveImageTier("top", null), false);
  // 이 시험 환경(Node)에는 브라우저 저장소가 없다 — 기본 인자로도 던지지 않는다
  assert.equal(M.loadImageTier(), null); assert.equal(M.saveImageTier("top"), false);
});

// ── 생성 함수(마지막 방어) ──
test("생성 함수: 고른 모델·화질로 한 번 호출, 통과하지 못한 선택이면 호출 전에 던진다", async () => {
  for (const [tier, q, size] of [["top", "4K", "4K"], ["balanced", "2K", "2K"], ["value", "", "1K"], [undefined, undefined, "1K"]]) {
    const w = world();
    await generateInfluencerImage(KEY, { gender: "female", ...(tier ? { imageModel: tier } : {}), ...(q !== undefined ? { quality: q } : {}) });
    assert.equal(w.n.gen, 1); assert.equal(w.calls[0].modelName, MODEL[tier ?? "top"]); assert.equal(w.calls[0].imageSize, size); assert.equal(w.calls[0].apiKey, KEY);
  }
  for (const cfg of [{ imageModel: "ultra" }, { imageModel: "value", quality: "2K" }]) {
    const w = world();
    await assert.rejects(generateInfluencerImage(KEY, { gender: "female", ...cfg }));
    assert.equal(w.n.gen, 0, JSON.stringify(cfg));
  }
});

// ── 기존 경로 /api/generate-image ──
test("기존 경로: 허용 목록 밖·지원하지 않는 화질 → 400, 키 조회 0·생성 0(권한 확인은 먼저 1번)", async () => {
  for (const [body, code] of [
    [{ imageModel: "ultra" }, "IMAGE_MODEL_INVALID"], [{ imageModel: "" }, "IMAGE_MODEL_INVALID"], [{ imageModel: ["top"] }, "IMAGE_MODEL_INVALID"],
    [{ imageModel: "value", quality: "4K" }, "IMAGE_QUALITY_UNSUPPORTED"], [{ imageModel: "top", quality: "8K" }, "IMAGE_QUALITY_UNSUPPORTED"],
  ]) {
    const w = world();
    const r = await post({ gender: "female", ...body });
    const j = await r.json();
    assert.equal(r.status, 400, JSON.stringify(body)); assert.equal(j.code, code); assert.ok(j.error);
    assert.deepEqual(w.n, { access: 1, key: 0, gen: 0 }, JSON.stringify(body));
  }
});

test("기존 경로: 권한이 없으면 선택이 잘못돼도 권한 응답이 먼저(경계 보존) — 키·생성 0", async () => {
  const w = world({ access: { allowed: false, error: "권한 없음", status: 403 } });
  const r = await post({ imageModel: "ultra" });
  assert.equal(r.status, 403); assert.deepEqual(w.n, { access: 1, key: 0, gen: 0 });
});

test("기존 경로: 고르지 않음은 예전과 같다(3 Pro, 화질 그대로), 고른 모델은 그 모델로 1번", async () => {
  for (const [body, model, size] of [
    [{ gender: "female" }, MODEL.top, "1K"], [{ gender: "female", quality: "4K" }, MODEL.top, "4K"],
    [{ gender: "female", imageModel: "balanced", quality: "2K" }, MODEL.balanced, "2K"], [{ gender: "female", imageModel: "value", quality: "1K" }, MODEL.value, "1K"],
  ]) {
    const w = world();
    const r = await post(body);
    assert.equal(r.status, 200, JSON.stringify(body)); assert.deepEqual(w.n, { access: 1, key: 1, gen: 1 });
    assert.equal(w.calls[0].modelName, model); assert.equal(w.calls[0].imageSize, size); assert.equal(w.calls[0].apiKey, KEY);
  }
});

test("기존 경로: 본문을 미리 못 읽는 경우(깨진 JSON·배열·3MiB 초과)는 사전 검사를 건너뛰고 기존 오류 그대로", async () => {
  for (const [body, status, code] of [["{bad", 400, "BODY_INVALID"], ["[1]", 400, "BODY_INVALID"], ["x".repeat(3 * 1024 * 1024 + 1), 413, "BODY_TOO_LARGE"]]) {
    const w = world();
    const r = await post(body);
    assert.equal(r.status, status); assert.equal((await r.json()).code, code);
    assert.deepEqual(w.n, { access: 1, key: 1, gen: 0 }, "기존처럼 키 조회 뒤 본문 오류");
  }
});

test("두 경로 모두 같은 선택 검사 함수(checkImageSelection)를 쓴다", () => {
  const a = readFileSync(new URL("../src/app/api/generate-image/route.ts", import.meta.url), "utf8");
  const b = readFileSync(new URL("../src/lib/assets/generations.ts", import.meta.url), "utf8");
  assert.match(a, /const c = checkImageSelection\(config\);/);
  assert.match(b, /const selection = checkImageSelection\(config\);/);
});

// ── 사전 읽기의 취소·제한 시간(Mac msg_d73efbf3e654 P2, Master msg_2c1091248138) ──
const { handleGenerateImagePost } = await import("../src/lib/assets/generation.ts");
const MIB3 = 3 * 1024 * 1024;
const IMAGE_URL = "data:image/png;base64," + PNG;
function deps(over = {}) {
  const n = { access: 0, key: 0, gen: 0 };
  return {
    n,
    d: {
      mode: "off",
      checkAccess: async () => { n.access++; return { allowed: true, user: { id: U } }; },
      getApiKey: async () => { n.key++; return KEY; },
      generate: async () => { n.gen++; return IMAGE_URL; },
      precheckConfig: (config) => { const c = M.checkImageSelection(config); return c.ok ? c : { ok: false, status: 400, body: { error: c.message, code: c.code } }; },
      ...over,
    },
  };
}
/** 정확히 bytes 바이트인 JSON 본문 */
const jsonOfSize = (bytes, fields) => {
  const head = JSON.stringify({ ...fields, pad: "" });
  const s = head.slice(0, -2) + "x".repeat(bytes - Buffer.byteLength(head)) + '"}';
  assert.equal(Buffer.byteLength(s), bytes); JSON.parse(s);
  return s;
};
/** 앞부분만 보내고 끝나지 않는 본문 */
const openStream = (first = '{"imageModel":"top"') => new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(first)); } });
const streamReq = (body, signal) => new Request("http://local/api/generate-image", { method: "POST", body, duplex: "half", ...(signal ? { signal } : {}) });
const timed = async (p) => { const t = Date.now(); const r = await p; return { ...r, ms: Date.now() - t }; };

test("사전 읽기: 정확히 3MiB는 통과 — 허용된 선택은 생성까지, 잘못된 선택은 키 조회 전 400", async () => {
  let { n, d } = deps();
  let r = await handleGenerateImagePost(streamReq(jsonOfSize(MIB3, { imageModel: "balanced", quality: "2K" })), d);
  assert.equal(r.status, 200); assert.deepEqual(n, { access: 1, key: 1, gen: 1 });
  ({ n, d } = deps());
  r = await handleGenerateImagePost(streamReq(jsonOfSize(MIB3, { imageModel: "ultra" })), d);
  assert.equal(r.status, 400); assert.equal(r.body.code, "IMAGE_MODEL_INVALID"); assert.deepEqual(n, { access: 1, key: 0, gen: 0 });
});

test("사전 읽기: 3MiB 초과(길이 머리글 없이 흘려 보냄)는 사전 검사를 건너뛰고 기존처럼 413 — 멈추지 않는다", async () => {
  const { n, d } = deps();
  const big = jsonOfSize(MIB3 + 1, { imageModel: "ultra" });
  const r = await timed(handleGenerateImagePost(streamReq(new ReadableStream({ start(c) { const b = new TextEncoder().encode(big); for (let i = 0; i < b.length; i += 65536) c.enqueue(b.subarray(i, i + 65536)); c.close(); } })), d));
  assert.equal(r.status, 413); assert.equal(r.body.code, "BODY_TOO_LARGE"); assert.deepEqual(n, { access: 1, key: 1, gen: 0 });
  assert.ok(r.ms < 5000, `${r.ms}ms`);
});

test("사전 읽기: 이미 취소된 요청 + 끝나지 않는 본문 → 바로 400, 키 조회 0·생성 0", async () => {
  const { n, d } = deps();
  const ac = new AbortController(); ac.abort();
  const r = await timed(handleGenerateImagePost(streamReq(openStream(), ac.signal), d));
  assert.equal(r.status, 400); assert.equal(r.body.code, "BODY_INVALID"); assert.deepEqual(n, { access: 1, key: 0, gen: 0 });
  assert.ok(r.ms < 2000, `${r.ms}ms`);
});

test("사전 읽기: 읽는 중에 요청이 끊기면 바로 400, 키 조회 0·생성 0", async () => {
  const { n, d } = deps();
  const ac = new AbortController();
  setTimeout(() => ac.abort(), 80);
  const r = await timed(handleGenerateImagePost(streamReq(openStream(), ac.signal), d));
  assert.equal(r.status, 400); assert.equal(r.body.code, "BODY_INVALID"); assert.deepEqual(n, { access: 1, key: 0, gen: 0 });
  assert.ok(r.ms >= 60 && r.ms < 2000, `${r.ms}ms`);
});

test("사전 읽기: 본문이 끝나지 않으면 제한 시간 뒤 408, 키 조회 0·생성 0", async () => {
  const { n, d } = deps({ timeouts: { precheckReadMs: 120 } });
  const r = await timed(handleGenerateImagePost(streamReq(openStream()), d));
  assert.equal(r.status, 408); assert.equal(r.body.code, "BODY_TIMEOUT"); assert.deepEqual(n, { access: 1, key: 0, gen: 0 });
  assert.ok(r.ms >= 100 && r.ms < 2000, `${r.ms}ms`);
  assert.equal(M.checkImageSelection({}).ok, true);
});

test("사전 읽기: 기본 제한 시간은 30초, 정상 요청은 예전과 같은 결과", async () => {
  const G = await import("../src/lib/assets/generation.ts");
  assert.equal(G.PRECHECK_READ_TIMEOUT_MS, 30_000);
  const { n, d } = deps();
  const r = await handleGenerateImagePost(streamReq(JSON.stringify({ gender: "female", quality: "4K" })), d);
  assert.deepEqual(r, { status: 200, body: { success: true, imageUrl: IMAGE_URL } }); assert.deepEqual(n, { access: 1, key: 1, gen: 1 });
});
