// 2단계 판정 함수 시험 — node --test tests/stage2.test.ts (Node 24 타입 제거 실행)
import { test } from "node:test";
import assert from "node:assert/strict";
import { COLLECT_INTERVAL_OPTIONS, isCollectDue, isValidInterval, isWithinActiveHours } from "../lib/schedule.ts";
import { optionalNumber, parseComplexNo } from "../lib/targets.ts";

test("수집 간격 목록: 1~24시간 24개(10~50분 없음)", () => {
  assert.equal(COLLECT_INTERVAL_OPTIONS.length, 24);
  assert.ok([60, 180, 1440].every(isValidInterval));
  assert.ok(![0, 15, 90, 1500].some(isValidInterval));
  assert.ok(![10, 20, 30, 40, 50].some(isValidInterval));
});

test("동작 시간대: 종일·낮·자정 넘김", () => {
  assert.ok(isWithinActiveHours(3, null, null));
  assert.ok(isWithinActiveHours(10, 9, 22) && !isWithinActiveHours(22, 9, 22) && !isWithinActiveHours(8, 9, 22));
  assert.ok(isWithinActiveHours(23, 22, 6) && isWithinActiveHours(2, 22, 6) && !isWithinActiveHours(12, 22, 6));
  assert.ok(isWithinActiveHours(5, 7, 7));
});

test("수집 차례 판정", () => {
  const now = new Date("2026-10-25T12:00:00Z");
  assert.ok(isCollectDue(null, 180, now));
  assert.ok(isCollectDue("2026-10-25T09:00:00Z", 180, now));
  assert.ok(!isCollectDue("2026-10-25T09:01:00Z", 180, now));
});

test("단지 주소 → 단지 번호", () => {
  assert.equal(parseComplexNo("10981"), "10981");
  assert.equal(parseComplexNo("https://new.land.naver.com/complexes/10981?ms=2APtmc,3z9JCP,17&a=APT:ABYG:JGC&e=RETAIL"), "10981");
  assert.equal(parseComplexNo("new.land.naver.com/complexes/111515"), "111515");
  assert.equal(parseComplexNo("https://fin.land.naver.com/complexes/10981"), "10981");
  assert.equal(parseComplexNo("https://evil.example.com/complexes/10981"), null);
  assert.equal(parseComplexNo("https://new.land.naver.com/articles/123"), null);
  assert.equal(parseComplexNo("abc"), null);
});

test("가격·면적 입력", () => {
  assert.equal(optionalNumber(""), null);
  assert.equal(optionalNumber("39,800"), 39800);
  assert.equal(optionalNumber("-1"), undefined);
  assert.equal(optionalNumber("abc"), undefined);
});
