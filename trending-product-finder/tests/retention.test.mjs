// v1.13 생성 자료 30일 보관 기준 시각 단위 테스트
import { test } from "node:test";
import assert from "node:assert/strict";
import { retentionCutoff, RETENTION_DAYS } from "../lib/retention.ts";

test("기준 시각 = 지금 - 30일(ISO), 기간 지정 가능", () => {
  assert.equal(RETENTION_DAYS, 30);
  const now = new Date("2026-10-17T03:50:00Z");
  assert.equal(retentionCutoff(now), "2026-09-17T03:50:00.000Z");
  assert.equal(retentionCutoff(now, 1), "2026-10-16T03:50:00.000Z");
});

test("관리자 리포트(2026-08-31~09-11)는 2026-10-17 기준 모두 만료", () => {
  const cutoff = retentionCutoff(new Date("2026-10-17T00:00:00Z"));
  for (const d of ["2026-08-31T00:00:00Z", "2026-09-11T23:59:59Z"]) assert.ok(d < cutoff);
  assert.ok("2026-09-20T00:00:00Z" >= cutoff);
});
