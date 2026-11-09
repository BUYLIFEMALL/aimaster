// 여러 버전 한 번에(2026-11-09) — 엔진 × 장르 조합, 최대 8곡, 제목 「(재즈 · YuE2)」
import test from "node:test";
import assert from "node:assert/strict";
import { MULTI_MAX, buildSlots, slotCount, versionTitle } from "../src/lib/multiVersion.ts";

const ace = { id: "acestep", name: "ACE-Step 1.5" };
const yue = { id: "yue2", name: "YuE2" };
const heart = { id: "heartmula", name: "HeartMuLa 3B" };

test("조합 — 엔진 × 장르, 안 고른 쪽은 지금 엔진·장르 없음", () => {
  assert.equal(buildSlots([ace, yue], ["재즈·블루스", "발라드", "K-POP"], ace).length, 6);
  assert.deepEqual(buildSlots([], ["재즈·블루스", "발라드"], yue).map((s) => s.engine), ["yue2", "yue2"]);
  assert.deepEqual(buildSlots([ace, heart], [], ace).map((s) => s.genre), ["", ""]);
  assert.equal(slotCount(0, 0), 1);
  assert.equal(slotCount(3, 3), 9);
});

test("최대 8곡에서 자름", () => {
  assert.equal(MULTI_MAX, 8);
  assert.equal(buildSlots([ace, yue, heart], ["a", "b", "c"], ace).length, 8);
});

test("제목 — 여러 개 고른 쪽만 붙이고 80자 안", () => {
  const s = { engine: "yue2", engineName: "YuE2", genre: "재즈·블루스" };
  assert.equal(versionTitle("가을 산책", s, { genre: true, engine: true }), "가을 산책 (재즈·블루스 · YuE2)");
  assert.equal(versionTitle("가을 산책", s, { genre: true, engine: false }), "가을 산책 (재즈·블루스)");
  assert.equal(versionTitle("가을 산책", { ...s, genre: "" }, { genre: false, engine: true }), "가을 산책 (YuE2)");
  assert.equal(versionTitle("", s, { genre: false, engine: false }), "제목 없는 노래");
  const long = versionTitle("가".repeat(100), s, { genre: true, engine: true });
  assert.ok(long.length <= 80 && long.endsWith("(재즈·블루스 · YuE2)"));
});
