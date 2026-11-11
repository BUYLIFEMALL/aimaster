import { test } from "node:test";
import assert from "node:assert/strict";
import { barPct, isYmd, kstDate, kstDayStart, periodRange } from "../src/lib/stats.ts";

// 2026-11-06 23:30 한국 시간 = 2026-11-06T14:30Z
const now = new Date("2026-11-06T14:30:00Z");

test("한국 날짜 계산", () => {
  assert.equal(kstDate(now), "2026-11-06");
  assert.equal(kstDate(new Date("2026-11-06T15:30:00Z")), "2026-11-07"); // 한국 0시 30분
  assert.equal(kstDayStart("2026-11-06").toISOString(), "2026-11-05T15:00:00.000Z");
  assert.equal(isYmd("2026-02-30"), true); // 형식만 본다(날짜 넘침은 Date가 흡수)
  assert.equal(isYmd("2026-1-5"), false);
  assert.equal(isYmd(null), false);
});

test("기간 계산", () => {
  const t = periodRange("today", now);
  assert.deepEqual([t.fromDay, t.toDay], ["2026-11-06", "2026-11-06"]);
  assert.equal(t.from.toISOString(), "2026-11-05T15:00:00.000Z");
  assert.equal(t.to.toISOString(), "2026-11-06T15:00:00.000Z");
  assert.deepEqual([periodRange("7d", now).fromDay, periodRange("7d", now).toDay], ["2026-10-31", "2026-11-06"]);
  assert.equal(periodRange("30d", now).fromDay, "2026-10-08");
  assert.equal(periodRange("month", now).fromDay, "2026-11-01");
  assert.equal(periodRange(undefined, now).key, "30d");
  assert.equal(periodRange("weird", now).key, "30d");
});

test("직접 입력 기간", () => {
  const c = periodRange("custom", now, "2026-10-20", "2026-10-01");
  assert.deepEqual([c.key, c.fromDay, c.toDay], ["custom", "2026-10-01", "2026-10-20"]); // 앞뒤 바꿈
  assert.equal(periodRange("custom", now, "bad", "2026-10-01").key, "30d"); // 틀리면 30일
  const long = periodRange("custom", now, "2020-01-01", "2026-11-06");
  assert.equal(long.fromDay, "2025-10-03"); // 400일로 당김
});

test("막대 비율", () => {
  assert.equal(barPct(50, 100), 50);
  assert.equal(barPct(1, 1000), 2); // 최소 2
  assert.equal(barPct(0, 100), 0);
  assert.equal(barPct(10, 0), 0);
  assert.equal(barPct(100, 100), 100);
});
