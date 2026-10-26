// 수집량 상한(2026-10-25) 순수 함수 시험 — node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeNextDue, kstDate, pickRunSlice, shouldRunScheduled } from "../extension/lib/guard.js";
import { MAX_PAGES_PER_DAY, estimateLoad } from "../lib/limits.ts";

const schedule = { enabled: true, intervalMinutes: 120, startHour: null, endHour: null };

test("하루 한도에 닿은 날은 예약 수집을 쉰다", () => {
  const now = Date.now();
  assert.deepEqual(shouldRunScheduled({ schedule, lastRunAt: null, stoppedDate: null, limitDate: kstDate(now), nextDueAt: null, now }), { run: false, why: "오늘 수집 한도 도달" });
  assert.equal(shouldRunScheduled({ schedule, lastRunAt: null, stoppedDate: null, limitDate: "2000-01-01", nextDueAt: null, now }).run, true);
});

test("다음 예정 시각이 지나야 돈다", () => {
  const now = Date.parse("2026-10-25T03:00:00Z");
  const last = new Date(now - 30 * 60000).toISOString();
  assert.equal(shouldRunScheduled({ schedule, lastRunAt: last, nextDueAt: new Date(now + 60000).toISOString(), now }).run, false);
  assert.equal(shouldRunScheduled({ schedule, lastRunAt: last, nextDueAt: new Date(now - 60000).toISOString(), now }).run, true);
});

test("예약 시각 흔들기는 ±10% 안, 55분보다 짧지 않다", () => {
  const t0 = Date.parse("2026-10-25T00:00:00Z");
  const lo = Date.parse(computeNextDue(t0, 120, 0.1, () => 0)) - t0;
  const hi = Date.parse(computeNextDue(t0, 120, 0.1, () => 0.999999)) - t0;
  assert.equal(lo, 108 * 60000);
  assert.ok(hi <= 132 * 60000 && hi > 131 * 60000);
  assert.equal(Date.parse(computeNextDue(t0, 10, 0.1, () => 0)) - t0, 55 * 60000); // 1시간 미만 값은 1시간으로
});

test("한 회차 상한을 넘으면 돌아가며 읽는다", () => {
  const list = Array.from({ length: 25 }, (_, i) => i);
  const a = pickRunSlice(list, 20, 0);
  assert.equal(a.slice.length, 20);
  assert.equal(a.nextCursor, 20);
  const b = pickRunSlice(list, 20, a.nextCursor);
  assert.deepEqual(b.slice.slice(0, 5), [20, 21, 22, 23, 24]);
  assert.deepEqual(pickRunSlice([1, 2], 20, 7), { slice: [1, 2], nextCursor: 0 });
});

test("예상 수집량 계산", () => {
  const few = estimateLoad([{ target_type: "complex", enabled: true }, { target_type: "complex", enabled: false }], 180, null, null);
  assert.deepEqual([few.complexes, few.perRun, few.runsPerDay, few.pagesPerRun, few.overRun, few.overDay], [1, 1, 8, 2, false, false]);
  const many = estimateLoad(Array.from({ length: 5 }, () => ({ target_type: "region", region_max_complexes: 10, enabled: true })), 60, null, null);
  assert.equal(many.complexes, 50);
  assert.equal(many.perRun, 20);
  assert.equal(many.overRun, true);
  assert.equal(many.overDay, true);
  assert.equal(many.pagesPerDay, MAX_PAGES_PER_DAY);
  assert.equal(estimateLoad([], 120, 9, 18).runsPerDay, 4);
});

test("시험 계정 예외(v1.31): 관리자·테스트 계정만 하루 상한에서 빠짐", async () => {
  const { isLimitExempt } = await import("../lib/limits.ts");
  assert.equal(isLimitExempt("buylifemall@gmail.com"), true);
  assert.equal(isLimitExempt(" BuyLifeMall@Naver.com "), true);
  assert.equal(isLimitExempt("someone@gmail.com"), false);
  assert.equal(isLimitExempt(null), false);
});
