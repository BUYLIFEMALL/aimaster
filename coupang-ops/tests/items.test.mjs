// 옵션별 가격·재고·판매 상태 정리·검사(외부 호출 없음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkPrice, checkQuantity, resumeWarning, normalizeInventory, normalizeProductItems, pricePath, salePath } from "../src/lib/coupang/items.ts";

test("경로를 명세대로 만든다", () => {
  assert.equal(pricePath(3572784698, 49000), "/v2/providers/seller_api/apis/api/v1/marketplace/vendor-items/3572784698/prices/49000");
  assert.ok(salePath(1, false).endsWith("/1/sales/stop"));
  assert.ok(salePath(1, true).endsWith("/1/sales/resume"));
});

test("상품 조회 응답에서 옵션을 읽고, 승인 전 옵션은 번호가 없다", () => {
  const r = normalizeProductItems({ data: { sellerProductName: "클렌징오일", statusName: "승인완료", items: [
    { vendorItemId: 4279191312, itemName: "200ml_1개", salePrice: 12800, originalPrice: 15000, maximumBuyCount: 7 },
    { vendorItemId: null, itemName: "임시", salePrice: 1000 },
  ] } });
  assert.equal(r.items[0].vendorItemId, 4279191312);
  assert.equal(r.items[0].stock, 7);
  assert.equal(r.items[1].vendorItemId, null);
  assert.deepEqual(normalizeInventory({ data: { amountInStock: 3, salePrice: 32000, onSale: true } }), { stock: 3, salePrice: 32000, onSale: true });
  assert.equal(normalizeInventory({}), null);
});

test("가격은 10원 단위, 50% 인하~100% 인상까지만", () => {
  assert.equal(checkPrice(10000, 12000), "");
  assert.match(checkPrice(10000, 12005), /10원 단위/);
  assert.match(checkPrice(10000, 4990), /50% 인하/);
  assert.match(checkPrice(10000, 20010), /100% 인상/);
  assert.equal(checkPrice(10000, 5000), "");
  assert.equal(checkPrice(10000, 20000), "");
  assert.match(checkPrice(10000, 10000), /같습니다/);
  assert.match(checkPrice(10000, 0), /1원 이상/);
});

test("재고는 0~99999 정수", () => {
  assert.equal(checkQuantity(5, 0), "");
  assert.match(checkQuantity(5, -1), /0 이상/);
  assert.match(checkQuantity(5, 100000), /99,999/);
  assert.match(checkQuantity(5, 5), /같습니다/);
});

test("S3 재고 0개 판매 재개 경고", () => {
  assert.match(resumeWarning(0), /재고가 0개/);
  assert.equal(resumeWarning(3), "");
});
