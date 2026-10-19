// 📅 인스타 예약 게시(v1.19) 단위 테스트 — 예약 시각 범위, 한국 시간 변환, 보기용 표기
import test from "node:test";
import assert from "node:assert/strict";
import { validateScheduleTime, kstLocalToIso, formatKst, MIN_LEAD_MS, MAX_AHEAD_MS } from "../src/lib/cardnews/schedule.ts";

const NOW = Date.UTC(2026, 9, 19, 3, 0); // 2026-10-19 12:00 KST

test("예약 시각: 10분 뒤 ~ 60일 안만 허용", () => {
  assert.equal(validateScheduleTime(new Date(NOW + MIN_LEAD_MS).toISOString(), NOW).ok, true);
  assert.equal(validateScheduleTime(new Date(NOW + MAX_AHEAD_MS).toISOString(), NOW).ok, true);
  const tooSoon = validateScheduleTime(new Date(NOW + MIN_LEAD_MS - 1000).toISOString(), NOW);
  assert.equal(tooSoon.ok, false);
  assert.match(tooSoon.error, /10분/);
  const tooFar = validateScheduleTime(new Date(NOW + MAX_AHEAD_MS + 60000).toISOString(), NOW);
  assert.equal(tooFar.ok, false);
  assert.match(tooFar.error, /60일/);
});

test("예약 시각: 형식이 틀리면 거절", () => {
  for (const bad of [undefined, null, 123, "", "내일", "2026-13-40"]) {
    assert.equal(validateScheduleTime(bad, NOW).ok, false);
  }
});

test("한국 시간 입력값 → ISO(UTC -9시간), 날짜 넘김 포함", () => {
  assert.equal(kstLocalToIso("2026-10-19T13:30"), "2026-10-19T04:30:00.000Z");
  assert.equal(kstLocalToIso("2026-10-20T08:05"), "2026-10-19T23:05:00.000Z");
  assert.equal(kstLocalToIso("2026-01-01T00:00"), "2025-12-31T15:00:00.000Z");
  assert.equal(kstLocalToIso("2026-10-19 13:30"), null);
  assert.equal(kstLocalToIso(""), null);
});

test("보기용 한국 시간 표기", () => {
  assert.equal(formatKst("2026-10-19T04:30:00.000Z"), "10월 19일 13:30");
  assert.equal(formatKst("2026-10-19T23:05:00.000Z"), "10월 20일 08:05");
  assert.equal(formatKst(null), "");
});
