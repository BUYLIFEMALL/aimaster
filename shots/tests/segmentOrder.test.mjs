import test from "node:test";
import assert from "node:assert/strict";
import { swapTarget } from "../src/lib/segmentOrder.ts";

const segs = [{ id: "c", segment_index: 3 }, { id: "a", segment_index: 1 }, { id: "b", segment_index: 2 }];

test("위·아래 이웃과 맞바꾼다(입력 순서와 무관)", () => {
  assert.deepEqual(swapTarget(segs, "b", "up"), { from: segs[2], to: segs[1] });
  assert.deepEqual(swapTarget(segs, "b", "down"), { from: segs[2], to: segs[0] });
});

test("맨 끝·없는 장면은 null", () => {
  assert.equal(swapTarget(segs, "a", "up"), null);
  assert.equal(swapTarget(segs, "c", "down"), null);
  assert.equal(swapTarget(segs, "zz", "up"), null);
});
