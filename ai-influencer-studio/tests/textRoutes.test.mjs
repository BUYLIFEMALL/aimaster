// 글 생성 라우트 3개(캡션·하루 일과·이벤트 변형) 연결 시험 — 2026-11-20, CC-SNS-01, 글 모델 선택 3단계(기존 Gemini 경로만, Master msg_c330ee5eaf7f).
// 실제 라우트 파일의 POST와 실제 src/lib/gemini.ts를 그대로 부른다. 바꾸는 것은 권한 확인·회원 키 조회·Gemini SDK(@google/genai)뿐이다.
// 실제 호출·네트워크·DB 0. 가짜 SDK의 응답·오류 모양은 손으로 만든 것이다(실제 SDK 오류 원문은 확인하지 않았다).
import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

const SRC = new URL("../src/", import.meta.url).href;
const stub = (code) => "data:text/javascript," + encodeURIComponent(code);
const STUBS = {
  "@/lib/access": stub("export const checkProgramAccessApi = (...a) => globalThis.__aif.checkAccess(...a);"),
  "@/lib/apiKeys": stub("export const getUserGeminiApiKey = (...a) => globalThis.__aif.getApiKey(...a);"),
  "@google/genai": stub(`
export const Type = { ARRAY: "ARRAY", STRING: "STRING", OBJECT: "OBJECT", INTEGER: "INTEGER" };
export class GoogleGenAI {
  constructor(o) { if (globalThis.__aif.ctorThrows) throw globalThis.__aif.ctorThrows; this.apiKey = o?.apiKey; const self = this; this.models = { generateContent: (args) => globalThis.__aif.gen(args, self.apiKey) }; }
}`),
};
register(stub(`
const SRC = ${JSON.stringify(SRC)}; const STUBS = ${JSON.stringify(STUBS)};
export async function resolve(s, c, n) {
  if (STUBS[s]) return { url: STUBS[s], shortCircuit: true };
  if (s === "next/server") return n("next/server.js", c);
  if (s.startsWith("@/")) return n(SRC + s.slice(2) + ".ts", c);
  try { return await n(s, c); } catch (e) { if (s.startsWith(".") && !/\\.[a-z]+$/.test(s)) return n(s + ".ts", c); throw e; }
}`));

const Caption = await import("../src/app/api/generate-caption/route.ts");
const PlanDay = await import("../src/app/api/plan-day/route.ts");
const PlanVar = await import("../src/app/api/plan-variations/route.ts");
const O = await import("../src/data/influencer-options.ts");
const { TEXT_MODEL } = await import("../src/lib/gemini.ts");
const { readCaptionResponse, CAPTION_REQUEST_FAILED } = await import("../src/lib/captionNotice.ts");

const U = "abcdef01-2345-4789-8abc-def012345678";
const KEY = "AIza-member-own-secret-0001";
const GOOGLE_KEY_INVALID = 'got status: 400 Bad Request. {"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"reason":"API_KEY_INVALID"}]}}';
const L = O.LIGHTINGS[0].id, CAM = O.CAMERA_MODES[0].options[0].id;

function world(over = {}) {
  const n = { access: 0, key: 0, gen: 0 };
  const w = {
    n, calls: [], ctorThrows: over.ctorThrows,
    checkAccess: async () => { n.access++; return over.access ?? { allowed: true, user: { id: U } }; },
    getApiKey: async () => { n.key++; return "key" in over ? over.key : KEY; },
    gen: async (args, apiKey) => {
      n.gen++; w.calls.push({ args, apiKey });
      if (over.genThrows) throw over.genThrows;
      return { text: over.text ?? '["하나","둘","셋"]' };
    },
  };
  globalThis.__aif = w;
  return w;
}
const req = (body) => new Request("http://local/api/x", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), headers: { "Content-Type": "application/json" } });
const call = async (route, body) => { const r = await route.POST(req(body)); const text = await r.text(); return { status: r.status, text, json: JSON.parse(text) }; };
const CONFIG = { location: "성수 카페", outfit: "니트", storyContext: "주말", isAdMode: false, personImage: "data:image/png;base64," + "A".repeat(50000) };
/** 응답 본문에 키·원문 오류가 없어야 한다 */
const noLeak = (text, extra = []) => { for (const s of [KEY, "API_KEY_INVALID", "googleapis", "Bad Request", "INVALID_ARGUMENT", ...extra]) assert.equal(text.includes(s), false, `응답에 「${s}」가 있습니다`); };

// ── 캡션 ──
test("캡션 정상: 예전과 같은 모양 {success, captions}만 — 사유 칸이 붙지 않는다, 회원 키·바뀐 모델로 1번 호출", async () => {
  const w = world();
  const r = await call(Caption, { config: CONFIG });
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { success: true, captions: ["하나", "둘", "셋"] });
  assert.equal(w.n.gen, 1); assert.equal(w.calls[0].apiKey, KEY); assert.equal(w.calls[0].args.model, TEXT_MODEL); assert.equal(TEXT_MODEL, "gemini-3.8-flash");
});

test("캡션 정상: 객체로 감싼 응답·4개 이상도 3개로", async () => {
  world({ text: '{"captions":["a","b","c","d"]}' });
  assert.deepEqual((await call(Caption, { config: CONFIG })).json.captions, ["a", "b", "c"]);
});

test("캡션 auth: 기본 문구로 감추지 않고 400 오류 — 캡션 없음, 키·원문 없음", async () => {
  for (const err of [Object.assign(new Error(GOOGLE_KEY_INVALID), { status: 400 }), { status: 401, message: "x" }, { status: "403" }, { status: 429, message: '{"reason":"API_KEY_INVALID"}' }]) {
    world({ genThrows: err });
    const r = await call(Caption, { config: CONFIG });
    assert.equal(r.status, 400, JSON.stringify(err)); assert.equal(r.json.success, undefined); assert.equal(r.json.captions, undefined);
    assert.equal(r.json.errorKind, "auth"); assert.match(r.json.error, /API키등록·플랫폼연동/);
    noLeak(r.text);
  }
});

test("캡션 auth(호출부 고정): 호출은 정확히 1번, 다시 보내지 않고 기본 문구도 만들지 않는다 — 소문자 구조 별칭 포함", async () => {
  const OPENAI = '401 {"error":{"message":"Incorrect API key provided.","type":"invalid_request_error","code":"invalid_api_key"}}';
  for (const err of [new Error(OPENAI), { error: { type: "authentication_error" } }, { code: "invalid_api_key" }, { status: 403 }]) {
    const w = world({ genThrows: err });
    const r = await call(Caption, { config: CONFIG, refinementRequest: "톤 바꿔줘" });
    assert.equal(w.n.gen, 1, "호출은 한 번"); assert.equal(r.status, 400); assert.equal(r.json.errorKind, "auth");
    assert.equal("captions" in r.json, false); assert.equal("captionNotice" in r.json, false);
    noLeak(r.text, ["Incorrect API key"]);
  }
});

test("예상 밖 오류(TextGenerationError가 아님): 고정 문장 500, 원문 없음 — 세 라우트 모두", async () => {
  for (const [route, body, msg] of [[Caption, { config: CONFIG }, "캡션 생성 중 오류"], [PlanDay, { routinePrompt: "아침" }, "일과 플래닝 중 오류"], [PlanVar, { eventPrompt: "생일" }, "이벤트 변형 생성 중 오류"]]) {
    world({ ctorThrows: new Error("ctor secret-detail") });
    const r = await call(route, body);
    assert.equal(r.status, 500); assert.match(r.json.error, new RegExp(msg)); assert.equal(r.json.errorKind, undefined);
    noLeak(r.text, ["secret-detail", "ctor"]);
  }
});

test("캡션 quota·timeout·format·other: 기본 문구 3개 + 종류별 사유, 키·원문 없음", async () => {
  const cases = [
    [{ status: 429, message: "RESOURCE_EXHAUSTED secret-detail" }, /한도/],
    [Object.assign(new Error("slow secret-detail"), { name: "TimeoutError" }), /시간이 초과/],
    [null, /형식/, "not json at all"],
    [null, /형식/, '["하나","둘"]'],
    [null, /형식/, '{"text":"..."}'],
    [new Error("boom secret-detail"), /받지 못했습니다/],
  ];
  for (const [err, re, text] of cases) {
    world({ ...(err ? { genThrows: err } : {}), ...(text ? { text } : {}) });
    const r = await call(Caption, { config: CONFIG });
    assert.equal(r.status, 200); assert.equal(r.json.success, true); assert.equal(r.json.captions.length, 3);
    assert.match(r.json.captionNotice, re); assert.match(r.json.captionNotice, /기본 문구를 넣었습니다/);
    noLeak(r.text, ["secret-detail"]);
  }
});

test("캡션 입력: 상한 초과·글자 아닌 값·config 없음·본문이 JSON이 아님 → 400, 호출 0", async () => {
  for (const body of [
    { config: CONFIG, refinementRequest: "가".repeat(2001) },
    { config: { ...CONFIG, storyContext: "나".repeat(2001) } },
    { config: { ...CONFIG, productName: 7 } },
    { config: CONFIG, refinementRequest: ["x"] },
    { config: null }, { config: [] }, {}, "not-json", "[1,2]",
  ]) {
    const w = world();
    const r = await call(Caption, body);
    assert.equal(r.status, 400, JSON.stringify(body).slice(0, 80)); assert.equal(w.n.gen, 0);
  }
  // 상한 바로 아래는 통과, 사진(data URL) 칸은 길이 상한에 들지 않는다
  const w = world();
  assert.equal((await call(Caption, { config: CONFIG, refinementRequest: "가".repeat(2000) })).status, 200); assert.equal(w.n.gen, 1);
});

test("캡션 키 없음·권한 없음: 예전과 같은 응답, 호출 0", async () => {
  let w = world({ key: null });
  let r = await call(Caption, { config: CONFIG });
  assert.equal(r.status, 400); assert.equal(r.json.needApiKey, true); assert.equal(w.n.gen, 0);
  w = world({ access: { allowed: false, error: "권한 없음", status: 403 } });
  r = await call(Caption, { config: CONFIG });
  assert.equal(r.status, 403); assert.equal(w.n.key, 0); assert.equal(w.n.gen, 0);
});

// ── 하루 일과·이벤트 변형 ──
const sc = (i, cfg = {}) => ({ id: `s${i}`, labelKo: `장면${i}`, labelEn: `Scene${i}`, story: "이야기", timeOrder: i,
  config: { outfit: "니트", location: "카페", expression: "미소", pose: "앉음", lighting: L, camera: CAM, filmStock: "", hairStyle: "", skin: [], ...cfg } });

for (const [name, route, field] of [["일과", PlanDay, "routinePrompt"], ["변형", PlanVar, "eventPrompt"]]) {
  test(`${name} 정상: 예전과 같은 모양 {success, scenarios}, 선택지 밖 값은 빈 글, 최대 5개`, async () => {
    const w = world({ text: JSON.stringify([sc(1, { lighting: "없는-조명" }), sc(2), sc(3), sc(4), sc(5), sc(6)]) });
    const r = await call(route, { [field]: "아침 카페", persona: "20대" });
    assert.equal(r.status, 200); assert.deepEqual(Object.keys(r.json).sort(), ["scenarios", "success"]);
    assert.equal(r.json.scenarios.length, 5); assert.equal(r.json.scenarios[0].config.lighting, ""); assert.equal(r.json.scenarios[1].config.lighting, L);
    assert.equal(w.n.gen, 1); assert.equal(w.calls[0].apiKey, KEY); assert.equal(w.calls[0].args.model, TEXT_MODEL);
  });

  test(`${name} 실패 종류별 상태: auth 400 · quota 429 · timeout 504 · format 502 · other 502 — 키·원문 없음`, async () => {
    const cases = [
      [{ genThrows: Object.assign(new Error(GOOGLE_KEY_INVALID), { status: 400 }) }, 400, "auth"],
      [{ genThrows: { status: 429, message: "secret-detail" } }, 429, "quota"],
      [{ genThrows: Object.assign(new Error("secret-detail"), { name: "AbortError" }) }, 504, "timeout"],
      [{ text: "not json" }, 502, "format"],
      [{ text: '[{"id":"x"}]' }, 502, "format"],
      [{ genThrows: new Error("boom secret-detail") }, 502, "other"],
    ];
    for (const [over, status, kind] of cases) {
      world(over);
      const r = await call(route, { [field]: "아침", persona: "" });
      assert.equal(r.status, status, kind); assert.equal(r.json.errorKind, kind); assert.equal(r.json.scenarios, undefined);
      noLeak(r.text, ["secret-detail"]);
    }
  });

  test(`${name} 입력: 비었음·상한 초과·글자 아님·본문 이상 → 400, 호출 0`, async () => {
    for (const body of [{ [field]: "" }, { [field]: "  " }, { [field]: 3 }, { [field]: "가".repeat(2001) }, { [field]: "a", persona: "나".repeat(2001) }, { [field]: "a", persona: 5 }, "nope", "[]"]) {
      const w = world();
      const r = await call(route, body);
      assert.equal(r.status, 400, JSON.stringify(body).slice(0, 60)); assert.equal(w.n.gen, 0);
    }
  });
}

// ── 화면 쪽 읽기 ──
test("화면: 응답에서 캡션·사유 꺼내기 — 정상·대체·실패·이상한 값", () => {
  assert.deepEqual(readCaptionResponse({ success: true, captions: ["a", "b", "c"] }), { captions: ["a", "b", "c"], notice: null });
  assert.deepEqual(readCaptionResponse({ success: true, captions: ["a", 1, "c"], captionNotice: "사유" }), { captions: ["a", "c"], notice: "사유" });
  assert.deepEqual(readCaptionResponse({ error: "키 오류", errorKind: "auth" }), { captions: [], notice: "키 오류" });
  for (const d of [null, undefined, "x", [], { success: "true", captions: ["a"] }, { success: false }]) {
    const r = readCaptionResponse(d);
    assert.deepEqual(r.captions, [], JSON.stringify(d)); assert.equal(r.notice, CAPTION_REQUEST_FAILED, JSON.stringify(d));
  }
  assert.match(CAPTION_REQUEST_FAILED, /다시 작성/);
});
