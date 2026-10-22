// v1.32 점검 지점 보관 — 무료 시험
import test from "node:test";
import assert from "node:assert/strict";
import { cleanCheckSpots, spotChange, MAX_CHECK_SPOTS } from "../src/lib/dna/checkSpots.ts";

test("저장 값 검증: 잘못된 항목 버림·범위 고정·최대 8곳", () => {
  const now = new Date("2026-10-22T00:00:00Z");
  assert.deepEqual(cleanCheckSpots("x"), []);
  const r = cleanCheckSpots([{ x: 10, y: 20, diff: 57.54, at: "2026-10-21T01:02:03Z" }, { x: -5, y: 120, diff: "a" }, { x: "a", y: 1 }, null], now);
  assert.deepEqual(r, [
    { x: 10, y: 20, diff: 57.5, at: "2026-10-21T01:02:03.000Z" },
    { x: 0, y: 100, diff: null, at: now.toISOString() },
  ]);
  assert.equal(cleanCheckSpots(Array.from({ length: 12 }, (_, i) => ({ x: i, y: i, diff: i }))).length, MAX_CHECK_SPOTS);
});

test("이전 → 지금 변화", () => {
  assert.deepEqual(spotChange(40, 30), { delta: -10, trend: "better" });
  assert.deepEqual(spotChange(30, 41.2), { delta: 11.2, trend: "worse" });
  assert.deepEqual(spotChange(30, 30.3), { delta: 0.3, trend: "same" });
  assert.equal(spotChange(null, 3), null);
});
