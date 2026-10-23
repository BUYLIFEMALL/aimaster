import { test } from "node:test";
import assert from "node:assert/strict";
import { quoteInText, copiesSource, filterPoints, approvalHash, isApproved } from "../lib/grounding.ts";
import { factRule, groundingSection } from "../lib/ai/groundingPrompt.ts";

const sources = [
  { n: 1, kind: "blog", title: "가을 캠핑 준비", link: "https://blog.naver.com/a/1", text: "가을 캠핑은 일교차가 커서 침낭을 영하 5도 기준으로 고르는 것이 좋습니다.", ok: true },
  { n: 2, kind: "news", title: "캠핑장 예약 증가", link: "https://news.example/2", text: "올해 10월 캠핑장 예약이 지난해보다 늘었다.", ok: true },
];

test("BLC-08a: quote must exist in the cited source; 25-char verbatim copy is detected", () => {
  assert.equal(quoteInText("침낭을 영하 5도", sources[0].text), true);
  assert.equal(quoteInText("침낭을 영하 10도", sources[0].text), false);
  assert.equal(quoteInText("침낭", sources[0].text), false, "too short");
  assert.equal(copiesSource("가을 캠핑은 일교차가 커서 침낭을 영하 5도 기준으로 고르는 것이 좋습니다.", [sources[0].text]), true);
  assert.equal(copiesSource("일교차가 큰 계절에는 따뜻한 침낭을 챙기세요.", [sources[0].text]), false);
});

test("BLC-08a: filterPoints keeps only grounded, non-copied points with a real source number", () => {
  const raw = [
    { text: "가을에는 일교차를 생각해 따뜻한 침낭을 고릅니다.", source: 1, quote: "침낭을 영하 5도" },
    { text: "캠핑장 예약이 늘었다는 소식이 있습니다.", source: 2, quote: "캠핑장 예약이" },
    { text: "없는 자료를 가리킨 항목", source: 9, quote: "침낭을 영하 5도" },
    { text: "인용이 원문에 없는 항목", source: 1, quote: "텐트는 4인용이" },
    { text: "가을 캠핑은 일교차가 커서 침낭을 영하 5도 기준으로 고르는 것이 좋습니다.", source: 1, quote: "침낭을 영하 5도" },
    "문자열 항목",
  ];
  const { points, dropped } = filterPoints(raw, sources);
  assert.equal(points.length, 2);
  assert.equal(dropped, 4);
  assert.ok(points.every((p) => p.kept));
});

test("BLC-08a: approval hash follows kept points; any change after approval invalidates it", () => {
  const points = filterPoints([{ text: "가을에는 따뜻한 침낭을 고릅니다.", source: 1, quote: "침낭을 영하 5도" }, { text: "캠핑장 예약이 늘었습니다.", source: 2, quote: "캠핑장 예약이" }], sources).points;
  const hash = approvalHash(points);
  assert.equal(isApproved({ points, approved_at: "2026-10-22T00:00:00Z", approval_hash: hash }), true);
  assert.equal(isApproved({ points, approved_at: null, approval_hash: hash }), false, "not approved");
  const edited = points.map((p, i) => i === 0 ? { ...p, text: p.text + " 바뀜" } : p);
  assert.equal(isApproved({ points: edited, approved_at: "2026-10-22T00:00:00Z", approval_hash: hash }), false, "edited after approval");
  const none = points.map((p) => ({ ...p, kept: false }));
  assert.equal(isApproved({ points: none, approved_at: "2026-10-22T00:00:00Z", approval_hash: approvalHash(none) }), false, "nothing kept");
});

test("BLC-08a: without grounding the fact rule is byte-identical to v1.83; grounding section is empty", () => {
  assert.equal(factRule(["2026"], false), "7. 실시간 검색·뉴스·공식 자료가 제공되지 않았으므로 최신 수치, 정책, 순위, 연도별 사실을 지어내지 마세요. 사용자가 직접 제시한 연도(2026) 외의 연도는 제목과 본문에 쓰지 마세요. 최신성 검증이 필요한 내용은 [확인 필요]로 표시합니다.");
  assert.equal(factRule([], false).includes("연도(없음)"), true);
  assert.equal(groundingSection(undefined), "");
  assert.equal(groundingSection({ keyword: "x", points: [] }), "");
  const g = groundingSection({ keyword: "캠핑", points: [{ text: "따뜻한 침낭", source: 1, quote: "침낭을", title: "가을 캠핑 준비", link: "" }] });
  assert.match(g, /승인한 근거/);
  assert.match(factRule([], true), /승인한 근거 목록/);
});

test("BLC-08a: withApproval marks an approved-then-edited record invalid for the screen", async () => {
  const { withApproval } = await import("../lib/grounding.ts");
  const points = filterPoints([{ text: "가을에는 따뜻한 침낭을 고릅니다.", source: 1, quote: "침낭을 영하 5도" }], sources).points;
  const ok = withApproval({ id: "r1", points, approved_at: "2026-10-22T00:00:00Z", approval_hash: approvalHash(points) });
  assert.equal(ok.approval_valid, true);
  assert.equal(ok.id, "r1");
  const edited = withApproval({ ...ok, points: points.map((p) => ({ ...p, text: p.text + "!" })) });
  assert.equal(edited.approval_valid, false);
  assert.equal(withApproval({ points: [], approved_at: null, approval_hash: null }).approval_valid, false);
});
