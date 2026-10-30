// 조회 간격 계산(외부 호출 없음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { gapLeftSeconds } from "../src/lib/readGapRule.ts";

test("마지막 조회 뒤 남은 초를 올림으로 계산한다", () => {
  const now = Date.parse("2026-10-30T10:00:10.000Z");
  assert.equal(gapLeftSeconds("2026-10-30T10:00:05.000Z", now, 10), 5);
  assert.equal(gapLeftSeconds("2026-10-30T10:00:00.500Z", now, 10), 1);
  assert.equal(gapLeftSeconds("2026-10-30T09:59:59.000Z", now, 10), 0);
  assert.equal(gapLeftSeconds(undefined, now, 10), 0);
  assert.equal(gapLeftSeconds("엉뚱한 값", now, 10), 0);
});
