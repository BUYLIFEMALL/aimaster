import { test } from "node:test";
import assert from "node:assert/strict";
import { buildInquiryPrompt, cleanInquiryDraft, InquiryDraftSchema } from "../src/lib/aiInquiry.ts";

const facts = (o = {}) => ({
  kind: "product", title: "대량 구매 가능한가요?", body: "100박스 주문하면 언제 받을 수 있나요?", storeName: "가나몰",
  product: { name: "A4 복사지", summary: "80g 500매", description: "사무용", price: 25000 },
  order: null, faqs: [{ question: "배송은 며칠?", answer: "결제 후 1~2일" }], shipping: ["기본: 3만원 이상 무료"], ...o,
});

test("프롬프트: 연도·약속 금지·자료가 들어가고 손님 개인정보 칸은 없다", () => {
  const p = buildInquiryPrompt(facts(), 2026);
  assert.match(p.system, /2026년/);
  assert.match(p.system, /약속하지/);
  assert.match(p.user, /100박스/);
  assert.match(p.user, /판매가 25,000원/);
  assert.match(p.user, /Q\. 배송은 며칠\?/);
  assert.match(p.user, /3만원 이상 무료/);
  assert.doesNotMatch(p.user, /010-/);
});

test("가격 비공개 상품은 판매가를 보내지 않는다", () => {
  const p = buildInquiryPrompt(facts({ product: { name: "x", summary: "", description: "", price: null } }), 2026);
  assert.doesNotMatch(p.user, /판매가/);
});

test("1:1 문의·주문 상태", () => {
  const p = buildInquiryPrompt(facts({ kind: "personal", product: null, order: { status: "배송 중", created: "2026-11-10" } }), 2026);
  assert.match(p.user, /1:1 문의/);
  assert.match(p.user, /상태 배송 중/);
});

test("정리: HTML·굵게 기호 지우기, 길이 자르기", () => {
  const d = cleanInquiryDraft({ answer: "<p>**안녕하세요**</p>\n\n\n\n답변", needs_check: [" 입고일 ", ""] }, 8);
  assert.equal(d.answer, "안녕하세요\n\n답");
  assert.deepEqual(d.needs_check, ["입고일"]);
  assert.ok(InquiryDraftSchema.safeParse({ answer: "a", needs_check: [] }).success);
});
