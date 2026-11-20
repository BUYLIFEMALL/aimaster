// 글 생성 입력·응답 검사 시험 (2026-11-20, CC-SNS-01, 글 모델 선택 2단계). 실제 호출·네트워크 0.
// 회사별 실제 응답 모양은 이 시험으로 알 수 없다 — 여기 넣은 응답은 손으로 만든 예시다.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as T from "../src/lib/textOutput.ts";
import * as O from "../src/data/influencer-options.ts";

const SETS = T.buildScenarioOptionSets({
  lightings: O.LIGHTINGS, cameraGroups: O.CAMERA_MODES, filmStocks: O.FILM_STOCKS,
  hairStyles: O.HAIR_STYLES, faceStyles: O.FACE_STYLES, skinTextures: O.SKIN_TEXTURES,
});
const L = O.LIGHTINGS[0].id, CAM = O.CAMERA_MODES[0].options[0].id, F = O.FILM_STOCKS[0].id;
const H = O.HAIR_STYLES[0].id, FACE = O.FACE_STYLES[0].id, S1 = O.SKIN_TEXTURES[0].id, S2 = O.SKIN_TEXTURES[1].id;
const sc = (over = {}, cfg = {}) => ({ id: "a", labelKo: "아침", labelEn: "Morning", story: "카페", timeOrder: 1,
  config: { outfit: "니트", location: "카페", expression: "미소", pose: "앉음", lighting: L, camera: CAM, filmStock: F, hairStyle: H, faceStyle: FACE, skin: [S1], ...cfg }, ...over });

// ── 입력 ──
test("입력: 비었거나 상한 이하면 통과, 상한을 넘거나 글자가 아니면 그 칸 이름과 함께 거절", () => {
  assert.deepEqual(T.checkTextInputs({ a: undefined, b: null, c: "", d: "가".repeat(T.TEXT_INPUT_LIMIT) }), { ok: true });
  const long = T.checkTextInputs({ routinePrompt: "가".repeat(T.TEXT_INPUT_LIMIT + 1) });
  assert.equal(long.ok, false); assert.equal(long.field, "routinePrompt"); assert.match(long.message, /2,000자/);
  for (const v of [3, {}, ["x"], true]) assert.equal(T.checkTextInputs({ persona: v }).ok, false, String(v));
});

test("입력: 글자 수는 이모티콘 하나를 한 글자로 센다(상한 바로 위·아래)", () => {
  assert.equal(T.checkTextInputs({ x: "😀".repeat(T.TEXT_INPUT_LIMIT) }).ok, true);
  assert.equal(T.checkTextInputs({ x: "😀".repeat(T.TEXT_INPUT_LIMIT + 1) }).ok, false);
});

// ── 캡션 ──
test("캡션: 배열이든 { captions } 객체든 앞의 3개를 다듬어 돌려준다", () => {
  assert.deepEqual(T.parseCaptions([" 하나 ", "둘", "셋", "넷"]), ["하나", "둘", "셋"]);
  assert.deepEqual(T.parseCaptions({ captions: ["a", "b", "c"] }), ["a", "b", "c"]);
});

test("캡션: 빈 글·글자 아닌 값·너무 긴 글은 빼고, 남은 것이 3개가 안 되면 null", () => {
  assert.deepEqual(T.parseCaptions(["", "  ", 1, null, "a", "b", "c"]), ["a", "b", "c"]);
  assert.equal(T.parseCaptions(["a", "b", "x".repeat(T.CAPTION_MAX_CHARS + 1)]), null);
  assert.deepEqual(T.parseCaptions(["a", "b", "x".repeat(T.CAPTION_MAX_CHARS)]).length, 3);
  for (const raw of [null, undefined, "a,b,c", {}, { captions: "abc" }, { text: ["a", "b", "c"] }, ["a", "b"]]) assert.equal(T.parseCaptions(raw), null, JSON.stringify(raw));
});

test("캡션 길이 상한은 인스타 게시 상한(feedImage.ts의 MAX_INSTA_CAPTION)과 같다", () => {
  const src = readFileSync(new URL("../src/lib/instagram/feedImage.ts", import.meta.url), "utf8");
  assert.equal(Number(/export const MAX_INSTA_CAPTION = (\d+);/.exec(src)?.[1]), T.CAPTION_MAX_CHARS);
});

// ── 시나리오 ──
test("시나리오: 정상 응답은 모양 그대로, 객체로 감싼 응답도 읽는다", () => {
  const a = T.parseScenarios([sc()], SETS);
  assert.equal(a.length, 1);
  assert.deepEqual(a[0].config, { outfit: "니트", location: "카페", expression: "미소", pose: "앉음", lighting: L, camera: CAM, filmStock: F, hairStyle: H, faceStyle: FACE, skin: [S1] });
  assert.equal(T.parseScenarios({ scenarios: [sc()] }, SETS).length, 1);
});

test("시나리오: 선택지 목록 밖 값은 빈 글로(화면이 지금 설정을 유지), 피부는 목록 안 값만·중복 없이", () => {
  const [s] = T.parseScenarios([sc({}, { lighting: "neon-glow-xx", camera: 7, filmStock: "", hairStyle: "없는값", faceStyle: undefined, skin: [S1, "bad", S1, 3, S2] })], SETS);
  assert.equal(s.config.lighting, ""); assert.equal(s.config.camera, ""); assert.equal(s.config.filmStock, "");
  assert.equal(s.config.hairStyle, ""); assert.equal(s.config.faceStyle, "");
  assert.deepEqual(s.config.skin, [S1, S2]);
  assert.deepEqual(T.parseScenarios([sc({}, { skin: "x" })], SETS)[0].config.skin, []);
});

test("시나리오: 장면 글이 하나도 없거나 config가 없는 항목은 버리고, 하나도 없으면 null", () => {
  const empty = sc({}, { outfit: "", location: " ", expression: 1, pose: null });
  assert.equal(T.parseScenarios([empty, { id: "x" }, { config: [] }, null, "글", 3], SETS), null);
  assert.equal(T.parseScenarios([empty, sc({ id: "b" })], SETS).length, 1);
  for (const raw of [null, {}, "[]", { scenarios: {} }, []]) assert.equal(T.parseScenarios(raw, SETS), null, JSON.stringify(raw));
});

test("시나리오: 최대 5개, 번호가 없거나 겹치면 순서 번호로, 순서·이름이 이상하면 기본값", () => {
  const many = Array.from({ length: 7 }, (_, i) => sc({ id: i < 2 ? "dup" : `s${i}`, timeOrder: i === 3 ? 0 : i === 4 ? 1.5 : i + 1, labelKo: i === 5 ? "" : `장면${i}` }));
  const r = T.parseScenarios(many, SETS);
  assert.equal(r.length, 5);
  assert.deepEqual(r.map((x) => x.id), ["dup", "scenario-2", "s2", "s3", "s4"]);
  assert.equal(r[3].timeOrder, 4); assert.equal(r[4].timeOrder, 5);
  const noId = T.parseScenarios([sc({ id: undefined, labelKo: undefined })], SETS)[0];
  assert.equal(noId.id, "scenario-1"); assert.equal(noId.labelKo, "장면 1");
});

test("시나리오: 지나치게 긴 글은 잘라서 담는다(장면 글은 입력 상한, 이름은 80자)", () => {
  const [s] = T.parseScenarios([sc({ labelKo: "가".repeat(200), story: "나".repeat(5000) }, { outfit: "다".repeat(5000) })], SETS);
  assert.equal(s.labelKo.length, 80); assert.equal(s.story.length, T.TEXT_INPUT_LIMIT); assert.equal(s.config.outfit.length, T.TEXT_INPUT_LIMIT);
});

test("선택지 묶음: 카메라는 묶음 안의 선택지 전부, 각 묶음이 비어 있지 않다", () => {
  assert.equal(SETS.camera.size, O.CAMERA_MODES.flatMap((g) => g.options).length);
  for (const [k, v] of Object.entries(SETS)) assert.ok(v.size > 0, k);
});

// ── 실패 종류·대체 문구 ──
test("실패 종류: 상태 번호와 글로 가른다", () => {
  const cases = [
    [{ status: 401 }, "auth"], [{ status: 403 }, "auth"], [new Error("API key not valid. Please pass a valid API key."), "auth"],
    [{ message: "[400] API_KEY_INVALID" }, "auth"], [{ message: "PERMISSION_DENIED" }, "auth"], [{ code: 401 }, "auth"],
    [{ status: 429 }, "quota"], [new Error("RESOURCE_EXHAUSTED: quota exceeded"), "quota"],
    [Object.assign(new Error("x"), { name: "TimeoutError" }), "timeout"], [Object.assign(new Error("x"), { name: "AbortError" }), "timeout"], [new Error("DEADLINE_EXCEEDED"), "timeout"],
    [new SyntaxError("Unexpected token"), "format"], [new Error("AI_RESPONSE_FORMAT"), "format"],
    [new Error("boom"), "other"], [null, "other"], [undefined, "other"], ["문자열 오류", "other"], [{ status: 500 }, "other"],
  ];
  for (const [err, want] of cases) assert.equal(T.classifyTextFailure(err), want, JSON.stringify(err) + " " + String(err?.message ?? ""));
});

test("대체 문구: 키·인증 문제는 대체하지 않고, 그 밖은 사유와 함께 대체한다", () => {
  assert.equal(T.allowsCaptionFallback("auth"), false);
  for (const k of ["quota", "timeout", "format", "other"]) {
    assert.equal(T.allowsCaptionFallback(k), true, k);
    const n = T.captionFallbackNotice(k);
    assert.match(n, /기본 문구를 넣었습니다/); assert.match(n, /다시 생성/);
  }
  assert.notEqual(T.captionFallbackNotice("quota"), T.captionFallbackNotice("timeout"), "사유가 종류마다 다르다");
});

test("오류 문장: 회사 이름을 넣고, 인증 오류는 키 등록 위치를 말하며, 원문 오류·키 글자는 담지 않는다", () => {
  for (const k of ["auth", "quota", "timeout", "format", "other"]) {
    const m = T.textFailureMessage(k, "Google Gemini");
    assert.doesNotMatch(m, /AIza|sk-|API_KEY_INVALID|PERMISSION_DENIED/);
    if (k !== "format") assert.ok(m.includes("Google Gemini"), k);
  }
  assert.match(T.textFailureMessage("auth", "OpenAI (GPT)"), /API키등록·플랫폼연동/);
});
