// 발주서 조회 정리(외부 호출 없음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkOrderRange, ordersQuery, normalizeOrderSheets, money, ordersPath } from "../src/lib/coupang/orders.ts";

test("조회 기간은 31일까지, 시작일이 종료일보다 늦으면 막는다", () => {
  assert.equal(checkOrderRange("2026-07-01", "2026-07-31"), null);
  assert.match(checkOrderRange("2026-07-01", "2026-08-01"), /31일/);
  assert.match(checkOrderRange("2026-07-02", "2026-07-01"), /늦습니다/);
  assert.match(checkOrderRange("2026-7-1", "2026-07-01"), /날짜/);
});

test("조회 조건을 명세 형식으로 만든다(모르는 상태는 결제완료)", () => {
  assert.equal(ordersPath("A001"), "/v2/providers/openapi/apis/api/v5/vendors/A001/ordersheets");
  assert.equal(ordersQuery({ from: "2026-10-01", to: "2026-10-07", status: "INSTRUCT" }), "createdAtFrom=2026-10-01%2B09:00&createdAtTo=2026-10-07%2B09:00&maxPerPage=50&status=INSTRUCT");
  assert.match(ordersQuery({ from: "2026-10-01", to: "2026-10-01", status: "X", nextToken: "448537989" }), /status=ACCEPT&nextToken=448537989$/);
});

test("발주서 응답을 정리한다(가격 객체·발주 가능 수량·실전화번호 제외)", () => {
  const r = normalizeOrderSheets({ code: 200, nextToken: "9", data: [
    { shipmentBoxId: 111, orderId: 222, orderedAt: "2026-10-29T10:00:00", status: "ACCEPT",
      orderer: { name: "샘플주문자", ordererNumber: "010-0000-0000" },
      receiver: { name: "샘플수취인", safeNumber: "0507-0000-0000", receiverNumber: "010-1111-1111", addr1: "서울시 샘플구", addr2: "101호", postCode: "00000" },
      shippingPrice: { currencyCode: "KRW", units: 3000, nanos: 0 },
      orderItems: [{ vendorItemId: 333, vendorItemName: "샘플 상품", shippingCount: 3, holdCountForCancel: 1, cancelCount: 0, salesPrice: { units: 10000 }, orderPrice: { units: 30000 } }] },
    { orderId: 1 },
  ] });
  assert.equal(r.orders.length, 1);
  const o = r.orders[0];
  assert.equal(o.address, "서울시 샘플구 101호");
  assert.equal(o.shippingPrice, 3000);
  assert.equal(o.items[0].qty, 2);
  assert.equal(o.items[0].unitPrice, 10000);
  assert.ok(!JSON.stringify(o).includes("010-1111-1111"));
  assert.ok(!JSON.stringify(o).includes("010-0000-0000"));
  assert.equal(r.nextToken, "9");
  assert.equal(money(27070), 27070);
  assert.deepEqual(normalizeOrderSheets(null), { orders: [], nextToken: "" });
});
