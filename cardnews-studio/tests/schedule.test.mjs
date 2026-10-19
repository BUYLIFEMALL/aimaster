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

// v1.20 — 일시 오류만 한 번 다시 시도, 데이터형 카드 강조색은 테마 색을 따름
import { isTransientPublishError, RETRY_DELAY_MS } from "../src/lib/cardnews/schedule.ts";
import { dataAccent, DATA_ACCENTS, THEME_COLORS } from "../src/lib/cardnews/presets.ts";

test("다시 시도 판단: 일시 오류만 true", () => {
  for (const m of ["인스타그램 게시에 실패했습니다. Timeout", "인스타그램 미디어 처리가 너무 오래 걸려 게시를 중단했습니다.", "fetch failed", "Instagram/Facebook API 요청이 실패했습니다. (503)", "Service temporarily unavailable"]) {
    assert.equal(isTransientPublishError(m), true, m);
  }
  for (const m of ["인스타그램 연결이 만료되었습니다.", "Invalid OAuth access token", "인스타그램 미디어 처리에 실패했습니다. (ERROR)", "(#10) Application does not have permission", "Instagram/Facebook API 요청이 실패했습니다. (400)"]) {
    assert.equal(isTransientPublishError(m), false, m);
  }
  assert.equal(RETRY_DELAY_MS, 10 * 60 * 1000);
});

test("데이터형 카드 강조색: 모든 테마에 색이 있고 자동은 기존 주황", () => {
  for (const t of THEME_COLORS) {
    const a = DATA_ACCENTS[t.value];
    assert.ok(a, t.value);
    assert.match(a.main, /^#[0-9a-f]{6}$/i);
    assert.match(a.mainRgb, /^\d{1,3},\d{1,3},\d{1,3}$/);
  }
  assert.equal(dataAccent("auto").main, "#FF6B4A");
  assert.equal(dataAccent(undefined).main, "#FF6B4A");
  assert.equal(dataAccent("cool").main, "#38BDF8");
  assert.notEqual(dataAccent("cool").main, dataAccent("cool").alt);
});

// v1.21 — 다시 시도 전 같은 글이 이미 올라갔는지 확인
import { findSameRecentPost, DUPLICATE_WINDOW_MS } from "../src/lib/cardnews/schedule.ts";

test("중복 확인: 최근 1시간 안 같은 캡션만 이미 게시된 것으로 판단", () => {
  const now = Date.UTC(2026, 9, 19, 4, 0);
  const media = [
    { caption: "다른 글", timestamp: "2026-10-19T03:50:00+0000", permalink: "https://ig/a" },
    { caption: "청약 가점 정리\r\n#청약  ", timestamp: "2026-10-19T03:45:00+0000", permalink: "https://ig/b" },
    { caption: "오래된 같은 글", timestamp: "2026-10-19T02:30:00+0000", permalink: "https://ig/c" },
  ];
  assert.equal(findSameRecentPost(media, "청약 가점 정리\n#청약", now)?.permalink, "https://ig/b");
  assert.equal(findSameRecentPost(media, "오래된 같은 글", now), null);
  assert.equal(findSameRecentPost(media, "없는 글", now), null);
  assert.equal(findSameRecentPost(media, "   ", now), null);
  assert.equal(findSameRecentPost([], "청약 가점 정리", now), null);
  assert.equal(DUPLICATE_WINDOW_MS, 60 * 60 * 1000);
});

test("중복 확인 v1.22: 1차 실패 시각 − 10분 이후 글만 같은 글로 판단", () => {
  const now = Date.UTC(2026, 9, 19, 4, 0);
  const firstFailedAt = Date.UTC(2026, 9, 19, 3, 50); // 기준 = 03:40
  const media = [
    { caption: "같은 캡션", timestamp: "2026-10-19T03:30:00+0000", permalink: "https://ig/old" }, // 1시간 안이지만 1차 시도 전 → 다른 글
    { caption: "같은 캡션", timestamp: "2026-10-19T03:45:00+0000", permalink: "https://ig/new" },
  ];
  assert.equal(findSameRecentPost(media, "같은 캡션", now, firstFailedAt)?.permalink, "https://ig/new");
  assert.equal(findSameRecentPost([media[0]], "같은 캡션", now, firstFailedAt), null);
  assert.equal(findSameRecentPost([media[0]], "같은 캡션", now)?.permalink, "https://ig/old"); // 시각을 모르면 1시간 기준
  assert.equal(findSameRecentPost([media[0]], "같은 캡션", now, Date.UTC(2026, 9, 19, 1, 0))?.permalink, "https://ig/old"); // 1시간보다 넓히지 않음
});

// v1.23 — 지금 게시 실패 때: 버튼을 누른 시각 이후 같은 캡션만 이미 올라간 글로 본다(route가 startedAt + 여유를 넘김)
import { FIRST_ATTEMPT_MARGIN_MS } from "../src/lib/cardnews/schedule.ts";

test("즉시 게시 중복 확인: 누른 시각 이후 글만", () => {
  const startedAt = Date.UTC(2026, 9, 19, 5, 0);
  const now = startedAt + 2 * 60 * 1000;
  const before = { caption: "오늘의 카드", timestamp: "2026-10-19T04:59:00+0000", permalink: "https://ig/before" };
  const after = { caption: "오늘의 카드", timestamp: "2026-10-19T05:01:00+0000", permalink: "https://ig/after" };
  assert.equal(findSameRecentPost([before], "오늘의 카드", now, startedAt + FIRST_ATTEMPT_MARGIN_MS), null);
  assert.equal(findSameRecentPost([before, after], "오늘의 카드", now, startedAt + FIRST_ATTEMPT_MARGIN_MS)?.permalink, "https://ig/after");
});

// v1.24 — 24시간 넘게 밀린 예약은 올리지 않는다(지침 docs/SCHEDULER_POLICY.md)
test("isTooLate: 24시간이 넘게 지난 예약만 true", async () => {
  const { isTooLate, MAX_LATE_MS } = await import("../src/lib/cardnews/schedule.ts");
  const now = Date.parse("2026-10-20T00:00:00Z");
  assert.equal(isTooLate(new Date(now - MAX_LATE_MS - 1000).toISOString(), now), true);
  assert.equal(isTooLate(new Date(now - MAX_LATE_MS + 60_000).toISOString(), now), false);
  assert.equal(isTooLate(new Date(now + 60_000).toISOString(), now), false);
  assert.equal(isTooLate(null, now), false);
  assert.equal(isTooLate("잘못된 값", now), false);
});
