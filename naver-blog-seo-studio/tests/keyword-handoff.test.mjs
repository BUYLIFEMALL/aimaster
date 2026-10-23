import test from "node:test";
import assert from "node:assert/strict";
import { judgeHandoff, handoffIdFromHash, titleSeed, isReportId, HANDOFF_DAYS } from "../lib/keywordEvidence.ts";

// BLC-11: 키워드 도구 기록을 넘겨받는 판정 규칙
const ME = "11111111-1111-1111-1111-111111111111";
const ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const NOW = new Date("2026-10-22T00:00:00Z");
const row = (over = {}) => ({ id: ID, user_id: ME, feature: "competition", keyword: "캠핑 의자", created_at: "2026-10-20T00:00:00Z", result: {
  kind: "competition", keyword: "캠핑 의자", opportunityScore: 72, searchInterestIndex: 0, competitionIndex: 40, competitionLevel: "보통", documentCount: "약 12만 건(추정)",
  strategy: { expandedKeywords: ["캠핑 의자 추천", "경량 캠핑 의자", "캠핑 의자"], blogTopics: [{ title: "경량 캠핑 의자 고르는 법" }] },
  real: { monthlyTotal: 0, blogDocTotal: 120345, trend: [], notes: ["검색광고 키가 없어 PC·모바일 구분은 비었습니다."] },
}, ...over });

test("남의 기록과 없는 기록은 같은 404로 거절한다", () => {
  assert.deepEqual(judgeHandoff(row({ user_id: "22222222-2222-2222-2222-222222222222" }), ME, NOW).status, 404);
  assert.equal(judgeHandoff(null, ME, NOW).status, 404);
});

test("만든 지 30일이 지나면 410으로 거절하고, 안이면 만료일을 알려 준다", () => {
  assert.equal(HANDOFF_DAYS, 30);
  assert.equal(judgeHandoff(row({ created_at: "2026-09-22T00:00:00Z" }), ME, NOW).status, 410);
  const ok = judgeHandoff(row({ created_at: "2026-09-22T00:00:01Z" }), ME, NOW);
  assert.equal(ok.ok, true);
  assert.equal(ok.evidence.expiresAt, "2026-10-22T00:00:01.000Z");
  assert.equal(ok.evidence.daysLeft, 1);
  assert.equal(judgeHandoff(row({ feature: "unknown" }), ME, NOW).status, 422);
});

test("실측 0은 값으로 남기고, 없는 값은 0으로 바꾸지 않고 값 없음으로 둔다", () => {
  const { evidence } = judgeHandoff(row(), ME, NOW);
  const total = evidence.measured.find((item) => item.label.startsWith("월간 검색수(PC+모바일)"));
  assert.equal(total.value, 0);
  assert.equal(total.source, "네이버 검색광고 키워드도구");
  assert.equal(evidence.measured.find((item) => item.label === "블로그 총 문서 수").value, 120345);
  assert.deepEqual(evidence.missing, ["최근 검색 지수"]);
  assert.ok(!evidence.measured.some((item) => item.label.includes("PC)")));
  assert.equal(evidence.notes.length, 1);
});

test("AI 추정 값은 실측과 따로 담고, 섞인 문서 수 문자열은 쓰지 않는다", () => {
  const { evidence } = judgeHandoff(row(), ME, NOW);
  assert.deepEqual(evidence.estimated.map((item) => item.label), ["기회 점수", "검색 관심도", "경쟁도", "경쟁 수준"]);
  assert.equal(evidence.estimated[1].value, 0);
  assert.ok(!JSON.stringify(evidence).includes("12만"));
  assert.deepEqual(evidence.candidates, ["캠핑 의자 추천", "경량 캠핑 의자"]); // 주 키워드와 겹치는 것 제외
  assert.deepEqual(evidence.titles, ["경량 캠핑 의자 고르는 법"]);
});

test("실측이 없는 종류는 실측 칸을 비우고, 키워드가 없으면 첫 후보를 쓴다", () => {
  const { evidence } = judgeHandoff(row({ feature: "recommend", keyword: "", result: { kind: "recommend", items: [{ keyword: "청년 월세 지원", title: "2026 청년 월세 지원 총정리" }, { keyword: "근로장려금" }] } }), ME, NOW);
  assert.equal(evidence.keyword, "청년 월세 지원");
  assert.deepEqual(evidence.measured, []);
  assert.deepEqual(evidence.missing, []);
  assert.deepEqual(evidence.candidates, ["근로장려금"]);
});

test("주소 해시에서 기록 번호만 꺼내고, 제목 추천 칸 값을 만든다", () => {
  assert.equal(handoffIdFromHash(`#title&keyword-report=${ID.toUpperCase()}`), ID);
  assert.equal(handoffIdFromHash("#title&keyword-report=캠핑"), null);
  assert.equal(handoffIdFromHash("#title"), null);
  assert.equal(isReportId("1; drop table"), false);
  assert.deepEqual(titleSeed({ keyword: "캠핑 의자", candidates: ["a", "b", "c", "d", "e"] }), { topic: "캠핑 의자", keywords: "캠핑 의자, a, b, c, d" });
});

test("v2.03: 즐겨찾기 기록은 30일이 지나도 받고 만료일을 두지 않는다", () => {
  const old = judgeHandoff(row({ created_at: "2026-01-01T00:00:00Z", favorite: true }), ME, NOW);
  assert.equal(old.ok, true);
  assert.equal(old.evidence.expiresAt, null);
  assert.equal(old.evidence.daysLeft, null);
  assert.equal(old.evidence.favorite, true);
  assert.equal(judgeHandoff(row({ created_at: "2026-01-01T00:00:00Z", favorite: false }), ME, NOW).status, 410);
  assert.equal(judgeHandoff(row({ favorite: true, user_id: "22222222-2222-2222-2222-222222222222" }), ME, NOW).status, 404);
});
