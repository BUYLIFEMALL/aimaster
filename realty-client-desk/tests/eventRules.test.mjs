import { test } from "node:test";
import assert from "node:assert/strict";
import { daysLeft, isDue, parseKst, reminderText } from "../src/lib/desk/eventRules.ts";

const now = new Date("2026-11-03T23:00:00Z"); // 11-04 08:00 KST

test("한국 날짜·시각으로 읽기", () => {
  assert.equal(parseKst("2026-11-06", "14:30").toISOString(), "2026-11-06T05:30:00.000Z");
  assert.equal(parseKst("2026-11-06", "").toISOString(), "2026-11-06T01:00:00.000Z"); // 시각 없으면 10시
  assert.equal(parseKst("11/6", "10:00"), null);
});

test("오늘 알릴 일정: 알림일 ≤ 오늘, 지난 일정·끝난 일정·이미 알린 일정 제외", () => {
  const base = { notified_at: null, done: false };
  assert.equal(isDue({ ...base, event_at: "2026-11-05T05:00:00Z", notify_days: 1 }, now), true);  // 내일, 1일 전 알림
  assert.equal(isDue({ ...base, event_at: "2026-11-06T05:00:00Z", notify_days: 1 }, now), false); // 모레
  assert.equal(isDue({ ...base, event_at: "2026-11-04T05:00:00Z", notify_days: 0 }, now), true);  // 오늘(당일 알림)
  assert.equal(isDue({ ...base, event_at: "2026-11-03T05:00:00Z", notify_days: 3 }, now), false); // 어제 지남
  assert.equal(isDue({ ...base, event_at: "2027-01-02T05:00:00Z", notify_days: 60 }, now), true); // 만기 60일 전
  assert.equal(isDue({ ...base, done: true, event_at: "2026-11-05T05:00:00Z", notify_days: 1 }, now), false);
  assert.equal(isDue({ ...base, notified_at: "2026-11-03T23:00:00Z", event_at: "2026-11-05T05:00:00Z", notify_days: 1 }, now), false);
});

test("남은 날과 알림 문자", () => {
  assert.equal(daysLeft("2026-11-05T05:00:00Z", now), 1);
  const t = reminderText([
    { kind: "잔금", title: "백석동 84㎡", event_at: "2026-11-06T05:00:00Z", client_name: "김고객" },
    { kind: "임장", title: "마두동 빌라", event_at: "2026-11-04T05:30:00Z" },
  ], now);
  assert.equal(t, "[중개사무소 일정 알림]\n· [임장] 오늘 14:30 마두동 빌라\n· [잔금] 11. 6. 14:00(D-2) 백석동 84㎡ — 김고객");
});
