// 다운로드 쿠폰·장기 미배송 검사(외부 호출 없음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkDownloadCoupon, checkLongUndelivery, dlCreateBody, dlExpireBody, dlItemsBody, dlResult, dlStatus, dlTime, longUndeliveryPath } from "../src/lib/coupang/downloadCoupon.ts";

const NOW = Date.parse("2026-10-31T12:00:00+09:00");
const policy = { title: "1만원 이상 1천원", description: "", minimumPrice: 10000, discount: 1000, maximumDiscountPrice: 0, maximumPerDaily: 1 };
const draft = { contractId: 7, title: "가을 쿠폰", typeOfDiscount: "PRICE", startAt: "2026-10-31T13:30", endAt: "2026-11-10T23:59", policies: [policy], vendorItemIds: [1, 2] };

test("다운로드 쿠폰 검사", () => {
  assert.equal(checkDownloadCoupon(draft, NOW), "");
  assert.match(checkDownloadCoupon({ ...draft, startAt: "2026-10-31T12:30" }, NOW), /1시간/);
  assert.match(checkDownloadCoupon({ ...draft, endAt: "2026-10-31T13:00" }, NOW), /빠릅/);
  assert.match(checkDownloadCoupon({ ...draft, policies: [{ ...policy, discount: 1005 }] }, NOW), /10원/);
  assert.match(checkDownloadCoupon({ ...draft, typeOfDiscount: "RATE", policies: [{ ...policy, discount: 100 }] }, NOW), /99%/);
  assert.match(checkDownloadCoupon({ ...draft, typeOfDiscount: "RATE", policies: [{ ...policy, discount: 10 }] }, NOW), /최대 할인/);
  assert.match(checkDownloadCoupon({ ...draft, policies: [{ ...policy, maximumPerDaily: 10000 }] }, NOW), /9,999/);
  assert.match(checkDownloadCoupon({ ...draft, vendorItemIds: [] }, NOW), /옵션ID/);
  assert.match(checkDownloadCoupon({ ...draft, contractId: 0 }, NOW), /계약/);
});

test("명세 형식으로 본문을 만든다", () => {
  assert.equal(dlTime("2026-10-31T13:30"), "2026-10-31 13:30:00");
  const b = dlCreateBody(draft, "wing");
  assert.equal(b.contractId, "7");
  assert.equal(b.couponType, "DOWNLOAD");
  assert.equal(b.userId, "wing");
  assert.equal(b.policies[0].maximumDiscountPrice, 1000);
  assert.equal(b.policies[0].description, policy.title);
  assert.deepEqual(dlItemsBody(9, "wing", [1]), { couponItems: [{ couponId: "9", userId: "wing", vendorItemIds: [1] }] });
  assert.equal(dlExpireBody(9, "wing").expireCouponList[0].reason, "expired");
});

test("응답 정리", () => {
  assert.equal(dlResult({ requestResultStatus: "SUCCESS", body: { couponId: 5 } }).couponId, 5);
  assert.equal(dlResult([{ requestResultStatus: "SUCCESS", body: { requestTransactionId: "t" } }]).transactionId, "t");
  assert.equal(dlResult({ requestResultStatus: "FAIL", errorMessage: "x" }).ok, false);
  const s = dlStatus({ transactionStatusResponse: { status: "FAIL", failed: 1, couponFailedVendorItemIdResponses: [{ vendorItemId: 4, failureReason: "이미 발행" }] } });
  assert.deepEqual(s.reasons, ["4: 이미 발행"]);
  assert.equal(dlStatus(null).status, "");
});

test("장기 미배송 검사", () => {
  assert.match(longUndeliveryPath("A1"), /A1\/completeLongTermUndelivery$/);
  assert.equal(checkLongUndelivery(12, "505"), "");
  assert.match(checkLongUndelivery(0, "505"), /배송번호/);
  assert.match(checkLongUndelivery(12, " "), /송장/);
});
