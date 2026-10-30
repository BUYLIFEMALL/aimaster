// 출고중지·취소 정리(외부 호출 없음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { returnsPath, stopShipmentPath, alreadyShippedPath, cancelOrderPath, returnsQuery, normalizeReturns, normalizeReturnAction, cancelBody, normalizeCancel, blockedOrderIds } from "../src/lib/coupang/returns.ts";

test("경로와 조회 조건(취소 조회는 status 없이 cancelType)", () => {
  assert.equal(returnsPath("A1"), "/v2/providers/openapi/apis/api/v6/vendors/A1/returnRequests");
  assert.equal(stopShipmentPath("A1", 9), "/v2/providers/openapi/apis/api/v4/vendors/A1/returnRequests/9/stoppedShipment");
  assert.equal(alreadyShippedPath("A1", 9), "/v2/providers/openapi/apis/api/v4/vendors/A1/returnRequests/9/completedShipment");
  assert.equal(cancelOrderPath("A1", 7), "/v2/providers/openapi/apis/api/v5/vendors/A1/orders/7/cancel");
  const ru = new URLSearchParams(returnsQuery({ from: "2026-10-01", to: "2026-10-30", view: "RU" }));
  assert.equal(ru.get("status"), "RU");
  assert.equal(ru.get("createdAtFrom"), "2026-10-01");
  const c = new URLSearchParams(returnsQuery({ from: "2026-10-01", to: "2026-10-30", view: "CANCEL", nextToken: "5" }));
  assert.equal(c.get("status"), null);
  assert.equal(c.get("cancelType"), "CANCEL");
  assert.equal(c.get("nextToken"), "5");
});

test("요청 목록 정리: 처리 가능 여부와 신청인 정보 제외", () => {
  const r = normalizeReturns({ nextToken: "", data: [
    { receiptId: 1, orderId: 11, receiptStatus: "RELEASE_STOP_UNCHECKED", cancelReasonCategory1: "고객변심", cancelCountSum: 2, requesterName: "샘플", requesterRealPhoneNumber: "010-0000-0000",
      returnItems: [{ vendorItemId: 5, vendorItemName: "샘플 옵션", purchaseCount: 2, cancelCount: 2, shipmentBoxId: 99, releaseStatus: "N" }] },
    { receiptId: 2, orderId: 12, receiptStatus: "RELEASE_STOP_UNCHECKED", returnItems: [{ vendorItemId: 6, releaseStatus: "S" }] },
    { receiptId: 3, orderId: 13, receiptStatus: "RETURNS_COMPLETED", returnItems: [{ vendorItemId: 7, releaseStatus: "N" }] },
  ] });
  assert.deepEqual(r.requests.map((x) => x.actionable), [true, false, false]);
  assert.equal(r.requests[0].statusLabel, "출고중지요청");
  assert.equal(r.requests[0].items[0].releaseLabel, "미출고");
  assert.ok(!JSON.stringify(r).includes("010-0000-0000"));
  assert.deepEqual([...blockedOrderIds(r.requests)], [11, 12]);
  assert.deepEqual(normalizeReturnAction({ data: { resultCode: "SUCCESS", resultMessage: "출고중지완료요청이 성공하였습니다" } }), { ok: true, message: "출고중지완료요청이 성공하였습니다" });
  assert.equal(normalizeReturnAction({ data: { resultCode: "FAIL" } }).ok, false);
});

test("판매자 취소 본문과 응답(필드 이름 두 가지 모두)", () => {
  const b = cancelBody({ vendorId: "A1", userId: "wing", orderId: 7, reason: "CCTTER", items: [{ vendorItemId: 5, count: 2 }, { vendorItemId: 6, count: 0 }] });
  assert.deepEqual(b, { orderId: 7, vendorItemIds: [5], receiptCounts: [2], bigCancelCode: "CANERR", middleCancelCode: "CCTTER", vendorId: "A1", userId: "wing" });
  assert.match(cancelBody({ vendorId: "A1", userId: "wing", orderId: 7, reason: "X", items: [] }).error, /사유/);
  assert.match(cancelBody({ vendorId: "A1", userId: "wing", orderId: 7, reason: "CCTTER", items: [{ vendorItemId: 5, count: 0 }] }).error, /수량/);
  assert.deepEqual(normalizeCancel({ data: { receiptMap: { receiptType: "CANCEL", totalCount: 2 }, failedVendorItemIds: [] } }), { failed: [], receiptType: "CANCEL", total: 2 });
  assert.deepEqual(normalizeCancel({ data: { ReceiptMap: { receiptType: "STOP_SHIPMENT", totalCount: 1 }, failedItemIds: [6] } }), { failed: [6], receiptType: "STOP_SHIPMENT", total: 1 });
});
