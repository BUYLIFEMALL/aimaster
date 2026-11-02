import { test } from "node:test";
import assert from "node:assert/strict";
import { priceRank, rankLabel, recentMonths, sumCompleteTypes, volumeMonthsToFetch, volumeTrend } from "../src/lib/realestate/insights.ts";

test("A2 최고가·최저가: 비교 3건 이상, 모두보다 높거나 낮을 때만", () => {
  assert.equal(priceRank(110000, [90000, 100000, 105000]), "high");
  assert.equal(priceRank(80000, [90000, 100000, 105000]), "low");
  assert.equal(priceRank(100000, [90000, 100000, 105000]), null, "같은 값이면 최고가 아님");
  assert.equal(priceRank(110000, [90000, 100000]), null, "2건이면 표시 안 함");
  assert.equal(priceRank(null, [1, 2, 3]), null);
  assert.equal(priceRank(110000, [0, NaN, 90000, 100000]), null, "0·빈 값은 표본에서 뺌");
  assert.equal(rankLabel("high"), "📈 보유 자료 12개월 최고가");
  assert.equal(rankLabel(null), null);
});

test("A2 거래량: 신고가 끝난 달(2달 전)을 그 전 3개월과 비교, 이번 달·지난달은 비교 안 함", () => {
  const now = new Date("2026-11-02T03:00:00Z");
  assert.deepEqual(recentMonths(now, 6), ["202611", "202610", "202609", "202608", "202607", "202606"]);
  const t = volumeTrend({ 202611: 3, 202610: 12, 202609: 40, 202608: 28, 202607: 30, 202606: 32 }, now);
  assert.deepEqual(t, { ym: "202609", last: 40, avg: 30, rising: true });
  assert.equal(volumeTrend({ 202609: 8, 202608: 5, 202607: 5, 202606: 5 }, now).rising, false, "10건 미만");
  assert.equal(volumeTrend({ 202609: 35, 202608: 30, 202607: 30, 202606: 30 }, now).rising, false, "30% 미만");
  assert.equal(volumeTrend({ 202609: 40, 202608: 28 }, now), null, "비교할 달이 모자람");
});

test("A2 거래량: 비교할 4개월이 다 모인 유형만 더한다", () => {
  const now = new Date("2026-11-02T03:00:00Z");
  const full = { 202609: 10, 202608: 10, 202607: 10, 202606: 10, 202610: 5 };
  const r = sumCompleteTypes({ 아파트: full, 빌라: { 202609: 3 } }, now);
  assert.deepEqual(r.types, ["아파트"]);
  assert.equal(r.months["202609"], 10, "빌라 반쪽 자료는 더하지 않음");
  assert.deepEqual(sumCompleteTypes({ 아파트: full, 빌라: full }, now).months["202610"], 10);
});

test("A2 거래량: 지난 달은 한 번만, 최근 세 달은 하루 지나면 다시", () => {
  const now = new Date("2026-11-02T03:00:00Z");
  const old = "2026-11-01T00:00:00Z";
  const fresh = "2026-11-02T01:00:00Z";
  assert.deepEqual(volumeMonthsToFetch({}, now), ["202611", "202610", "202609", "202608", "202607", "202606"]);
  assert.deepEqual(volumeMonthsToFetch({ 202611: old, 202610: fresh, 202609: old, 202608: old, 202607: old, 202606: old }, now), ["202611", "202609"]);
});
