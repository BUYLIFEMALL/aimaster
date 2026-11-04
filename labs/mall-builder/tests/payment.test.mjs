// 실행: node --test tests/   — 카드 결제 순수 계산(토스는 부르지 않음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkClientKey, checkSecretKey, keyMode, orderName, parseSuccessParams } from "../src/lib/payment.ts";

test("키 종류 검사: 결제위젯 키만, 비우면 통과", () => {
  assert.equal(checkClientKey("test_gck_abcdef123"), null);
  assert.equal(checkClientKey(""), null);
  assert.match(checkClientKey("test_ck_abcdef123") ?? "", /결제위젯 키/);
  assert.equal(checkSecretKey("live_gsk_abcdef123"), null);
  assert.match(checkSecretKey("test_sk_abcdef123") ?? "", /시크릿 키/);
  assert.equal(keyMode("test_gck_x"), "test");
  assert.equal(keyMode("live_gsk_x"), "live");
  assert.equal(keyMode("abc"), null);
});

test("주문명: 첫 상품 외 N건, 100자 이내", () => {
  assert.equal(orderName(["공기청정기"]), "공기청정기");
  assert.equal(orderName(["공기청정기", "필터", "케이스"]), "공기청정기 외 2건");
  assert.equal(orderName([]), "주문 상품");
  assert.ok(orderName(["가".repeat(200)]).length <= 100);
});

test("결제창 성공 값 검사: 주문 번호·금액·결제 키", () => {
  const id = "9781660d-6735-4041-8676-873bd8520e80";
  assert.deepEqual(parseSuccessParams(id, { paymentKey: "tgen_abcdefghij", orderId: id, amount: "84600" }), { ok: true, paymentKey: "tgen_abcdefghij", amount: 84600 });
  assert.equal(parseSuccessParams(id, { paymentKey: "tgen_abcdefghij", orderId: "other-order", amount: "84600" }).ok, false);
  assert.equal(parseSuccessParams(id, { paymentKey: "tgen_abcdefghij", orderId: id, amount: "-1" }).ok, false);
  assert.equal(parseSuccessParams(id, { paymentKey: "bad key!", orderId: id, amount: "100" }).ok, false);
});
