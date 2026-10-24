import test from "node:test";
import assert from "node:assert/strict";
import { keywordGrade, sortMetrics, surge, fillDays, judgeFresh, postedWithinDays, pickNewPosts, splitTopics, JUDGE_REUSE_MS } from "../src/lib/kw/grade.ts";
import { toMarkdown, toCsv } from "../src/lib/kw/export.ts";
import { FEATURE_INFO, isFeature } from "../src/lib/kw/types.ts";
import { judgePrompt, discoverSeedPrompt } from "../src/lib/kw/prompts.ts";

// 블로그 병합 묶음 C(2026-10-24): 작업실 등급·급상승 규칙 이관 + 도톨이 N8·N9 순수 함수.
test("C: 등급 경계 — 작업실과 같은 기준", () => {
  assert.equal(keywordGrade(50, 10).grade, "검색 적음");
  assert.equal(keywordGrade(1000, null).grade, "일반");
  assert.equal(keywordGrade(1000, 9_999).grade, "골드");
  assert.equal(keywordGrade(999, 5_000).grade, "실버"); // 검색 1,000 미만이면 비율이 작아도 골드 아님
  assert.equal(keywordGrade(1000, 29_999).grade, "실버");
  assert.equal(keywordGrade(1000, 149_999).grade, "일반");
  assert.equal(keywordGrade(1000, 150_000).grade, "경쟁");
  const sorted = sortMetrics([
    { keyword: "a", pc: 0, mobile: 0, total: 500, docs: 1, ratio: 0, grade: "실버", compIdx: null },
    { keyword: "b", pc: 0, mobile: 0, total: 9000, docs: 1, ratio: 0, grade: "골드", compIdx: null },
    { keyword: "c", pc: 0, mobile: 0, total: 900, docs: 1, ratio: 0, grade: "실버", compIdx: null },
  ]);
  assert.deepEqual(sorted.map((m) => m.keyword), ["b", "c", "a"]);
});

test("C: 급상승 판정 — 최근 3일 +50%·2일 이상·마지막 날 초과", () => {
  assert.equal(surge([1, 1, 1]).change, null);
  assert.equal(surge([10, 10, 10, 10, 10, 10, 10, 20, 20, 20]).surging, true);
  assert.equal(surge([10, 10, 10, 10, 10, 10, 10, 20, 20, 9]).surging, false); // 마지막 날이 낮음
  assert.equal(surge([10, 10, 10, 10, 10, 10, 10, 13, 13, 13]).surging, false); // +30%
  const start = new Date("2026-10-01T00:00:00Z");
  const filled = fillDays([{ period: "2026-10-01", ratio: 5 }, { period: "2026-10-03", ratio: 7 }], start, 16);
  assert.deepEqual(filled, [5, 0, 7]); // 집계된 마지막 날까지만
});

test("C N9: 주제 판정 6시간 재사용", () => {
  const now = Date.parse("2026-10-24T12:00:00Z");
  assert.equal(judgeFresh(new Date(now - JUDGE_REUSE_MS + 60_000).toISOString(), now), true);
  assert.equal(judgeFresh(new Date(now - JUDGE_REUSE_MS - 1).toISOString(), now), false);
  assert.equal(judgeFresh(undefined, now), false);
  assert.equal(judgeFresh("2026-10-24T13:00:00Z", now), false); // 미래 시각은 쓰지 않음
  const p = judgePrompt(["캠핑"], ["캠핑 의자", "캠핑카 대여"]);
  assert.match(p.user, /1\. 캠핑 의자/);
  assert.match(discoverSeedPrompt(["캠핑"]).system, /2026년|20\d\d년/);
});

test("C N8: 최근 7일 활동·새 글만 고르기", () => {
  const now = new Date("2026-10-24T03:00:00Z"); // 한국 2026-10-24 12시
  assert.equal(postedWithinDays("20261024", 7, now), true);
  assert.equal(postedWithinDays("20261017", 7, now), true);
  assert.equal(postedWithinDays("20261016", 7, now), false);
  assert.equal(postedWithinDays("", 7, now), false);
  const posts = [{ logNo: "5" }, { logNo: "4" }, { logNo: "3" }];
  assert.deepEqual(pickNewPosts(posts, ["4", "3"]).map((p) => p.logNo), ["5"]);
  assert.deepEqual(pickNewPosts(posts, undefined, 2).map((p) => p.logNo), ["5", "4"]);
  assert.deepEqual(pickNewPosts(posts, ["5", "4", "3"]), []);
  assert.deepEqual(splitTopics("캠핑, 차박 ,캠핑,  , 글램핑, 낚시"), ["캠핑", "차박", "글램핑"]);
});

test("C: 새 분석 3종 등록·내보내기", () => {
  for (const id of ["discover", "surge", "benchmark"]) { assert.equal(isFeature(id), true); assert.ok(FEATURE_INFO.find((f) => f.id === id)); }
  const metric = { keyword: "캠핑 의자", pc: 100, mobile: 900, total: 1000, docs: null, ratio: null, grade: "일반", compIdx: "높음" };
  const d = { kind: "discover", keyword: "캠핑", mode: "topic", candidates: [{ ...metric, reason: "이유", source: "AI 후보" }], judged: null, notes: [] };
  assert.match(toMarkdown(d), /값 없음/);
  assert.match(toCsv(d), /캠핑 의자/);
  const s = { kind: "surge", keyword: "전기차", sources: [{ kind: "뉴스", title: "t", link: "https://a.com", date: "" }], summary: "요약", terms: [{ term: "보조금", why: "w", series: [], change: 0.6, surging: true, metric: null }], notes: [] };
  assert.match(toMarkdown(s), /급상승 \*\*보조금\*\* — 최근 3일 변화 \+60%/);
  const b = { kind: "benchmark", keyword: "홈카페", blogs: [{ blogId: "abc", name: "블로그", hits: 3, sample: "s", recent: true }], analyses: [], watch: ["abc"] };
  assert.match(toMarkdown(b), /⭐ 블로그 \(abc\) · 검색 3건 · 최근 7일 활동/);
  assert.equal(toCsv(b).split("\r\n").length, 1);
});
