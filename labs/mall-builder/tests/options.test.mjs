import { test } from "node:test";
import assert from "node:assert/strict";
import { splitValues, validateGroups, buildVariants, isVariantOrderable, validateVariant, variantKey } from "../src/lib/options.ts";

test("값 나누기 — 공백·빈칸·중복 정리", () => {
  assert.deepEqual(splitValues("빨강, 파랑,파랑 , "), ["빨강", "파랑"]);
  assert.deepEqual(splitValues(""), []);
});

test("조합 만들기 — 2단 × 순서", () => {
  const v = buildVariants([{ name: "색상", values: ["빨강", "파랑"] }, { name: "사이즈", values: ["S", "M"] }]);
  assert.deepEqual(v.map((x) => x.key), ["빨강 / S", "빨강 / M", "파랑 / S", "파랑 / M"]);
  assert.equal(v[0].is_active, true);
  assert.equal(v[0].extra_price, 0);
});

test("옵션이 없으면 조합 없음", () => {
  assert.deepEqual(buildVariants([]), []);
});

test("값을 추가해도 기존 조합 설정은 유지", () => {
  const first = buildVariants([{ name: "색상", values: ["빨강", "파랑"] }]);
  first[1] = { ...first[1], extra_price: 2000, stock: 7, sku: "B-1", is_active: false };
  const next = buildVariants([{ name: "색상", values: ["빨강", "파랑", "검정"] }], first);
  assert.deepEqual(next.map((x) => [x.key, x.extra_price, x.stock, x.sku, x.is_active]), [
    ["빨강", 0, 0, "", true],
    ["파랑", 2000, 7, "B-1", false],
    ["검정", 0, 0, "", true],
  ]);
});

test("옵션 묶음 검사", () => {
  assert.equal(validateGroups([{ name: "색상", values: ["빨강"] }]), null);
  assert.match(validateGroups([{ name: "", values: ["a"] }]), /1~20자/);
  assert.match(validateGroups([{ name: "색상", values: [] }]), /하나 이상/);
  assert.match(validateGroups([{ name: "색상", values: ["a"] }, { name: "색상", values: ["b"] }]), /겹칩니다/);
  const four = ["a", "b", "c", "d"].map((n) => ({ name: n, values: ["1"] }));
  assert.match(validateGroups(four), /3단까지/);
  const big = [{ name: "a", values: Array.from({ length: 20 }, (_, i) => `a${i}`) }, { name: "b", values: Array.from({ length: 20 }, (_, i) => `b${i}`) }];
  assert.match(validateGroups(big), /400개/);
  assert.match(validateGroups([{ name: "a", values: ["x / y"] }]), /「 \/ 」/);
});

test("주문 가능 조합", () => {
  const v = { key: "k", values: ["k"], extra_price: 0, stock: 0, sku: "", is_active: true };
  assert.equal(isVariantOrderable(v, false), true);
  assert.equal(isVariantOrderable(v, true), false);
  assert.equal(isVariantOrderable({ ...v, stock: 3 }, true), true);
  assert.equal(isVariantOrderable({ ...v, stock: 3, is_active: false }, true), false);
});

test("조합 값 검사 — 음수 추가금 허용, 합계는 0원 이상", () => {
  assert.equal(validateVariant({ extra_price: -1000, stock: 0, sku: "" }, 5000), null);
  assert.match(validateVariant({ extra_price: -6000, stock: 0, sku: "" }, 5000), /0원보다/);
  assert.match(validateVariant({ extra_price: 0, stock: -1, sku: "" }, 5000), /재고/);
  assert.equal(variantKey(["빨강", "S"]), "빨강 / S");
});
