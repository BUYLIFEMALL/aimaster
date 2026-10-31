// 품절 예방 재고 점검 판정(외부 호출 없음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanStockLimit, isCheckableStatus, pickOptions, stockLevel } from "../src/lib/coupang/stock.ts";
import { listQuery } from "../src/lib/coupang/listing.ts";

test("재고 수준을 나눈다 — 판매 중지가 먼저, 기준 수량은 포함", () => {
  assert.equal(stockLevel({ stock: 0, onSale: false }, 5), "stopped");
  assert.equal(stockLevel({ stock: 0, onSale: true }, 5), "out");
  assert.equal(stockLevel({ stock: 5, onSale: true }, 5), "low");
  assert.equal(stockLevel({ stock: 6, onSale: true }, 5), "ok");
  assert.equal(stockLevel({ stock: 0, onSale: true }, 0), "out");
  assert.equal(stockLevel({ stock: 1, onSale: true }, 0), "ok");
});

test("기준 수량 입력을 정리한다", () => {
  assert.equal(cleanStockLimit("3"), 3);
  assert.equal(cleanStockLimit("0"), 0);
  assert.equal(cleanStockLimit(""), 5);
  assert.equal(cleanStockLimit(null), 5);
  assert.equal(cleanStockLimit("-1"), 5);
  assert.equal(cleanStockLimit("1.5"), 5);
  assert.equal(cleanStockLimit("99999"), 9999);
});

test("승인된 상품만 점검 대상이다", () => {
  assert.ok(isCheckableStatus("승인완료"));
  assert.ok(isCheckableStatus("부분승인완료"));
  assert.ok(!isCheckableStatus("임시저장"));
  assert.ok(!isCheckableStatus("승인반려"));
});

test("옵션ID 있는 옵션만 남은 칸만큼 고른다", () => {
  const item = (id) => ({ vendorItemId: id, itemName: "", salePrice: 0, originalPrice: 0, stock: 0 });
  const r = pickOptions([item(1), item(null), item(2), item(3)], 2);
  assert.deepEqual(r.picked.map((i) => i.vendorItemId), [1, 2]);
  assert.equal(r.skipped, 1);
  assert.equal(pickOptions([item(1)], 0).skipped, 1);
  assert.equal(pickOptions([item(1)], -3).picked.length, 0);
});

test("목록 조회 건수를 지정할 수 있고 기본값은 그대로다", () => {
  assert.match(listQuery("A1", { maxPerPage: 20 }), /maxPerPage=20/);
  assert.match(listQuery("A1"), /maxPerPage=50/);
});
