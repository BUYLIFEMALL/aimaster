// v1.09 키워드별 기회점수 추이·페이지 번호 단위 테스트(외부 API·DB 없음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildKeywordTrends, clampPage, TREND_MAX_POINTS } from "../lib/reportTrend.ts";

const r = (at, wl, items) => ({ generated_at: at, watchlist_id: wl, items });

test("키워드·카테고리별로 묶고, 같은 날은 마지막 값, 최신 점수 높은 순", () => {
  const trends = buildKeywordTrends([
    r("2026-10-03T00:00:00Z", "A", [{ keyword: "선풍기", opportunityScore: 70 }]),
    r("2026-10-01T00:00:00Z", "A", [{ keyword: "선풍기", opportunityScore: 40 }, { keyword: "히터", opportunityScore: 90 }]),
    r("2026-10-02T00:00:00Z", "A", [{ keyword: "선풍기", opportunityScore: 50.4 }]),
    r("2026-10-02T09:00:00Z", "A", [{ keyword: "선풍기", opportunityScore: 55 }]),
    r("2026-10-02T00:00:00Z", "B", [{ keyword: "선풍기", opportunityScore: 10 }]),
  ]);
  const fanA = trends.find(t => t.watchlistId === "A" && t.keyword === "선풍기");
  assert.deepEqual(fanA.points.map(p => p.score), [40, 55, 70]);
  assert.equal(fanA.first, 40); assert.equal(fanA.latest, 70); assert.equal(fanA.delta, 30);
  assert.equal(trends.filter(t => t.keyword === "선풍기").length, 2, "카테고리가 다르면 따로");
  assert.deepEqual(trends.map(t => t.latest), [90, 70, 10]);
});

test("깨진 항목은 무시하고, 점은 최근 30개까지", () => {
  const rows = Array.from({ length: 40 }, (_, i) => r(`2026-08-${String(i % 28 + 1).padStart(2, "0")}T00:00:00Z`.replace("2026-08", i < 28 ? "2026-08" : "2026-09"), "A", [{ keyword: "k", opportunityScore: i }]));
  const [t] = buildKeywordTrends([...rows, r("2026-10-01T00:00:00Z", "A", [null, { keyword: 1 }, { keyword: "x" }, { keyword: "y", opportunityScore: NaN }])]);
  assert.equal(t.points.length, TREND_MAX_POINTS);
  assert.equal(buildKeywordTrends([r("2026-10-01T00:00:00Z", "A", "깨짐")]).length, 0);
});

test("페이지 번호 정리", () => {
  assert.equal(clampPage(undefined, 5), 1);
  assert.equal(clampPage("abc", 5), 1);
  assert.equal(clampPage("0", 5), 1);
  assert.equal(clampPage("3", 5), 3);
  assert.equal(clampPage("2.7", 5), 2);
  assert.equal(clampPage("99", 5), 5);
  assert.equal(clampPage(["4", "1"], 5), 4);
  assert.equal(clampPage("3", 0), 1);
});
