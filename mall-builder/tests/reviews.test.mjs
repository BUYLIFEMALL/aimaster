import { test } from "node:test";
import assert from "node:assert/strict";
import { canReview, groupFaqs, maskName, stars, validateAnswer, validateFaq, validateInquiry, validateReview } from "../src/lib/reviews.ts";

test("후기 입력 검사", () => {
  assert.match(validateReview({ rating: "0", body: "좋아요 정말" }).error, /별점/);
  assert.match(validateReview({ rating: "6", body: "좋아요 정말" }).error, /별점/);
  assert.match(validateReview({ rating: "3.5", body: "좋아요 정말" }).error, /별점/);
  assert.match(validateReview({ rating: "5", body: " 좋아 " }).error, /5자 이상/);
  assert.match(validateReview({ rating: "5", body: "가".repeat(2001) }).error, /2,000자/);
  assert.deepEqual(validateReview({ rating: "4", body: " 아주 좋은\r\n상품 " }).value, { rating: 4, body: "아주 좋은\n상품" });
});

test("문의 입력 검사", () => {
  assert.match(validateInquiry({ title: " ", body: "내용", secret: null }).error, /제목/);
  assert.match(validateInquiry({ title: "가".repeat(101), body: "내용", secret: null }).error, /100자/);
  assert.match(validateInquiry({ title: "제목", body: "", secret: null }).error, /내용을 넣어/);
  assert.match(validateInquiry({ title: "제목", body: "가".repeat(2001), secret: null }).error, /2,000자/);
  assert.deepEqual(validateInquiry({ title: " 배송 ", body: "언제?", secret: "on" }).value, { title: "배송", body: "언제?", is_secret: true });
  assert.equal(validateInquiry({ title: "a", body: "b", secret: null }).value.is_secret, false);
});

test("답변·FAQ 입력 검사", () => {
  assert.equal(validateAnswer("  ", 3000).value, null);
  assert.equal(validateAnswer(" 내일 발송 ", 3000).value, "내일 발송");
  assert.match(validateAnswer("가".repeat(2001), 2000).error, /2,000자/);
  assert.match(validateFaq({ category: "", question: "", answer: "a", sort: 0, published: "on" }).error, /질문/);
  assert.match(validateFaq({ category: "가".repeat(21), question: "q", answer: "a", sort: 0, published: "on" }).error, /분류/);
  assert.match(validateFaq({ category: "", question: "q", answer: "", sort: 0, published: "on" }).error, /답변/);
  assert.match(validateFaq({ category: "", question: "q", answer: "a", sort: "x", published: "on" }).error, /순서/);
  assert.deepEqual(validateFaq({ category: " 배송 ", question: "얼마나 걸리나요", answer: "2일", sort: "3", published: null }).value,
    { category: "배송", question: "얼마나 걸리나요", answer: "2일", sort: 3, is_published: false });
});

test("표시 도우미", () => {
  assert.equal(stars(4), "★★★★☆");
  assert.equal(stars(0), "☆☆☆☆☆");
  assert.equal(maskName("김철수"), "김**");
  assert.equal(maskName("  "), "손님");
  assert.equal(canReview("delivered", 2, 0, "p"), true);
  assert.equal(canReview("confirmed", 2, 2, "p"), false);
  assert.equal(canReview("paid", 1, 0, "p"), false);
  assert.equal(canReview("delivered", 1, 0, null), false);
  assert.deepEqual(groupFaqs([{ category: "", q: 1 }, { category: "배송", q: 2 }, { category: "", q: 3 }]).map((g) => [g.category, g.items.length]), [["일반", 2], ["배송", 1]]);
});
