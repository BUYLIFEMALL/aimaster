import test from "node:test";
import assert from "node:assert/strict";
import { parseCollectionName, parseCollectionOrder, parseKind, parseTrackOrder } from "../src/lib/collections.ts";

const a = "3f2b8c1e-1a2b-4c3d-8e9f-0123456789ab";
const b = "4f2b8c1e-1a2b-4c3d-8e9f-0123456789ab";

test("묶음 순서(v1.31): uuid만·중복 없이·200개까지", () => {
  assert.deepEqual(parseCollectionOrder([b, a]), [b, a]);
  assert.deepEqual(parseCollectionOrder([]), []);
  assert.equal(parseCollectionOrder([a, a]), null);
  assert.equal(parseCollectionOrder([a, "x"]), null);
  assert.equal(parseCollectionOrder("a"), null);
  assert.equal(parseCollectionOrder(Array.from({ length: 201 }, () => a)), null);
});

test("묶음 이름: 공백 정리, 빈 이름·40자 초과 거절", () => {
  assert.deepEqual(parseCollectionName("  JAZZ   No.1 "), { ok: true, value: "JAZZ No.1" });
  assert.equal(parseCollectionName("   ").ok, false);
  assert.equal(parseCollectionName("가".repeat(41)).ok, false);
  assert.equal(parseCollectionName(3).ok, false);
});

test("묶음 종류: project·playlist만", () => {
  assert.equal(parseKind("project"), "project");
  assert.equal(parseKind("playlist"), "playlist");
  assert.equal(parseKind("folder"), null);
});

test("플레이리스트 순서: uuid만·중복 거절·순서 유지", () => {
  assert.deepEqual(parseTrackOrder([b, a]), { ok: true, value: [b, a] });
  assert.deepEqual(parseTrackOrder([]), { ok: true, value: [] });
  assert.equal(parseTrackOrder([a, a]).ok, false);
  assert.equal(parseTrackOrder([a, "x"]).ok, false);
  assert.equal(parseTrackOrder("a").ok, false);
  assert.equal(parseTrackOrder(Array.from({ length: 301 }, (_, i) => `${String(i).padStart(8, "0")}-1a2b-4c3d-8e9f-0123456789ab`)).ok, false);
});
