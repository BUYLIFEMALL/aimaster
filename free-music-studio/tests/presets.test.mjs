import test from "node:test";
import assert from "node:assert/strict";
import { MY_PRESET_CATEGORY, PRESETS, PRESET_LIMITS, pageCount, parsePresetInput, presetCategories, presetsFor } from "../src/lib/presets.ts";
import { LIMITS } from "../src/lib/songs.ts";

test("프리셋: 노래 43개·연주곡 42개, id는 겹치지 않고 스타일은 저장 한도 안", () => {
  assert.equal(PRESETS.filter((p) => p.mode === "vocal").length, 43);
  assert.equal(PRESETS.filter((p) => p.mode === "instrumental").length, 42);
  assert.equal(new Set(PRESETS.map((p) => p.id)).size, PRESETS.length);
  for (const p of PRESETS) assert.ok(p.prompt.length > 0 && p.prompt.length <= LIMITS.style, p.id);
});

test("프리셋: 내 프리셋은 같은 모드에서만 맨 앞에 보인다", () => {
  const mine = [
    { id: "a", name: "내 시티팝", prompt: "city pop", mode: "vocal", created_at: "" },
    { id: "b", name: "내 피아노", prompt: "instrumental piano", mode: "instrumental", created_at: "" },
  ];
  const vocal = presetsFor("vocal", mine);
  assert.equal(vocal[0].id, "my:a");
  assert.equal(vocal[0].category, MY_PRESET_CATEGORY);
  assert.equal(vocal.length, 44);
  assert.ok(!vocal.some((p) => p.id === "my:b"));
  assert.equal(presetCategories(vocal)[0], MY_PRESET_CATEGORY);
});

test("프리셋: 한 쪽 6개 — 43개는 8쪽, 비어도 1쪽", () => {
  assert.equal(pageCount(43), 8);
  assert.equal(pageCount(42), 7);
  assert.equal(pageCount(0), 1);
});

test("내 프리셋 저장 입력 검사", () => {
  assert.deepEqual(parsePresetInput({ name: " 비 오는 날 ", prompt: " jazz ", mode: "instrumental" }), { ok: true, value: { name: "비 오는 날", prompt: "jazz", mode: "instrumental" } });
  assert.equal(parsePresetInput({ name: "", prompt: "x" }).ok, false);
  assert.equal(parsePresetInput({ name: "a", prompt: "" }).ok, false);
  assert.equal(parsePresetInput({ name: "a".repeat(PRESET_LIMITS.name + 1), prompt: "x" }).ok, false);
  assert.equal(parsePresetInput({ name: "a", prompt: "x".repeat(PRESET_LIMITS.prompt + 1) }).ok, false);
  assert.equal(parsePresetInput({ name: "a", prompt: "x", mode: "weird" }).value.mode, "vocal");
});
