import { test } from "node:test";
import assert from "node:assert/strict";
import { matches, providerCounts } from "../lib/libraryFilter.ts";

const items = [
  { provider: "suno", status: "completed", options: { star: true } },
  { provider: "suno", status: "completed", options: {} },
  { provider: "gemini", status: "completed", options: {} },
  { provider: "gemini", status: "failed", options: {} },
  { provider: "fal", status: "running", options: null },
];

test("상태와 공급자를 함께 거름", () => {
  assert.equal(items.filter((g) => matches(g, "all", "all")).length, 5);
  assert.equal(items.filter((g) => matches(g, "all", "suno")).length, 2);
  assert.equal(items.filter((g) => matches(g, "completed", "gemini")).length, 1);
  assert.equal(items.filter((g) => matches(g, "star", "suno")).length, 1);
  assert.equal(items.filter((g) => matches(g, "star", "gemini")).length, 0);
});

test("공급자 개수는 곡 있는 공급자만, 많은 순", () => {
  assert.deepEqual(providerCounts(items, "all"), [{ id: "gemini", count: 2 }, { id: "suno", count: 2 }, { id: "fal", count: 1 }]);
});

test("상태 필터를 켜면 개수도 그 상태 기준(0이어도 버튼은 남김)", () => {
  assert.deepEqual(providerCounts(items, "completed"), [{ id: "suno", count: 2 }, { id: "gemini", count: 1 }, { id: "fal", count: 0 }]);
});

test("빈 보관함", () => {
  assert.deepEqual(providerCounts([], "all"), []);
});
