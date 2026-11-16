// 실행: node --test tests/   — M2-9 운영사 상품 목록 조건·일괄 변경 id 정리(2026-11-15)
import { test } from "node:test";
import assert from "node:assert/strict";
import { PRODUCT_BULK_MAX, applyProductFilters, cleanProductIds, parseProductListQuery, productListHref, productPageCount, productSearchFilter } from "../src/lib/product-list.ts";

const CAT = "11111111-2222-3333-4444-555555555555";

test("주소 조건 읽기 — 잘못된 상태·카테고리는 버림", () => {
  assert.deepEqual(parseProductListQuery({}), { status: undefined, category: undefined, noStock: false, pending: false, supplier: undefined, q: "", page: 1 });
  const f = parseProductListQuery({ status: "on_sale", category: CAT.toUpperCase(), no_stock: "1", pending: "1", q: "  티셔츠%  ", page: "2" });
  assert.deepEqual(f, { status: "on_sale", category: CAT, noStock: true, pending: true, supplier: undefined, q: "티셔츠", page: 2 });
  assert.equal(parseProductListQuery({ status: "deleted", category: "x" }).status, undefined);
  assert.equal(parseProductListQuery({ category: "not-uuid" }).category, undefined);
});

test("검색 조건 — 상품명·품번", () => {
  assert.equal(productSearchFilter(""), null);
  assert.equal(productSearchFilter("AB-1"), "name.ilike.%AB-1%,product_code.ilike.%AB-1%");
});

test("목록 주소 — 조건 유지", () => {
  const f = parseProductListQuery({ status: "sold_out", no_stock: "1", q: "a" });
  assert.equal(productListHref("/p", f, {}), "/p?status=sold_out&no_stock=1&q=a");
  assert.equal(productListHref("/p", f, { status: undefined, page: 3 }), "/p?no_stock=1&q=a&page=3");
  assert.equal(productPageCount(50), 1);
  assert.equal(productPageCount(51), 2);
});

test("조건 붙이기 — 재고 0·승인 대기·카테고리(없으면 빈 결과)", () => {
  const calls = [];
  const q = new Proxy({}, { get: (_, m) => (...a) => (calls.push([m, ...a]), q) });
  applyProductFilters(q, parseProductListQuery({ status: "on_sale", no_stock: "1", pending: "1", category: CAT }), []);
  assert.deepEqual(calls.slice(0, 4), [["eq", "status", "on_sale"], ["eq", "stock_mode", "product"], ["lte", "stock", 0], ["eq", "approval", "pending"]]);
  assert.deepEqual(calls[4], ["in", "id", ["00000000-0000-0000-0000-000000000000"]]);
});

test("공급사별 보기 — 공급사 id·운영사 직접(own)만 받고 조건·주소에 반영(2026-11-16)", () => {
  assert.equal(parseProductListQuery({ supplier: CAT.toUpperCase() }).supplier, CAT);
  assert.equal(parseProductListQuery({ supplier: "OWN" }).supplier, "own");
  assert.equal(parseProductListQuery({ supplier: "abc" }).supplier, undefined);
  const calls = [];
  const q = new Proxy({}, { get: (_, m) => (...a) => (calls.push([m, ...a]), q) });
  applyProductFilters(q, parseProductListQuery({ supplier: CAT }));
  applyProductFilters(q, parseProductListQuery({ supplier: "own" }));
  assert.deepEqual(calls, [["eq", "supplier_id", CAT], ["is", "supplier_id", null]]);
  assert.equal(productListHref("/p", parseProductListQuery({ supplier: "own", q: "a" }), { page: 2 }), "/p?supplier=own&q=a&page=2");
});

test("일괄 변경 id 정리 — uuid만, 중복 제거, 최대 개수", () => {
  assert.deepEqual(cleanProductIds([CAT, CAT.toUpperCase(), "x", null, ""]), [CAT]);
  const many = Array.from({ length: PRODUCT_BULK_MAX + 10 }, (_, i) => `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`);
  assert.equal(cleanProductIds(many).length, PRODUCT_BULK_MAX);
});
