import { test } from "node:test";
import assert from "node:assert/strict";
import { priceRank, rankLabel, recentMonths, volumeMonthsToFetch, volumeTrend } from "../src/lib/realestate/insights.ts";

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

test("A2 거래량: 지난달이 직전 3개월 평균 ×1.3 이상·10건 이상이면 증가, 이번 달은 비교 안 함", () => {
  const now = new Date("2026-11-02T03:00:00Z");
  assert.deepEqual(recentMonths(now, 5), ["202611", "202610", "202609", "202608", "202607"]);
  const t = volumeTrend({ 202611: 3, 202610: 40, 202609: 28, 202608: 30, 202607: 32 }, now);
  assert.deepEqual(t, { ym: "202610", last: 40, avg: 30, rising: true });
  assert.equal(volumeTrend({ 202610: 8, 202609: 5, 202608: 5, 202607: 5 }, now).rising, false, "10건 미만");
  assert.equal(volumeTrend({ 202610: 35, 202609: 30, 202608: 30, 202607: 30 }, now).rising, false, "30% 미만");
  assert.equal(volumeTrend({ 202610: 40, 202609: 28 }, now), null, "비교할 달이 모자람");
});

test("A2 거래량: 지난 달은 한 번만, 최근 두 달은 하루 지나면 다시", () => {
  const now = new Date("2026-11-02T03:00:00Z");
  const old = "2026-11-01T00:00:00Z";
  const fresh = "2026-11-02T01:00:00Z";
  assert.deepEqual(volumeMonthsToFetch({}, now), ["202611", "202610", "202609", "202608", "202607"]);
  assert.deepEqual(volumeMonthsToFetch({ 202611: old, 202610: fresh, 202609: old, 202608: old, 202607: old }, now), ["202611"]);
});
