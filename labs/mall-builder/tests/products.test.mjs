import { test } from "node:test";
import assert from "node:assert/strict";
import { parseWon, formatWon, discountRate, validateProduct } from "../src/lib/products.ts";

const STORE = "11111111-1111-1111-1111-111111111111";
const ok = (extra = {}) => validateProduct({ name: "에어리셋 공기청정기", base_price: "47,000", ...extra }, STORE);

test("원 단위 읽기", () => {
  assert.equal(parseWon("12,000"), 12000);
  assert.equal(parseWon(" 5000원 "), 5000);
  assert.equal(parseWon(""), null);
  assert.ok(Number.isNaN(parseWon("만원")));
  assert.ok(Number.isNaN(parseWon("-100")));
  assert.equal(formatWon(1234567), "1,234,567원");
});

test("할인율 — 정가 대비 내림", () => {
  assert.equal(discountRate(47000, 122000), 61);
  assert.equal(discountRate(29000, 39000), 25);
  assert.equal(discountRate(10000, null), 0);
  assert.equal(discountRate(10000, 9000), 0);
});

test("기본값 — 준비 중·과세·재고 관리 안 함", () => {
  const r = ok();
  assert.equal(r.ok, true);
  assert.deepEqual(
    r.ok && { status: r.value.status, tax: r.value.tax_type, mode: r.value.stock_mode, stock: r.value.stock, price: r.value.base_price },
    { status: "draft", tax: "taxable", mode: "none", stock: 0, price: 47000 },
  );
});

test("필수·형식 오류", () => {
  const r = validateProduct({ name: "", base_price: "abc", list_price: "x", cost: "원가" }, STORE);
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(r.ok ? {} : r.errors).sort(), ["base_price", "cost", "list_price", "name"]);
});

test("정가가 판매가보다 작으면 거부", () => {
  const r = ok({ list_price: "40000" });
  assert.equal(r.ok, false);
  assert.ok(!r.ok && r.errors.list_price);
});

test("재고 관리 시 수량 필수", () => {
  assert.equal(ok({ stock_mode: "product", stock: "" }).ok, false);
  const r = ok({ stock_mode: "product", stock: "30" });
  assert.equal(r.ok && r.value.stock, 30);
  assert.equal(ok({ stock_mode: "none", stock: "30" }).ok && ok({ stock_mode: "none", stock: "30" }).value.stock, 0);
});

test("사진 — 5장 제한, 다른 몰 경로 거부", () => {
  const img = (i, store = STORE) => ({ url: `https://x/${i}.jpg`, path: `${store}/products/${i}.jpg` });
  assert.equal(ok({ images: JSON.stringify([img(1), img(2)]) }).ok, true);
  assert.equal(ok({ images: JSON.stringify([1, 2, 3, 4, 5, 6].map((i) => img(i))) }).ok, false);
  assert.equal(ok({ images: JSON.stringify([img(1, "22222222-2222-2222-2222-222222222222")]) }).ok, false);
  assert.equal(ok({ images: "{깨진" }).ok, false);
});

test("카테고리 — 중복·형식 틀린 값 제거", () => {
  const id = "8f8e1fab-8344-4751-97a9-c9aba3842954";
  const r = ok({ category_ids: [id, id, "bad"] });
  assert.deepEqual(r.ok && r.value.category_ids, [id]);
});

test("알 수 없는 상태는 준비 중으로", () => {
  assert.equal(ok({ status: "deleted" }).ok && ok({ status: "deleted" }).value.status, "draft");
  assert.equal(ok({ status: "on_sale" }).ok && ok({ status: "on_sale" }).value.status, "on_sale");
});

test("F13 등급가 칸 읽기", async () => {
  const { parseGradePrice } = await import("../src/lib/products.ts");
  assert.deepEqual(parseGradePrice(""), { ok: true, value: null });
  assert.deepEqual(parseGradePrice("8,000원"), { ok: true, value: { price: 8000, discount_rate: null } });
  assert.deepEqual(parseGradePrice("15%"), { ok: true, value: { price: null, discount_rate: 15 } });
  assert.equal(parseGradePrice("0%").ok, false);
  assert.equal(parseGradePrice("100%").ok, false);
  assert.equal(parseGradePrice("abc").ok, false);
});

test("F13 보이기·가격 공개 범위 기본값과 허용값", async () => {
  const { validateProduct } = await import("../src/lib/products.ts");
  const base = { name: "a", base_price: "1000" };
  const d = validateProduct(base);
  assert.equal(d.ok && d.value.visibility, "public");
  assert.equal(d.ok && d.value.price_visibility, "all");
  const b = validateProduct({ ...base, visibility: "business_only", price_visibility: "approved_business" });
  assert.equal(b.ok && b.value.visibility, "business_only");
  assert.equal(b.ok && b.value.price_visibility, "approved_business");
  const x = validateProduct({ ...base, visibility: "hack", price_visibility: "hack" });
  assert.equal(x.ok && x.value.visibility, "public");
});
