// U10: 게시글 → 업무 워크스페이스 받은 업무 내용(순수 함수). 실행: npm run test:work-inbox
import test from "node:test";
import assert from "node:assert/strict";
import { instaPostInboxContent, kstDate } from "../src/lib/posts/workInboxContent.ts";

test("한국 시간 날짜: UTC 15시 이후는 다음 날", () => {
  assert.equal(kstDate("2026-11-05T15:30:00.000Z"), "2026-11-06");
  assert.equal(kstDate("2026-11-05T14:59:00.000Z"), "2026-11-05");
  assert.equal(kstDate(null), null);
});

test("게시 완료 글: 제목은 캡션 첫 줄, 캘린더 데이터에 채널·상태·발행일·발행 주소", () => {
  const c = instaPostInboxContent({
    id: "p1",
    caption: "  \n신제품 소개합니다!\n두 번째 줄",
    hashtags: ["신제품", "#런칭"],
    status: "published",
    scheduled_at: null,
    published_at: "2026-11-05T09:30:00.000Z",
    ig_permalink: "https://www.instagram.com/p/x/",
    post_type: "feed",
    created_at: "2026-11-04T00:00:00.000Z",
  });
  assert.equal(c.title, "신제품 소개합니다!");
  assert.deepEqual(c.data, { 채널: "인스타그램", 상태: "published", 발행일: "2026-11-05", "발행 주소": "https://www.instagram.com/p/x/" });
  assert.match(c.bodyMd, /^신제품 소개합니다!\n두 번째 줄\n\n#신제품 #런칭\n\n---\n\n## 발행 정보\n- 상태: 게시 완료\n- 발행일: 2026-11-05\n- 발행 주소: https:\/\/www\.instagram\.com\/p\/x\/$/);
});

test("예약 카드뉴스: [카드뉴스] 머리말, 예약일만, 캡션 없으면 제목 대체", () => {
  const c = instaPostInboxContent({ id: "p2", caption: "", hashtags: null, status: "scheduled", scheduled_at: "2026-11-10T01:00:00.000Z", published_at: null, ig_permalink: null, post_type: "card_news", created_at: "2026-11-04T00:00:00.000Z" });
  assert.equal(c.title, "[카드뉴스] 제목 없는 게시글");
  assert.deepEqual(c.data, { 채널: "인스타그램", 상태: "scheduled", 예약일: "2026-11-10" });
  assert.match(c.bodyMd, /\(캡션 없음\)/);
  assert.doesNotMatch(c.bodyMd, /발행 주소/);
});

test("초안: 날짜가 없어 캘린더 키(발행일·예약일) 없음 — 받은 업무에는 문서로만", () => {
  const c = instaPostInboxContent({ id: "p3", caption: "x".repeat(80), hashtags: [], status: "draft", scheduled_at: null, published_at: null, ig_permalink: null, created_at: "2026-11-04T00:00:00.000Z" });
  assert.equal(c.title.length, 60);
  assert.deepEqual(Object.keys(c.data), ["채널", "상태"]);
});
