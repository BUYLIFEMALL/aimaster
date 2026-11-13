// 2026-11-13 원본 사진 참고 수집 규칙(확장 lib/photos.js) 시험
import test from "node:test";
import assert from "node:assert/strict";
import { cleanImageUrl, dailyCount, isAllowedImageUrl, looksBlocked, photoProblem, pickPhotoUrls, productKey } from "../extension/lib/photos.js";
import { mergeProducts, parseCard } from "../extension/lib/parse.js";

test("허용한 이미지 서버만 받는다", () => {
  assert.equal(isAllowedImageUrl("https://thumbnail6.coupangcdn.com/thumbnails/remote/230x230ex/image/a.jpg"), true);
  assert.equal(isAllowedImageUrl("https://shopping-phinf.pstatic.net/main_1/1.jpg"), true);
  assert.equal(isAllowedImageUrl("https://ae01.alicdn.com/kf/a.jpg"), true);
  assert.equal(isAllowedImageUrl("https://evil.example.com/a.jpg"), false);
  assert.equal(isAllowedImageUrl("https://coupangcdn.com.evil.com/a.jpg"), false);
  assert.equal(cleanImageUrl("//thumbnail6.coupangcdn.com/a.jpg"), "https://thumbnail6.coupangcdn.com/a.jpg");
  assert.equal(cleanImageUrl("javascript:alert(1)"), "");
});

test("상품 페이지 주소에서 마켓·번호를 찾는다", () => {
  assert.deepEqual(productKey("https://www.coupang.com/vp/products/123?itemId=1"), { market: "coupang", id: "123" });
  assert.deepEqual(productKey("https://smartstore.naver.com/shop/products/456"), { market: "naver", id: "456" });
  assert.deepEqual(productKey("https://search.shopping.naver.com/catalog/789"), { market: "naver", id: "789" });
  assert.equal(productKey("https://www.coupang.com/np/search?q=a"), null);
});

test("큰 사진 → 작은 사진 → API 순서, 겹치지 않게 3장까지", () => {
  const urls = pickPhotoUrls({
    pageUrls: ["https://image1.coupangcdn.com/big1.jpg", "https://image1.coupangcdn.com/big1.jpg", "https://evil.example.com/x.jpg"],
    itemUrl: "https://thumbnail6.coupangcdn.com/small.jpg",
    apiUrls: ["https://ae01.alicdn.com/a.jpg", "https://ae01.alicdn.com/b.jpg"],
  });
  assert.deepEqual(urls, ["https://image1.coupangcdn.com/big1.jpg", "https://thumbnail6.coupangcdn.com/small.jpg", "https://ae01.alicdn.com/a.jpg"]);
});

test("사진 형식·크기·하루 상한·차단 화면", () => {
  assert.equal(photoProblem("image/jpeg", 1000), "");
  assert.notEqual(photoProblem("text/html", 1000), "");
  assert.notEqual(photoProblem("image/png", 11 * 1024 * 1024), "");
  assert.equal(dailyCount({ day: "2026-11-13", count: 7 }, "2026-11-13"), 7);
  assert.equal(dailyCount({ day: "2026-11-12", count: 7 }, "2026-11-13"), 0);
  assert.equal(looksBlocked({ title: "Access Denied", text: "" }), true);
  assert.equal(looksBlocked({ title: "보온 텀블러", text: "상품 정보" }), false);
});

test("쿠팡 카드 사진 주소를 읽고, 합칠 때 빈 사진 주소를 채운다", () => {
  const card = parseCard({ lines: ["보온 텀블러", "12,900원", "(1,234)"], href: "/vp/products/111", name: "보온 텀블러", image: "//thumbnail6.coupangcdn.com/a.jpg" });
  assert.equal(card.imageUrl, "https://thumbnail6.coupangcdn.com/a.jpg");
  const merged = mergeProducts([{ ...card, imageUrl: "" }], [card]);
  assert.equal(merged[0].imageUrl, "https://thumbnail6.coupangcdn.com/a.jpg");
});
