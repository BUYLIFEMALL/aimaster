// 일괄 변경·상품 수정·쿠폰 계산(외부 호출 없음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { bulkPrice, previewPrice, previewQty } from "../src/lib/coupang/bulk.ts";
import { autoOptionResult, buildEditBody, buildPartialBody, checkDelivery, checkOriginalPrice, checkProductFields, cleanTags, normalizeEditView } from "../src/lib/coupang/productEdit.ts";
import { checkCoupon, couponBody, normalizeBudget, normalizeContracts, normalizeCoupons, normalizeRequest, parseVendorItemIds, requestedIdOf } from "../src/lib/coupang/coupons.ts";

test("일괄 가격은 10원 단위로 맞추고 쿠팡 범위를 검사한다", () => {
  assert.equal(bulkPrice(12345, "percent", 10), 13580);
  assert.equal(bulkPrice(10000, "amount", -1000), 9000);
  assert.equal(bulkPrice(10000, "fixed", 8005), 8010);
  assert.equal(previewPrice(10000, "percent", -10).problem, "");
  assert.match(previewPrice(10000, "percent", -60).problem, /50%/);
  assert.match(previewPrice(10000, "percent", 150).problem, /100%/);
  assert.match(previewPrice(10000, "amount", 0).problem, /같습니다/);
  assert.match(previewPrice(10000, "percent", NaN).problem, /숫자/);
});

test("일괄 재고는 음수와 상한을 막는다", () => {
  assert.equal(previewQty(5, "add", 10).next, 15);
  assert.match(previewQty(5, "add", -6).problem, /0 이상/);
  assert.match(previewQty(5, "fixed", 100000).problem, /99,999/);
});

const product = { data: { sellerProductId: 1, statusName: "승인완료", sellerProductName: "가방", displayProductName: "좋은 가방", brand: "GENERIC", deliveryChargeType: "FREE", deliveryCharge: 0, returnCharge: 5000, deliveryChargeOnReturn: 5000, images: ["a"], items: [{ sellerProductItemId: 9, salePrice: 1000, searchTags: ["옛"] }] } };

test("상품 수정은 조회 값을 보존하고 고친 칸만 바꾼다", () => {
  const view = normalizeEditView(product);
  assert.deepEqual(view.tags, ["옛"]);
  const body = buildEditBody(product, { name: "새 가방", displayName: "새 이름", brand: "BUY", tags: ["가", "나"] });
  assert.equal(body.sellerProductName, "새 가방");
  assert.equal(body.requested, true);
  assert.deepEqual(body.images, ["a"]);
  assert.equal(body.items[0].sellerProductItemId, 9);
  assert.equal(body.items[0].salePrice, 1000);
  assert.deepEqual(body.items[0].searchTags, ["가", "나"]);
  assert.equal(buildEditBody({ data: { ...product.data, statusName: "승인반려" } }, view).requested, false);
});

test("상품 정보·배송 검사", () => {
  assert.match(checkProductFields({ name: "", displayName: "", brand: "", tags: [] }), /상품명/);
  assert.match(checkProductFields({ name: "a", displayName: "", brand: "A B", tags: [] }), /브랜드/);
  assert.equal(checkProductFields({ name: "a", displayName: "", brand: "브랜드1", tags: [] }), "");
  assert.deepEqual(cleanTags(" 가, 나,가,, "), ["가", "나"]);
  const d = { deliveryChargeType: "NOT_FREE", deliveryCharge: 0, deliveryChargeOnReturn: 0, returnCharge: 0, freeShipOverAmount: 0 };
  assert.match(checkDelivery(d), /기본 배송비/);
  assert.match(checkDelivery({ ...d, deliveryChargeType: "CONDITIONAL_FREE", deliveryCharge: 100 }), /조건/);
  assert.equal(checkDelivery({ ...d, deliveryChargeType: "FREE" }), "");
  assert.equal(buildPartialBody(1, { ...d, deliveryChargeType: "FREE", deliveryCharge: 3000, freeShipOverAmount: 9 }).deliveryCharge, 0);
  assert.equal(checkOriginalPrice(0), "");
  assert.match(checkOriginalPrice(15), /10원/);
});

test("자동생성옵션 응답을 구분한다", () => {
  assert.equal(autoOptionResult({ data: { code: "SUCCESS" } }).ok, true);
  assert.match(autoOptionResult({ code: "PROCESSING" }).message, /처리 중/);
  assert.equal(autoOptionResult({ data: { code: "FAILED", message: "안 됨" } }).ok, false);
  assert.equal(autoOptionResult(null).ok, false);
});

const contract = { contractId: 7, start: "2026-11-01 00:00:00", end: "2026-12-31 23:59:59", type: "NON_CONTRACT_BASED", useBudget: true, sellerShareRatio: 100 };
const draft = { contractId: 7, name: "가을 할인", type: "RATE", discount: 10, maxDiscountPrice: 5000, startDate: "2026-11-02", endDate: "2026-11-30" };

test("쿠폰 검사와 본문", () => {
  assert.equal(checkCoupon(draft, "2026-10-31", contract), "");
  assert.match(checkCoupon(draft, "2026-10-31"), /계약/);
  assert.match(checkCoupon({ ...draft, startDate: "2026-10-31" }, "2026-10-31", contract), /내일/);
  assert.match(checkCoupon({ ...draft, discount: 100 }, "2026-10-31", contract), /99%/);
  assert.match(checkCoupon({ ...draft, maxDiscountPrice: 5 }, "2026-10-31", contract), /10원/);
  assert.match(checkCoupon({ ...draft, endDate: "2027-01-01" }, "2026-10-31", contract), /계약 기간/);
  const body = couponBody(draft);
  assert.equal(body.startAt, "2026-11-02 00:00:00");
  assert.equal(body.wowExclusive, "false");
});

test("쿠폰 응답을 정리한다", () => {
  assert.equal(normalizeContracts({ data: { content: [{ contractId: 7, useBudget: true }, { contractId: 0 }] } }).length, 1);
  assert.equal(normalizeCoupons({ data: { content: [{ couponId: 3, promotionName: "할인", status: "APPLIED" }] } })[0].name, "할인");
  assert.deepEqual(normalizeBudget({ data: { totalBudgetAmount: 100, usedBudgetAmount: 40 } }), { total: 100, used: 40 });
  assert.equal(normalizeBudget({ data: {} }), null);
  assert.equal(requestedIdOf({ data: { content: { requestedId: "r1" } } }), "r1");
  assert.equal(normalizeRequest({ data: { content: { status: "DONE", couponId: 3, succeeded: 1, failed: 0, failedVendorItems: [] } } }).failedItems, "");
  assert.deepEqual(parseVendorItemIds("1, 2\n2 x 3"), [1, 2, 3]);
});
