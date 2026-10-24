import test from "node:test";
import assert from "node:assert/strict";
import { BOARD_CATEGORIES, BOARD_PRESETS, boardFromRows, filterPresets, findPreset, presetToRow, rowToPreset, sanitizeMineInput, sanitizePresetInput } from "../lib/promptBoard.ts";
import { CAMERAS, STYLES } from "../lib/presets.ts";

test("게시판 목록: 24개·6개 분류 각 4개, id 중복 없음, 화풍·카메라는 생성 화면에 있는 값", () => {
  assert.equal(BOARD_PRESETS.length, 24);
  assert.equal(new Set(BOARD_PRESETS.map((p) => p.id)).size, 24);
  for (const c of BOARD_CATEGORIES) assert.equal(BOARD_PRESETS.filter((p) => p.category === c.id).length, 4, c.id);
  for (const p of BOARD_PRESETS) {
    assert.match(p.id, /^[a-z0-9-]{3,60}$/, p.id);
    assert.ok(STYLES.some((s) => s.id === p.styleId), `화풍 없음: ${p.id}`);
    assert.ok(CAMERAS.some((c) => c.id === p.cameraId), `카메라 없음: ${p.id}`);
    assert.ok(p.idea.length >= 20 && p.idea.length <= 1200, p.id);
  }
});

test("게시판 목록: 사람이 나오는 장면은 한국인으로, 연도 표기 없음(프롬프트 규칙)", () => {
  for (const p of BOARD_PRESETS) {
    assert.doesNotMatch(p.idea, /20\d\d년/, p.id);
    if (p.category === "people") assert.match(p.idea, /한국인/, p.id);
  }
});

test("검색·분류 거르기: 띄어쓰기 무시, 분류와 함께", () => {
  assert.ok(filterPresets(BOARD_PRESETS, "all", "한강").length >= 2);
  assert.ok(filterPresets(BOARD_PRESETS, "all", "한 강").length >= 2);
  assert.deepEqual(filterPresets(BOARD_PRESETS, "food", "한강"), []);
  assert.equal(filterPresets(BOARD_PRESETS, "product", "").length, 4);
});

test("findPreset: 있는 id만", () => {
  assert.equal(findPreset("food-latte")?.title, "창가 라테");
  assert.equal(findPreset("없는-id"), undefined);
  assert.equal(findPreset(42), undefined);
});

const good = { id: "city-night-rain", category: "city", title: "비 오는 밤", idea: "비 오는 골목에 네온 불빛이 번진다", styleId: "cinematic", cameraId: "push", input: "text", sortOrder: 15, published: true };

test("v1.19 관리자 예시 검사: 맞는 값 통과, id·분류·제목·설명·화풍·카메라가 틀리면 거절", () => {
  const ok = sanitizePresetInput(good);
  assert.equal(ok.ok, true);
  for (const bad of [
    { ...good, id: "City Night" }, { ...good, id: "ab" }, { ...good, category: "sports" },
    { ...good, title: "" }, { ...good, title: "가".repeat(41) }, { ...good, idea: "가" },
    { ...good, styleId: "noir" }, { ...good, cameraId: "zoom" },
  ]) assert.equal(sanitizePresetInput(bad).ok, false, JSON.stringify(bad).slice(0, 60));
  assert.equal(sanitizePresetInput({ ...good, sortOrder: -5 }).value.sortOrder, 0);
  assert.equal(sanitizePresetInput({ ...good, input: "video" }).value.input, "text");
  assert.equal(sanitizePresetInput({ ...good, published: undefined }).value.published, true);
});

test("v1.19 DB 줄 ↔ 화면 값이 그대로 오간다, 모르는 화풍 줄은 뺀다", () => {
  const v = sanitizePresetInput(good).value;
  assert.deepEqual(rowToPreset(presetToRow(v)), v);
  assert.equal(rowToPreset({ ...presetToRow(v), style_id: "gone" }), null);
});

test("v1.19 DB가 비면 코드 속 24개(순서 10 간격), 있으면 순서대로", () => {
  const empty = boardFromRows([]);
  assert.equal(empty.source, "code");
  assert.equal(empty.presets.length, 24);
  assert.equal(empty.presets[1].sortOrder, 20);
  const rows = [{ ...sanitizePresetInput(good).value, sortOrder: 30 }, { ...sanitizePresetInput({ ...good, id: "a-first" }).value, sortOrder: 5 }];
  const db = boardFromRows(rows);
  assert.equal(db.source, "db");
  assert.deepEqual(db.presets.map((p) => p.id), ["a-first", "city-night-rain"]);
});

test("v1.19 내 프롬프트 검사: 제목 없으면 설명 앞 40자, 모르는 화풍·카메라는 비움", () => {
  const v = sanitizeMineInput({ idea: "  한옥   마당에 첫눈이 내린다 ".repeat(5), styleId: "noir", cameraId: "orbit" });
  assert.equal(v.ok, true);
  assert.equal(v.value.title.length, 40);
  assert.equal(v.value.styleId, null);
  assert.equal(v.value.cameraId, "orbit");
  assert.equal(sanitizeMineInput({ idea: " " }).ok, false);
});
