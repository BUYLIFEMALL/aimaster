import { test } from "node:test";
import assert from "node:assert/strict";
import { pickNext, pickPrev, nextRepeat } from "../lib/playerOrder.ts";

const keys = ["a", "b", "c"];
const base = { repeat: "off", shuffle: false, ended: true };

test("반복 버튼은 끔 → 목록 → 한 곡 → 끔", () => {
  assert.equal(nextRepeat("off"), "all");
  assert.equal(nextRepeat("all"), "one");
  assert.equal(nextRepeat("one"), "off");
});

test("반복 끔: 다음 곡, 마지막에서 멈춤", () => {
  assert.equal(pickNext(keys, "a", base), 1);
  assert.equal(pickNext(keys, "c", base), null);
});

test("목록 반복: 마지막 다음은 첫 곡, 이전은 마지막 곡", () => {
  assert.equal(pickNext(keys, "c", { ...base, repeat: "all" }), 0);
  assert.equal(pickPrev(keys, "a", { repeat: "all", shuffle: false, history: [] }), 2);
  assert.equal(pickPrev(keys, "a", { repeat: "off", shuffle: false, history: [] }), null);
});

test("한 곡 반복: 끝나면 같은 곡, 다음 버튼은 다음 곡", () => {
  assert.equal(pickNext(keys, "b", { ...base, repeat: "one" }), 1);
  assert.equal(pickNext(keys, "b", { ...base, repeat: "one", ended: false }), 2);
  assert.equal(pickNext(keys, "c", { ...base, repeat: "one", ended: false }), 0);
});

test("무작위: 지금 곡을 빼고 고름", () => {
  for (const r of [0, 0.4, 0.99]) {
    const n = pickNext(keys, "b", { ...base, shuffle: true, random: () => r });
    assert.notEqual(n, 1);
    assert.ok(n === 0 || n === 2);
  }
  assert.equal(pickNext(["a"], "a", { ...base, shuffle: true }), null);
  assert.equal(pickNext(["a"], "a", { ...base, shuffle: true, repeat: "all" }), 0);
});

test("무작위 이전 곡: 들은 기록에서 지금 곡이 아닌 마지막 곡", () => {
  assert.equal(pickPrev(keys, "b", { repeat: "off", shuffle: true, history: ["c", "a"] }), 0);
  assert.equal(pickPrev(keys, "b", { repeat: "off", shuffle: true, history: [] }), null);
  assert.equal(pickPrev(keys, "b", { repeat: "off", shuffle: true, history: ["a", "x"] }), 0);
});

test("빈 목록·지금 곡 없음", () => {
  assert.equal(pickNext([], null, base), null);
  assert.equal(pickNext(keys, null, base), 0);
});
