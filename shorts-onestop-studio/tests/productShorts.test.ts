import test from "node:test";
import assert from "node:assert/strict";
import { PRODUCT_HASH, normalizeProduct, productBlock, productHandoffHash, readProductHandoff } from "../src/lib/productShorts.ts";
import { REF_HASH } from "../src/lib/reference.ts";

test("넘기기 값 이름이 레퍼런스 대사 넘기기와 겹치지 않는다", () => {
  assert.notEqual(PRODUCT_HASH, REF_HASH);
  assert.equal(readProductHandoff(`#${REF_HASH}=abc`), null);
});

test("보낸 값을 그대로 받는다(한글·&·= 포함)", () => {
  const hash = productHandoffHash({ name: "접이식 & 휴대용 선풍기", points: ["무게 300g", "USB-C=충전", "소음 적음"], offer: "오늘 출발" }, "AI 상세페이지 자동화");
  assert.deepEqual(readProductHandoff(hash), {
    product: { name: "접이식 & 휴대용 선풍기", points: ["무게 300g", "USB-C=충전", "소음 적음"], offer: "오늘 출발" },
    from: "AI 상세페이지 자동화",
  });
});

test("길이·개수 제한과 빈 값 정리", () => {
  const p = normalizeProduct({ name: `  ${"가".repeat(150)} `, points: ["a", "", "b", "c", "d"], offer: 3 });
  assert.equal(p?.name.length, 100);
  assert.deepEqual(p?.points, ["a", "b", "c"]);
  assert.equal(p?.offer, "");
  assert.equal(normalizeProduct({ name: "   " }), null);
  assert.equal(normalizeProduct(null), null);
});

test("깨진 값이 있어도 나머지는 받는다", () => {
  const r = readProductHandoff(`#${PRODUCT_HASH}=%EB%AC%BC%EB%B3%91&product-point=%E0%A4&product-point=%EA%B0%80%EB%B3%8D%EB%8B%A4`);
  assert.deepEqual(r?.product, { name: "물병", points: ["가볍다"], offer: "" });
});

test("상품명이 없으면 넘기기가 아니다", () => {
  assert.equal(productHandoffHash({ name: "", points: [], offer: "" }), "");
  assert.equal(readProductHandoff(`#${PRODUCT_HASH}=`), null);
});

test("프롬프트 블록에는 판매자가 적은 값만 들어간다", () => {
  const block = productBlock({ name: "물병", points: ["가볍다"], offer: "" });
  assert.match(block, /상품명: 물병/);
  assert.match(block, /1\. 가볍다/);
  assert.doesNotMatch(block, /혜택/);
});
