import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifySendError,
  detailTextHtml,
  parseRegisterResponse,
  parseStopDisplayResponse,
  sendBlockReason,
  stripNonEucKr,
} from "../src/lib/elevenst/register.ts";

test("등록 응답: 200·210은 상품번호와 함께 성공", () => {
  const ok = parseRegisterResponse('<?xml version="1.0" encoding="euc-kr"?><ClientMessage><message>상품등록이 완료되었습니다. 상품번호 : 8001234567</message><productNo>8001234567</productNo><resultCode>200</resultCode></ClientMessage>');
  assert.deepEqual(ok.ok && [ok.productNo, ok.code], ["8001234567", "200"]);
  const conv = parseRegisterResponse("<ClientMessage><message>신규상품이 아니라 일반상품으로 등록</message><productNo>8001234568</productNo><resultCode>210</resultCode></ClientMessage>");
  assert.equal(conv.ok, true);
});

test("등록 응답: 오류 코드·상품번호 없음은 실패로, 11번가 문구를 그대로", () => {
  const bad = parseRegisterResponse("<ClientMessage><message>카테고리 번호가 올바르지 않습니다.</message><resultCode>500</resultCode></ClientMessage>");
  assert.equal(bad.ok, false);
  assert.match(bad.message, /카테고리 번호/);
  assert.equal(parseRegisterResponse("<ClientMessage><resultCode>200</resultCode></ClientMessage>").ok, false);
  assert.equal(parseRegisterResponse("<ClientMessage><message>SellerAPI 승인이 필요합니다</message><resultCode>300</resultCode></ClientMessage>").ok, false);
});

test("전시중지 응답", () => {
  assert.equal(parseStopDisplayResponse("<ClientMessage><message>판매상태가 수정되었습니다. [STAT : 105]</message><resultCode>200</resultCode></ClientMessage>").ok, true);
  assert.equal(parseStopDisplayResponse("<ClientMessage><message>점검 중</message><resultCode>-1000</resultCode></ClientMessage>").ok, false);
});

test("보내기 예외: 연결 실패·시간 초과·XML 아닌 5xx는 확인 필요(다시 보내지 않음), XML 오류는 실패", () => {
  assert.equal(classifySendError(0, ""), "unknown");
  assert.equal(classifySendError(502, "Bad Gateway"), "unknown");
  assert.equal(classifySendError(500, "<ClientMessage><message>업무 오류</message></ClientMessage>"), "failed");
  assert.equal(classifySendError(400, "<ClientMessage><message>필수값 누락</message></ClientMessage>"), "failed");
});

test("중복 막기: 보내는 중·확인 필요·등록됨은 막고, 실패·처음은 허용", () => {
  for (const s of ["sending", "unknown", "registered", "stopped"]) assert.ok(sendBlockReason(s), s);
  assert.equal(sendBlockReason("failed"), "");
  assert.equal(sendBlockReason(null), "");
  assert.match(sendBlockReason("unknown"), /셀러오피스/);
});

test("글 상세설명: 특징·상품 정보 표·사용법, 이미지 없음, HTML·이모지 처리", () => {
  const html = detailTextHtml({
    name: "여행 백팩 <대용량>",
    key_features: "- 확장형 수납 ✨\n- 방수 원단",
    specs: "품명: 스위스톤 여행백팩\r\n소재: 폴리에스테르\n설명 없는 줄",
    how_to_use: "1. 지퍼를 연다\n2. 넣는다",
    target_customer: null,
  });
  assert.ok(!/<img/i.test(html), "이미지를 넣지 않는다");
  assert.match(html, /&lt;대용량&gt;/);
  assert.match(html, /<li>확장형 수납 <\/li>/);
  assert.match(html, /<th[^>]*>품명<\/th><td[^>]*>스위스톤 여행백팩<\/td>/);
  assert.ok(!html.includes("설명 없는 줄"));
  assert.match(html, /<ol[^>]*><li>지퍼를 연다<\/li><li>넣는다<\/li><\/ol>/);
  assert.ok(!html.includes("이런 분께"));
  assert.ok(!html.includes("✨"));
});

test("EUC-KR에 없는 글자만 뺀다", () => {
  assert.equal(stripNonEucKr("가방😀 백팩"), "가방 백팩");
  assert.equal(stripNonEucKr("보통 글자 ABC 123"), "보통 글자 ABC 123");
});
