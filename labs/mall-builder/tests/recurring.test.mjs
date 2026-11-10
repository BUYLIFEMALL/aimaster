import { test } from "node:test";
import assert from "node:assert/strict";
import { firstDate, nextDate, upcoming, parseSchedule, scheduleLabel, todayKst } from "../src/lib/recurring.ts";

const weekly = (weekday, every = 1) => ({ kind: "weekly", weekday, every_weeks: every, month_day: null });
const monthly = (day) => ({ kind: "monthly", weekday: null, every_weeks: 1, month_day: day });

test("매주: 시작일 이후 첫 그 요일, 같은 요일이면 그날", () => {
  // 2026-11-11 은 수요일(3)
  assert.equal(firstDate(weekly(3), "2026-11-11"), "2026-11-11");
  assert.equal(firstDate(weekly(1), "2026-11-11"), "2026-11-16");
  assert.equal(firstDate(weekly(0), "2026-11-11"), "2026-11-15");
});

test("○주마다", () => {
  assert.equal(nextDate(weekly(1, 2), "2026-11-16"), "2026-11-30");
  assert.deepEqual(upcoming(weekly(1), "2026-11-16", 3), ["2026-11-16", "2026-11-23", "2026-11-30"]);
});

test("매달: 말일 보정과 해 넘김", () => {
  assert.equal(firstDate(monthly(15), "2026-11-11"), "2026-11-15");
  assert.equal(firstDate(monthly(5), "2026-11-11"), "2026-12-05");
  assert.equal(firstDate(monthly(31), "2026-11-11"), "2026-11-30");
  assert.equal(nextDate(monthly(31), "2026-11-30"), "2026-12-31");
  assert.equal(nextDate(monthly(31), "2026-12-31"), "2027-01-31");
  assert.equal(nextDate(monthly(31), "2027-01-31"), "2027-02-28");
  assert.equal(nextDate(monthly(30), "2027-02-28"), "2027-03-30");
});

test("입력 검사", () => {
  const today = "2026-11-11";
  assert.equal(parseSchedule({ kind: "x", start: today }, today).ok, false);
  assert.equal(parseSchedule({ kind: "weekly", weekday: 7, every_weeks: 1, start: today }, today).ok, false);
  assert.equal(parseSchedule({ kind: "weekly", weekday: 1, every_weeks: 5, start: today }, today).ok, false);
  assert.equal(parseSchedule({ kind: "monthly", month_day: 0, start: today }, today).ok, false);
  assert.equal(parseSchedule({ kind: "monthly", month_day: 10, start: "2026-11-10" }, today).ok, false);
  assert.equal(parseSchedule({ kind: "monthly", month_day: 10, start: "2027-03-01" }, today).ok, false);
  const ok = parseSchedule({ kind: "weekly", weekday: "2", every_weeks: "2", start: "2026-11-12" }, today);
  assert.deepEqual(ok, { ok: true, value: { kind: "weekly", weekday: 2, every_weeks: 2, month_day: null }, start: "2026-11-12" });
});

test("이름표·한국 날짜", () => {
  assert.equal(scheduleLabel(weekly(1)), "매주 월요일");
  assert.equal(scheduleLabel(weekly(5, 2)), "2주마다 금요일");
  assert.equal(scheduleLabel(monthly(31)), "매달 31일(없는 달은 말일)");
  assert.equal(todayKst(Date.parse("2026-11-10T15:30:00Z")), "2026-11-11");
});
