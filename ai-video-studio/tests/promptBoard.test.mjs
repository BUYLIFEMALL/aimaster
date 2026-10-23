import test from "node:test";
import assert from "node:assert/strict";
import { BOARD_CATEGORIES, BOARD_PRESETS, filterPresets, findPreset } from "../lib/promptBoard.ts";
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
