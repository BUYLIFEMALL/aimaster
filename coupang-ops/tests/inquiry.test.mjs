// 고객 문의 정리(외부 호출 없음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { centerQuery, centerReplyPath, checkReply, inquiryRange, normalizeCenter, normalizeOnline, onlineQuery, onlineReplyPath, redactInquiry } from "../src/lib/coupang/inquiry.ts";

test("경로와 조건을 명세대로 만든다", () => {
  assert.equal(onlineReplyPath("A1", "39"), "/v2/providers/openapi/apis/api/v4/vendors/A1/onlineInquiries/39/replies");
  assert.equal(centerReplyPath("A1", "39"), "/v2/providers/openapi/apis/api/v4/vendors/A1/callCenterInquiries/39/replies");
  const r = { from: "2026-10-24", to: "2026-10-31" };
  assert.match(onlineQuery("A1", r), /answeredType=NOANSWER/);
  assert.match(onlineQuery("A1", r), /pageSize=50/);
  assert.match(centerQuery("TRANSFER", r), /partnerCounselingStatus=TRANSFER/);
  assert.match(centerQuery("NO_ANSWER", r), /pageSize=30/);
});

test("조회 기간은 한국 날짜 기준 오늘 포함 7일이다", () => {
  assert.deepEqual(inquiryRange(Date.parse("2026-10-31T15:30:00Z")), { from: "2026-10-26", to: "2026-11-01" });
});

test("고객 정보를 가린다", () => {
  const out = redactInquiry("[판매자이관]\n◼주문번호: 1000000123456\n◼고객명/연락처: <<홍길동/010-1234-5678>>\n◼문의내용: 010-9999-8888 로 연락 주세요. a.b@example.com");
  assert.ok(!out.includes("홍길동"));
  assert.ok(!out.includes("1234-5678"));
  assert.ok(!out.includes("9999"));
  assert.ok(!out.includes("example.com"));
  assert.ok(!out.includes("1000000123456"));
  assert.match(out, /문의내용/);
  assert.equal(redactInquiry("스판이 강한가요?"), "스판이 강한가요?");
  assert.match(redactInquiry("연락 01*-****-**** 요청"), /가림/);
});

test("상품 문의를 정리한다", () => {
  const r = normalizeOnline({ data: { content: [{ inquiryId: 39352273, sellerProductId: 718482283, content: "스판이 강한가요?", inquiryAt: "2026-10-30T14:17:13+09:00" }], pagination: { totalElements: 304 } } });
  assert.equal(r.rows[0].id, "39352273");
  assert.equal(r.rows[0].kind, "product");
  assert.equal(r.total, 304);
  assert.deepEqual(normalizeOnline(null), { rows: [], total: 0 });
});

test("고객센터 문의는 답변이 필요한 이관글 번호를 고른다", () => {
  const raw = { data: { content: [{ inquiryId: 7, itemName: "스커트, L", content: "상담이력", replies: [
    { answerId: 100, needAnswer: true, content: "◼문의내용: 환불 문의", replyAt: "2026-10-30T10:00:00+09:00" },
    { answerId: 101, needAnswer: false, content: "메모", replyAt: "2026-10-30T11:00:00+09:00" },
  ] }] } };
  const no = normalizeCenter(raw, "NO_ANSWER").rows[0];
  assert.equal(no.parentAnswerId, "100");
  assert.match(no.question, /환불 문의/);
  assert.equal(no.needsConfirm, false);
  assert.equal(normalizeCenter(raw, "TRANSFER").rows[0].needsConfirm, true);
});

test("답변 길이를 검사한다", () => {
  assert.match(checkReply(" 네 ".slice(1, 2)), /2자 이상/);
  assert.equal(checkReply("확인했습니다"), "");
  assert.match(checkReply("가".repeat(1001)), /1,000자/);
});
