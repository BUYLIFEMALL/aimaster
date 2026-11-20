// 이미지 모델 현재 상태 고정 시험(합성) — 2026-11-20, CC-SNS-01, Master msg_4dac33eded74 (R3 「이미지 모델 선택」 1단계 전 기준선).
// 제품 코드는 바꾸지 않았다. 이 시험은 「지금 어떻게 돌고 있는가」를 고정해 두어, 모델 선택을 연결할 때 무엇이 바뀌는지 드러나게 한다.
// 실제 호출·네트워크·DB 0. Gemini 이미지 호출(./geminiImage)과 권한·키 조회는 가짜로 바꾼다.
// ★ 이 시험으로 알 수 없는 것(미확인으로 분리): 각 모델이 지금 실제로 제공되는지, 참조 사진을 받는지, 인물을 얼마나 지키는지.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { register } from "node:module";

const SRC = new URL("../src/", import.meta.url).href;
const stub = (code) => "data:text/javascript," + encodeURIComponent(code);
const STUBS = {
  "@/lib/access": stub("export const checkProgramAccessApi = (...a) => globalThis.__img.checkAccess(...a);"),
  "@/lib/apiKeys": stub("export const getUserGeminiApiKey = (...a) => globalThis.__img.getApiKey(...a);"),
  "@/lib/supabase/admin": stub("export const createAdminClient = () => { throw new Error('관리자 클라이언트가 만들어지면 안 됨'); };"),
  "@google/genai": stub("export const Type = {}; export class GoogleGenAI { constructor() { throw new Error('글 생성은 이 시험 대상이 아님'); } }"),
};
const IMAGE_STUB = stub("export const generateGeminiImage = (req) => globalThis.__img.gen(req);");
register(stub(`
const SRC = ${JSON.stringify(SRC)}; const STUBS = ${JSON.stringify(STUBS)}; const IMAGE_STUB = ${JSON.stringify(IMAGE_STUB)};
export async function resolve(s, c, n) {
  if (STUBS[s]) return { url: STUBS[s], shortCircuit: true };
  // gemini.ts가 부르는 이미지 호출(공용 사본)만 가짜로 — 다른 곳의 geminiImage는 건드리지 않는다
  if (s === "./geminiImage" && c.parentURL && c.parentURL.endsWith("/src/lib/gemini.ts")) return { url: IMAGE_STUB, shortCircuit: true };
  if (s === "next/server") return n("next/server.js", c);
  if (s.startsWith("@/")) return n(SRC + s.slice(2) + ".ts", c);
  try { return await n(s, c); } catch (e) { if (s.startsWith(".") && !/\\.[a-z]+$/.test(s)) return n(s + ".ts", c); throw e; }
}`));

const { generateInfluencerImage } = await import("../src/lib/gemini.ts");
const GenRoute = await import("../src/app/api/generate-image/route.ts");
const AifRoute = await import("../src/app/api/aif/generations/route.ts");
const { AIF_ASSETS_MODE } = await import("../src/lib/assets/generation.ts");
const NB = await import("../src/lib/nanoBananaModels.ts");

const APP = fileURLToPath(new URL("../", import.meta.url));
const ROOT = join(APP, "..");
const lf = (p) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const U = "abcdef01-2345-4789-8abc-def012345678";
const KEY = "AIza-member-own-image-key";
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

function world(over = {}) {
  const n = { access: 0, key: 0, gen: 0 };
  const w = {
    n, calls: [], keyUsers: [],
    checkAccess: async () => { n.access++; return over.access ?? { allowed: true, user: { id: U } }; },
    getApiKey: async (userId) => { n.key++; w.keyUsers.push(userId); return "key" in over ? over.key : KEY; },
    gen: async (req) => { n.gen++; w.calls.push(req); return { base64: PNG, mimeType: "image/png" }; },
  };
  globalThis.__img = w;
  return w;
}
const post = (route, body) => route.POST(new Request("http://local/api/x", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }));

// ── 가. 지금의 고정 기본값(생성 함수) ──
test("고정 기본값: 화질·비율과 상관없이 모델은 gemini-3-pro-image, 대기 240초, 재시도 0, 회원 키 그대로", async () => {
  for (const cfg of [{}, { quality: "1K" }, { quality: "2K" }, { quality: "4K" }, { aspectRatio: "1:1", quality: "4K" }, { quality: "8K" }]) {
    const w = world();
    const out = await generateInfluencerImage(KEY, { gender: "female", ...cfg });
    assert.equal(w.n.gen, 1, JSON.stringify(cfg));
    const r = w.calls[0];
    assert.equal(r.modelName, "gemini-3-pro-image", JSON.stringify(cfg));
    assert.equal(r.apiKey, KEY); assert.equal(r.timeoutMs, 240_000); assert.equal(r.retries, 0);
    assert.equal(r.aspectRatio, cfg.aspectRatio ?? "9:16");
    // 화질은 화면 값을 그대로 넘긴다(모델별 화질 거르기 없음 — 「8K」도 그대로 간다는 것이 지금 상태)
    assert.equal(r.imageSize, cfg.quality ?? "1K");
    assert.equal(out, "data:image/png;base64," + PNG);
  }
});

test("고정 기본값: 키가 비면 이미지 호출 전에 멈춘다", async () => {
  for (const k of ["", "   ", null, undefined]) {
    const w = world();
    await assert.rejects(generateInfluencerImage(k, {}), /Gemini API 키/);
    assert.equal(w.n.gen, 0, String(k));
  }
});

test("고정 기본값: 생성 함수 소스에 모델 이름이 한 곳에만 글자로 박혀 있고, 공용 모델 목록을 쓰지 않는다", () => {
  const src = lf(join(APP, "src/lib/gemini.ts"));
  assert.equal(src.split('modelName: "gemini-3-pro-image"').length - 1, 1);
  assert.equal(/nanoBananaModels|getNanoBananaConfig|resolveImageSize/.test(src), false);
});

// ── 나. 공용 사본 목록 ──
test("공용 사본 nanoBananaModels.ts는 기준(ai-image-studio)과 같고 사본 검사 목록에 등록돼 있다", () => {
  assert.equal(lf(join(APP, "src/lib/nanoBananaModels.ts")), lf(join(ROOT, "ai-image-studio/lib/providers/nanoBananaModels.ts")));
  assert.match(lf(join(ROOT, "scripts/check-shared-modules.mjs")), /"ai-influencer-studio\/src\/lib\/nanoBananaModels\.ts"/);
  // 이미지 호출 사본도 같은지(생성 함수가 쓰는 것)
  assert.equal(lf(join(APP, "src/lib/geminiImage.ts")), lf(join(ROOT, "ai-image-studio/lib/providers/geminiImage.ts")));
});

test("공용 사본은 지금 이 앱 어디에서도 불러오지 않는다(쓰이지 않는 사본)", () => {
  const files = [];
  const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(ts|tsx)$/.test(f)) files.push(p); } };
  walk(join(APP, "src"));
  const users = files.filter((p) => !p.endsWith("nanoBananaModels.ts") && /nanoBananaModels/.test(readFileSync(p, "utf8")));
  assert.deepEqual(users.map((p) => relative(APP, p)), []);
});

test("공용 사본의 모델 이름이 모델 선택표 2절 Gemini 칸(저가·중가·최상급)과 같다", () => {
  const cat = lf(join(ROOT, "docs/AI_MODEL_CATALOG.md"));
  const sec = cat.slice(cat.indexOf("## 2. 이미지 모델"), cat.indexOf("## 3."));
  const geminiCell = (head) => /`([^`]+)`/.exec(sec.split("\n").find((l) => l.startsWith(head)).split("|")[2])?.[1];
  assert.equal(NB.NANO_BANANA_MODEL_CONFIGS.nanobanana.modelName, geminiCell("| 저가"));
  assert.equal(NB.NANO_BANANA_MODEL_CONFIGS["nanobanana-2-2k"].modelName, geminiCell("| 중가"));
  assert.equal(NB.NANO_BANANA_MODEL_CONFIGS["nanobanana-pro"].modelName, geminiCell("| 최상급"));
  // 이 앱이 지금 고정으로 쓰는 모델은 그중 최상급이다
  assert.equal(NB.NANO_BANANA_MODEL_CONFIGS["nanobanana-pro"].modelName, "gemini-3-pro-image");
});

test("모델별 화질: Lite는 1K만(그 밖은 1K로), 2.1·Pro는 1K·2K·4K, 모르는 값은 등급 기본", () => {
  const C = NB.NANO_BANANA_MODEL_CONFIGS;
  for (const q of ["1K", "2K", "4K", undefined, "8K", ""]) assert.equal(NB.resolveImageSize(C.nanobanana, q), "1K", `lite ${q}`);
  for (const key of ["nanobanana-2-2k", "nanobanana-2-4k", "nanobanana-pro"]) {
    for (const q of ["1K", "2K", "4K"]) assert.equal(NB.resolveImageSize(C[key], q), q, `${key} ${q}`);
    for (const q of [undefined, "8K", "", "2k"]) assert.equal(NB.resolveImageSize(C[key], q), C[key].imageSize, `${key} ${q}`);
  }
});

test("공용 사본의 기본 등급은 2.1(2K)이다 — 이 앱의 지금 고정값(3 Pro)과 다르다는 사실을 고정", () => {
  assert.equal(NB.DEFAULT_NANO_BANANA_MODEL, "nanobanana-2-2k");
  assert.equal(NB.getNanoBananaConfig(undefined).modelName, "gemini-nano-banana-2.1");
  assert.equal(NB.getNanoBananaConfig("없는-등급").modelName, "gemini-nano-banana-2.1");
  assert.notEqual(NB.getNanoBananaConfig().modelName, "gemini-3-pro-image");
});

// ── 다. 두 라우트 경로와 회원 키 경계 ──
test("기존 경로 /api/generate-image: 로그인한 회원 번호로 본인 키를 한 번 읽고, 그 키로 3 Pro를 한 번 부른다", async () => {
  const w = world();
  const r = await post(GenRoute, { gender: "female", quality: "2K", aspectRatio: "3:4" });
  assert.equal(r.status, 200);
  assert.equal(w.n.key, 1); assert.deepEqual(w.keyUsers, [U]);
  assert.equal(w.n.gen, 1); assert.equal(w.calls[0].apiKey, KEY); assert.equal(w.calls[0].modelName, "gemini-3-pro-image");
  assert.equal(w.calls[0].imageSize, "2K"); assert.equal(w.calls[0].aspectRatio, "3:4");
});

test("기존 경로: 본인 키가 없으면 다른 키로 대신하지 않고 호출 0 · 권한이 없으면 키 조회도 0", async () => {
  let w = world({ key: null });
  let r = await post(GenRoute, { gender: "female" });
  assert.equal(r.status, 400); assert.equal((await r.json()).needApiKey, true); assert.equal(w.n.gen, 0);
  w = world({ access: { allowed: false, error: "권한 없음", status: 403 } });
  r = await post(GenRoute, { gender: "female" });
  assert.equal(r.status, 403); assert.equal(w.n.key, 0); assert.equal(w.n.gen, 0);
});

test("자산 번호 경로 /api/aif/generations: 원본 저장 스위치가 off라 지금은 404 — 키 조회 0·생성 0", async () => {
  assert.equal(AIF_ASSETS_MODE, "off");
  const w = world();
  const r = await post(AifRoute, { config: { gender: "female" } });
  assert.equal(r.status, 404); assert.equal(w.n.key, 0); assert.equal(w.n.gen, 0);
});

test("두 경로 모두 같은 생성 함수(generateInfluencerImage)와 같은 회원 키 함수(getUserGeminiApiKey)를 쓴다", () => {
  for (const f of ["src/app/api/generate-image/route.ts", "src/app/api/aif/generations/route.ts"]) {
    const s = lf(join(APP, f));
    assert.match(s, /import \{ generateInfluencerImage \} from "@\/lib\/gemini";/, f);
    assert.match(s, /getApiKey: getUserGeminiApiKey,/, f);
    assert.match(s, /generate: \(apiKey, config\) => generateInfluencerImage\(apiKey, config as unknown as InfluencerConfig\),/, f);
  }
});
