// 발주서·송장 파일(외부 호출 없음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { chunk, courierCodeOf, matchInvoiceFile, ORDER_FILE_HEADERS, orderFileRows } from "../src/lib/coupang/orderFile.ts";
import { COMMON_COURIERS } from "../src/lib/coupang/defaults.ts";

const order = (over) => ({ shipmentBoxId: 11, orderId: 22, orderedAt: "", paidAt: "", status: "INSTRUCT", ordererName: "주문자", receiverName: "받는이", receiverSafeNumber: "0507", postCode: "01234", address: "서울", message: "문 앞", shippingPrice: 0, deliveryCompanyName: "", invoiceNumber: "", items: [{ vendorItemId: 1, name: "가방", optionName: "블랙", orderedQty: 2, cancelQty: 1, qty: 1, unitPrice: 0, orderPrice: 0, estimatedShippingDate: "" }, { vendorItemId: 2, name: "끈", optionName: "끈", orderedQty: 1, cancelQty: 1, qty: 0, unitPrice: 0, orderPrice: 0, estimatedShippingDate: "" }], ...over });

test("발주서 파일은 묶음 한 줄, 보낼 수량만, 주문자 이름 없음", () => {
  const code = COMMON_COURIERS[0].code;
  const rows = orderFileRows([order()], code);
  assert.deepEqual(rows[0], ORDER_FILE_HEADERS);
  assert.equal(rows[1][0], "22");
  assert.equal(rows[1][6], "가방 (블랙) x1");
  assert.equal(rows[1][7], "1");
  assert.equal(rows[1][9], COMMON_COURIERS[0].name);
  assert.ok(!rows[1].includes("주문자"));
});

test("송장 파일을 열 이름으로 맞춘다", () => {
  const orders = [order(), order({ shipmentBoxId: 33, orderId: 44 }), order({ shipmentBoxId: 55, orderId: 66 }), order({ shipmentBoxId: 77, orderId: 66 })];
  const r = matchInvoiceFile([
    { 배송번호: "11", 운송장번호: "1234-5678-90" },
    { 주문번호: "44", "송장 번호": "999888777" },
    { 주문번호: "66", 송장번호: "111222333" },
    { 배송번호: "2.2E+13", 송장번호: "1" },
    { 배송번호: "999", 송장번호: "1" },
    { 배송번호: "33", 송장번호: "" },
  ], orders);
  assert.deepEqual(r.fills.map((f) => [f.shipmentBoxId, f.invoice]), [[11, "1234567890"], [33, "999888777"]]);
  assert.equal(r.unmatched, 2); // 묶음이 둘인 주문번호는 어느 묶음인지 몰라 채우지 않는다
  assert.equal(r.badKey, 1);
  assert.equal(r.noInvoice, 1);
});

test("택배사 이름·나누기", () => {
  assert.equal(courierCodeOf(COMMON_COURIERS[0].name), COMMON_COURIERS[0].code);
  assert.equal(courierCodeOf(""), "");
  assert.equal(courierCodeOf("없는택배"), "");
  assert.deepEqual(chunk([1, 2, 3], 2), [[1, 2], [3]]);
  assert.deepEqual(chunk([], 2), []);
});
