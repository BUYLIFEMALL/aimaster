import { test } from "node:test";
import assert from "node:assert/strict";
import { TRANSITIONS, ORDER_STATUS_LABEL, nextActions, canTransition } from "../src/lib/orders.ts";

test("이동표의 상태는 모두 이름표가 있다", () => {
  for (const [, from, to] of TRANSITIONS) {
    assert.ok(ORDER_STATUS_LABEL[from], from);
    assert.ok(ORDER_STATUS_LABEL[to], to);
  }
});

test("손님 — 입금 전 취소, 결제 뒤엔 취소 요청만, 배송 완료 뒤 확정·반품 요청", () => {
  assert.deepEqual(nextActions("customer", "pending_payment").map((a) => a.to), ["cancelled"]);
  assert.deepEqual(nextActions("customer", "paid").map((a) => a.to), ["cancel_requested"]);
  assert.deepEqual(nextActions("customer", "delivered").map((a) => a.to), ["confirmed", "return_requested"]);
  assert.equal(canTransition("customer", "pending_payment", "paid"), false); // 입금 확인은 운영자만
  assert.equal(canTransition("customer", "paid", "cancelled"), false); // 결제 뒤 바로 취소 불가
  assert.deepEqual(nextActions("customer", "shipping"), []);
});

test("운영자 — 정상 흐름과 요청 처리", () => {
  const flow = ["pending_payment", "paid", "preparing", "shipping", "delivered", "confirmed"];
  for (let i = 0; i < flow.length - 1; i++) assert.equal(canTransition("staff", flow[i], flow[i + 1]), true, `${flow[i]}→${flow[i + 1]}`);
  assert.equal(canTransition("staff", "shipping", "cancelled"), false); // 발송 뒤에는 반품으로
  assert.deepEqual(nextActions("staff", "cancel_requested").map((a) => a.to), ["cancelled", "paid"]);
  assert.deepEqual(nextActions("staff", "return_requested").map((a) => a.to), ["returned", "delivered"]);
});

test("끝난 상태에서는 아무도 못 바꾼다", () => {
  for (const s of ["confirmed", "cancelled", "returned"]) {
    assert.deepEqual(nextActions("staff", s), []);
    assert.deepEqual(nextActions("customer", s), []);
  }
});
