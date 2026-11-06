import test from "node:test";
import assert from "node:assert/strict";
import { daysLeft, parseIdList } from "../src/lib/trash.ts";

const a = "3f2b8c1e-1a2b-4c3d-8e9f-0123456789ab";
const b = "4f2b8c1e-1a2b-4c3d-8e9f-0123456789ab";

test("휴지통 곡 번호: uuid만, 중복 제거, 빈 목록·잘못된 번호 거절", () => {
  assert.deepEqual(parseIdList([a, b, a]), { ok: true, value: [a, b] });
  assert.equal(parseIdList([]).ok, false);
  assert.equal(parseIdList("x").ok, false);
  assert.equal(parseIdList([a, "abc"]).ok, false);
  assert.equal(parseIdList(Array.from({ length: 501 }, () => a)).ok, false);
});

test("휴지통 남은 날: 30일에서 지난 날만큼, 지나면 0", () => {
  const now = Date.parse("2026-11-06T00:00:00Z");
  assert.equal(daysLeft("2026-11-06T00:00:00Z", now), 30);
  assert.equal(daysLeft("2026-10-27T00:00:00Z", now), 20);
  assert.equal(daysLeft("2026-09-01T00:00:00Z", now), 0);
});
