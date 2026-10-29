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
