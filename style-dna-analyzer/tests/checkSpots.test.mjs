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

test("v1.34 추세: 검사·20개 자르기·그래프 좌표", async () => {
  const { cleanTrend, appendTrend, sparklinePoints, MAX_TREND } = await import("../src/lib/dna/checkSpots.ts");
  assert.deepEqual(cleanTrend([{ at: "2026-10-22T00:00:00Z", avg: 34.84, n: 2 }, { at: "x", avg: 1, n: 1 }, { at: "2026-10-22T00:00:00Z", avg: 5, n: 0 }]), [{ at: "2026-10-22T00:00:00.000Z", avg: 34.8, n: 2 }]);
  let list = [];
  for (let i = 0; i < 25; i++) list = appendTrend(list, { at: new Date(Date.UTC(2026, 9, 22, 0, i)).toISOString(), avg: i, n: 1 });
  assert.equal(list.length, MAX_TREND);
  assert.equal(list[0].avg, 5);
  assert.equal(sparklinePoints([], 100, 20), "");
  assert.equal(sparklinePoints([10], 100, 20), "50,3");
  // 값이 높을수록 아래(차이가 크면 아래, 줄어들면 위로 올라가는 모양)
  assert.equal(sparklinePoints([60, 30, 0], 100, 20), "3,17 50,10 97,3");
});

test("v1.35 추세 점 프롬프트·점 좌표", async () => {
  const { cleanTrend, appendTrend, sparklineXY, sparklinePoints, MAX_TREND_PROMPT } = await import("../src/lib/dna/checkSpots.ts");
  const long = "a  very\nlong prompt ".repeat(20);
  const [p] = cleanTrend([{ at: "2026-10-22T00:00:00Z", avg: 10, n: 2, prompt: long }]);
  assert.equal(p.prompt.length, MAX_TREND_PROMPT);
  assert.ok(!/\s{2,}/.test(p.prompt));
  assert.equal(cleanTrend([{ at: "2026-10-22T00:00:00Z", avg: 10, n: 2, prompt: 5 }])[0].prompt, undefined);
  assert.equal(appendTrend([], { at: "2026-10-22T00:00:00Z", avg: 3, n: 1, prompt: " cat " })[0].prompt, "cat");
  assert.deepEqual(sparklineXY([60, 30, 0], 100, 20), [[3, 17], [50, 10], [97, 3]]);
  assert.equal(sparklinePoints([60, 30, 0], 100, 20), "3,17 50,10 97,3");
});
