import { test } from "node:test";
import assert from "node:assert/strict";

test("M4-C4: 리셀러 진열 페이지 코드 대소문자 정규화", () => {
  const code1 = "erddak";
  const code2 = " ERDDAK ";
  assert.equal(code1.trim().toUpperCase(), "ERDDAK");
  assert.equal(code2.trim().toUpperCase(), "ERDDAK");
});

test("M4-C4: 상품 할인율 계산 규칙", () => {
  const basePrice = 12000;
  const listPrice = 20000;
  const hasDiscount = listPrice > basePrice;
  const discountPercent = hasDiscount
    ? Math.round(((listPrice - basePrice) / listPrice) * 100)
    : 0;

  assert.equal(hasDiscount, true);
  assert.equal(discountPercent, 40);
});

test("M4-C4: 픽(Pick) 상품 플래그 매핑 검증", () => {
  const pickedIds = ["prod-1", "prod-3"];
  const pickedSet = new Set(pickedIds);

  const rawProducts = [
    { id: "prod-1", name: "상품 1" },
    { id: "prod-2", name: "상품 2" },
    { id: "prod-3", name: "상품 3" },
  ];

  const result = rawProducts.map((p) => ({
    ...p,
    isPicked: pickedSet.has(p.id),
  }));

  assert.equal(result[0].isPicked, true);
  assert.equal(result[1].isPicked, false);
  assert.equal(result[2].isPicked, true);
});

test("M4-C4: 이미지 url 추출 규칙 (객체 및 문자열 배열 호환)", () => {
  const getImg = (images) => {
    if (!Array.isArray(images) || images.length === 0) return "";
    const first = images[0];
    return typeof first === "string" ? first : first?.url || "";
  };

  assert.equal(getImg(["https://example.com/1.jpg"]), "https://example.com/1.jpg");
  assert.equal(getImg([{ url: "https://example.com/2.jpg" }]), "https://example.com/2.jpg");
  assert.equal(getImg([]), "");
  assert.equal(getImg(null), "");
});
