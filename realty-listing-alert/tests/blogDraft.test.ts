// 연계 I: 단지 시세 요약 → 블로그 글쓰기 주제·키워드(2026-10-29)
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBlogDraft, buildBlogDraftLink, BLOG_WRITE_URL } from "../lib/blogDraft.ts";

const stat = { name: "백송마을5단지", total: 42, events: { new: 3, priceDown: 2, priceUp: 0, gone: 1 }, saleAvg: 42000, saleN: 20, jeonseAvg: 25500, tradeGapAvg: 4 };
const NOW = new Date("2026-10-29T12:00:00+09:00");

test("주제: 당해 연도·월, 단지 이름, 요약 숫자", () => {
  const { topic, keywords } = buildBlogDraft(stat, NOW);
  assert.equal(topic, "2026년 10월 백송마을5단지 아파트 매물 시세 — 매매 평균 4억 2,000만 원, 전세 평균 2억 5,500만 원, 실거래 대비 +4%, 새 매물 3건·가격 내림 2건");
  assert.deepEqual(keywords, ["백송마을5단지", "백송마을5단지 시세", "백송마을5단지 매매", "2026 아파트 시세"]);
});

test("숫자가 없으면 주제만, 120자를 넘으면 자름", () => {
  const empty = buildBlogDraft({ ...stat, saleAvg: null, saleN: 0, jeonseAvg: null, tradeGapAvg: null, events: { new: 0, priceDown: 0, priceUp: 0, gone: 0 } }, NOW);
  assert.equal(empty.topic, "2026년 10월 백송마을5단지 아파트 매물 시세");
  const long = buildBlogDraft({ ...stat, name: "가".repeat(150) }, NOW);
  assert.ok(long.topic.length <= 120 && long.topic.endsWith("…"));
});

test("전화번호처럼 보이는 숫자는 넘기지 않음", () => {
  const { topic, keywords } = buildBlogDraft({ ...stat, name: "백송마을 010-1234-5678" }, NOW);
  assert.equal(/010|1234|5678/.test(topic + keywords.join()), false);
});

test("링크: 블로그 글쓰기 주소 + topic·keywords 인코딩", () => {
  const url = new URL(buildBlogDraftLink(stat, NOW));
  assert.equal(url.origin + url.pathname, BLOG_WRITE_URL);
  assert.ok(url.searchParams.get("topic")!.startsWith("2026년 10월 백송마을5단지"));
  assert.equal(url.searchParams.get("keywords")!.split(",")[0], "백송마을5단지");
});

// v1.37 추가개선 5·6·7
import { buildWeeklyDraft, buildWeeklyDraftLink, DRAFT_TARGETS, isDraftTarget, noTradeDays } from "../lib/blogDraft.ts";

const ev = (n: number, d: number, u = 0, g = 0) => ({ new: n, priceDown: d, priceUp: u, gone: g });
const HIST = [
  { at: "2026-10-18T10:00:00Z", complexes: [{ name: "제외단지", events: ev(9, 9) }] }, // 기간 밖
  { at: "2026-10-20T10:00:00Z", complexes: [{ name: "백송건영", events: ev(3, 1) }, { name: "백송대림", events: ev(2, 0) }] },
  { at: "2026-10-23T10:00:00Z", complexes: [{ name: "백송건영", events: ev(1, 2, 1) }, { name: "흰돌6단지", events: ev(0, 1, 0, 2) }] },
  { at: "2026-10-26T10:00:00Z", complexes: [{ name: "백송대림 010-1111-2222", events: ev(1, 0) }] },
];

test("주간 동향: 기간 안 기록만 더하고 단지 2곳 + 외 n곳", () => {
  const d = buildWeeklyDraft(HIST, "2026-10-20", "2026-10-26", NOW)!;
  assert.equal(d.topic, "2026년 10월 20일~26일 백송건영·백송대림 외 1곳 아파트 매물 주간 동향 — 새 매물 7건, 가격 내림 4건, 가격 오름 1건, 목록에서 내려감 2건");
  assert.deepEqual(d.keywords, ["백송건영", "백송대림", "흰돌6단지", "2026 아파트 주간 시세"]);
  assert.equal(/010|1111|2222|제외단지/.test(d.topic + d.keywords.join()), false);
});

test("주간 동향: 달이 바뀌면 두 달 표기, 기간 안 기록 없으면 null", () => {
  const d = buildWeeklyDraft([{ at: "2026-11-02T01:00:00Z", complexes: [{ name: "A단지", events: ev(1, 0) }] }], "2026-10-28", "2026-11-03", NOW)!;
  assert.ok(d.topic.startsWith("2026년 10월 28일~11월 3일 A단지 아파트 매물 주간 동향"));
  assert.equal(buildWeeklyDraft(HIST, "2026-09-01", "2026-09-07", NOW), null);
  assert.equal(buildWeeklyDraftLink(HIST, "2026-09-01", "2026-09-07", NOW), null);
});

test("갈 곳 고르기: 티스토리 주소, 잘못된 값은 거름", () => {
  const url = new URL(buildBlogDraftLink(stat, NOW, "tistory"));
  assert.equal(url.origin + url.pathname, DRAFT_TARGETS.tistory.url);
  assert.equal(url.searchParams.get("keywords")!.split(",")[0], "백송마을5단지");
  const w = new URL(buildWeeklyDraftLink(HIST, "2026-10-20", "2026-10-26", NOW, "tistory")!);
  assert.equal(w.origin, "https://tistory-auto-blog.buylife.xyz");
  assert.equal(isDraftTarget("tistory"), true);
  assert.equal(isDraftTarget("naver"), false);
});

test("실거래 신고 없음: 2일째부터 날수, 하루·없음·이상한 값은 null", () => {
  const now = new Date("2026-10-29T12:00:00Z");
  assert.equal(noTradeDays("2026-10-29T01:00:00Z", now), null); // 1일째
  assert.equal(noTradeDays("2026-10-28T20:00:00Z", now), null); // 아직 24시간 안
  assert.equal(noTradeDays("2026-10-27T10:00:00Z", now), 3);
  assert.equal(noTradeDays(undefined, now), null);
  assert.equal(noTradeDays("x", now), null);
});
