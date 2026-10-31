// 교환·반품 승인·오래 멈춘 배송 정리(외부 호출 없음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { canSendExchangeInvoice, exchangeActionFailed, exchangeInvoiceBody, exchangeRange, exchangesQuery, isOpenExchange, normalizeExchanges } from "../src/lib/coupang/exchanges.ts";
import { normalizeReturns, returnApprovalPath, returnReceiptPath, returnSteps } from "../src/lib/coupang/returns.ts";
import { historyPath, normalizeHistorySteps, staleShipments } from "../src/lib/coupang/shipping.ts";

test("교환 조회 조건을 명세대로 만든다", () => {
  const r = exchangeRange(Date.parse("2026-10-31T15:30:00Z"));
  assert.deepEqual(r, { from: "2026-10-26T00:00:00", to: "2026-11-01T23:59:59" });
  const q = exchangesQuery({ ...r, orderId: 19 });
  assert.match(q, /createdAtFrom=2026-10-26T00%3A00%3A00/);
  assert.match(q, /orderId=19/);
});

test("교환 응답을 정리하고 고객 정보를 읽지 않는다", () => {
  const { rows } = normalizeExchanges({ data: [{ exchangeId: 7, orderId: 19, exchangeStatus: "PROGRESS", collectStatus: "CompleteCollect", faultType: "VENDOR", reasonCodeText: "색상이 다름", reasonEtcDetail: "010-1234-5678 로 연락 주세요", deliveryCustomerName: "홍길동", createdAt: "2026-10-30T10:00:00", exchangeItemDtoV1s: [{ targetItemName: "백팩 블랙" }], deliveryInvoiceGroupDtos: [{ shipmentBoxId: 100 }, { shipmentBoxId: 200 }] }], nextToken: "" });
  const x = rows[0];
  assert.equal(x.statusLabel, "진행");
  assert.equal(x.collectLabel, "업체 전달 완료");
  assert.equal(x.shipmentBoxId, "200");
  assert.deepEqual(x.items, ["백팩 블랙"]);
  assert.ok(!JSON.stringify(x).includes("홍길동"));
  assert.ok(!x.reason.includes("1234"));
  assert.deepEqual(normalizeExchanges(null), { rows: [], nextToken: "" });
});

test("교환 송장은 회수 완료와 새 배송번호가 있어야 한다", () => {
  const ok = { status: "PROGRESS", collectStatus: "CompleteCollect", shipmentBoxId: "200" };
  assert.ok(canSendExchangeInvoice(ok));
  assert.ok(!canSendExchangeInvoice({ ...ok, collectStatus: "Delivering" }));
  assert.ok(!canSendExchangeInvoice({ ...ok, shipmentBoxId: "" }));
  assert.ok(!canSendExchangeInvoice({ ...ok, status: "SUCCESS" }));
  assert.ok(!isOpenExchange({ status: "CANCEL" }));
  assert.deepEqual(exchangeInvoiceBody("A1", 7, "200", "CJGLS", "68")[0], { exchangeId: "7", vendorId: "A1", shipmentBoxId: "200", goodsDeliveryCode: "CJGLS", invoiceNumber: "68" });
});

test("쓰기 응답 실패를 읽는다", () => {
  assert.equal(exchangeActionFailed({ code: "200", message: "SUCCESS" }), "");
  assert.equal(exchangeActionFailed({ data: { resultCode: "SUCCESS" } }), "");
  assert.equal(exchangeActionFailed({ data: { resultCode: "FAIL", resultMessage: "회수 전" } }), "회수 전");
});

test("반품 단계를 상태로 고른다", () => {
  assert.equal(returnReceiptPath("A1", 3), "/v2/providers/openapi/apis/api/v4/vendors/A1/returnRequests/3/receiveConfirmation");
  assert.equal(returnApprovalPath("A1", 3), "/v2/providers/openapi/apis/api/v4/vendors/A1/returnRequests/3/approval");
  const req = (receiptStatus, release) => normalizeReturns({ data: [{ receiptId: 3, orderId: 9, receiptStatus, returnItems: [{ vendorItemId: 1, releaseStatus: release }] }] }).requests[0];
  assert.deepEqual(returnSteps(req("RETURNS_UNCHECKED", "Y")), { canConfirmReceipt: true, canApprove: false });
  assert.deepEqual(returnSteps(req("RETURNS_UNCHECKED", "N")), { canConfirmReceipt: false, canApprove: false });
  assert.deepEqual(returnSteps(req("VENDOR_WAREHOUSE_CONFIRM", "Y")), { canConfirmReceipt: false, canApprove: true });
  assert.deepEqual(returnSteps(req("RETURNS_COMPLETED", "Y")), { canConfirmReceipt: false, canApprove: false });
});

test("오래 멈춘 배송을 기준 일수로 고르고 수취인 정보를 넘기지 않는다", () => {
  const order = (shipmentBoxId, status, orderedAt) => ({ shipmentBoxId, orderId: shipmentBoxId, status, orderedAt, receiverName: "홍길동", address: "서울", deliveryCompanyName: "CJ", invoiceNumber: "1", items: [{ name: "백팩" }] });
  const now = Date.parse("2026-10-31T00:00:00+09:00");
  const rows = staleShipments([order(1, "DEPARTURE", "2026-10-29T00:00:00+09:00"), order(2, "DEPARTURE", "2026-10-28T00:00:00+09:00"), order(3, "DELIVERING", "2026-10-27T00:00:00+09:00"), order(4, "DELIVERING", "2026-10-20T00:00:00+09:00"), order(5, "DEPARTURE", "이상한 값")], now);
  assert.deepEqual(rows.map((r) => r.shipmentBoxId), [4, 2]);
  assert.equal(rows[0].days, 11);
  assert.ok(!JSON.stringify(rows).includes("홍길동"));
});

test("배송 이력을 최신순으로 정리한다", () => {
  assert.ok(historyPath("A1", 5).endsWith("/vendors/A1/ordersheets/5/history"));
  const steps = normalizeHistorySteps({ data: [{ shipmentBoxId: 5, details: [{ deliveryStatus: "ACCEPT", updatedAt: "2026-10-01T10:00:00" }, { deliveryStatusDesc: "배송중", updatedAt: "2026-10-02T10:00:00" }] }] });
  assert.equal(steps[0].label, "배송중");
  assert.equal(normalizeHistorySteps(null).length, 0);
});
