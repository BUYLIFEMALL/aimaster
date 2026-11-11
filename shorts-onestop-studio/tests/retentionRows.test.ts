// 대본·발행 계획 30일 정리 기준 시험(2026-11-11)
import test from "node:test";
import assert from "node:assert/strict";
import { EXPIRING_KINDS, rowCutoffIso } from "../src/lib/retentionRows.ts";

test("정리 대상은 대본·발행 계획만(프리셋·지침·설정 제외)", () => {
  assert.deepEqual([...EXPIRING_KINDS], ["project", "plan"]);
});

test("기준 시각은 지금부터 정확히 30일 전", () => {
  const now = Date.parse("2026-11-11T00:00:00Z");
  assert.equal(rowCutoffIso(now), "2026-10-12T00:00:00.000Z");
});
