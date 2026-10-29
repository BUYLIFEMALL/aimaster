// 내 쿠팡 상품 목록 정리(외부 호출 없음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { listQuery, normalizeProductList } from "../src/lib/coupang/listing.ts";

test("조회 조건을 만든다(모르는 상태는 빼고 상품명은 20자)", () => {
  assert.equal(listQuery("A001"), "vendorId=A001&maxPerPage=50");
  const q = new URLSearchParams(listQuery("A001", { nextToken: "3", status: "APPROVED", name: "가".repeat(30) }));
  assert.equal(q.get("nextToken"), "3");
  assert.equal(q.get("status"), "APPROVED");
  assert.equal(q.get("sellerProductName").length, 20);
  assert.equal(new URLSearchParams(listQuery("A001", { status: "X" })).get("status"), null);
});

test("목록 응답을 정리하고 다음 쪽 표시를 읽는다", () => {
  const r = normalizeProductList({ code: "SUCCESS", nextToken: "3", data: [
    { sellerProductId: 100000001, sellerProductName: "샘플 상품 A", displayCategoryCode: 12345, brand: "샘플", statusName: "승인완료", createdAt: "2024-01-01T00:00:00" },
    { sellerProductName: "번호 없음" },
  ] });
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0].statusName, "승인완료");
  assert.equal(r.nextToken, "3");
  assert.deepEqual(normalizeProductList(null), { items: [], nextToken: "" });
});
