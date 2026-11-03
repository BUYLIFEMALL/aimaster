import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { filterProducts, isExpired, mergeProducts, pageState, parseCard, toCsv } from "../extension/lib/parse.js";

// 2026-11-01 쿠팡 검색 화면에서 실제로 읽은 카드 글자
const ad = parseCard({
  lines: ["허니앤버니 텀블러 대용량", "할인", "34,800원", "17%", "28,700원", "(1개당 28,700원)", "내일(월) 도착 보장", "무료배송", "(1,981)", "최대 1,435원 적립", "광고"],
  href: "https://www.coupang.com/vp/products/8640872937?itemId=1",
});
const one = parseCard({ lines: ["국내산 세척솔", "8,900원", "무료배송", "(1)", "최대 445원 적립", "5"], href: "/vp/products/9470180524" });
const none = parseCard({ lines: ["온빛5 세척솔 리필", "6,300원", "배송비 2,800원", "최대 315원 적립", "6"], href: "/vp/products/9790877505" });

test("카드에서 판매가·리뷰 수·광고를 읽는다", () => {
  assert.deepEqual(ad, { id: "8640872937", name: "허니앤버니 텀블러 대용량", price: 28700, reviews: 1981, isAd: true, url: "https://www.coupang.com/vp/products/8640872937" });
  assert.equal(one.reviews, 1);
  assert.equal(none.reviews, 0);
  assert.equal(none.price, 6300);
});

// 2026-11-03 판매량순 화면: 혜택 줄이 상품명보다 위에 붙는 카드
test("혜택 줄이 위에 있어도 상품명 칸의 이름을 쓴다", () => {
  const lines = ["와우 710원 캐시 적립", "스탠리 퀜처 H2.0 텀블러, 887ml", "42,300원", "(48,641)"];
  const withName = parseCard({ lines, href: "/vp/products/8179126315", name: "스탠리 퀜처 H2.0 텀블러, 887ml" });
  assert.equal(withName.name, "스탠리 퀜처 H2.0 텀블러, 887ml");
  assert.equal(withName.reviews, 48641);
  // 상품명 칸을 못 찾으면 혜택 줄을 건너뛴 첫 줄
  assert.equal(parseCard({ lines, href: "/vp/products/8179126315" }).name, "스탠리 퀜처 H2.0 텀블러, 887ml");
});

// 2026-11-03 판매량순 화면: 「960원 / 와우 가입 쿠폰」 쿠폰 금액 줄이 판매가 뒤에 붙는 카드
test("쿠폰 금액 줄이 있어도 할인율 다음의 판매가를 쓴다", () => {
  const card = parseCard({
    lines: ["글라스락 텀블락 2p", "쿠폰할인", "33,480원", "37%", "20,970원", "960원", "와우 가입 쿠폰", "내일(수) 도착 보장", "(465)"],
    href: "/vp/products/1",
  });
  assert.equal(card.price, 20970);
  assert.equal(parseCard({ lines: ["상품", "9,500원", "(1개당 9,500원)", "(3)"], href: "/vp/products/2" }).price, 9500);
});

test("리뷰 기준과 광고 제외로 거르고 읽은 순서(판매 순위)를 지킨다", () => {
  const items = [none, one, ad];
  const shown = filterProducts(items, { minReviews: 1, excludeAds: false });
  assert.deepEqual(shown.map((i) => i.reviews), [1, 1981]);
  assert.deepEqual(shown.map((i) => i.rank), [2, 3]);
  assert.deepEqual(filterProducts(items, { minReviews: 2, excludeAds: false }).map((i) => i.reviews), [1981]);
  assert.deepEqual(filterProducts(items, { minReviews: 1, excludeAds: true }).map((i) => i.reviews), [1]);
});

test("같은 상품번호를 합치고 일반 노출이 있으면 광고로 보지 않는다", () => {
  const merged = mergeProducts([ad], [{ ...ad, reviews: 2000, isAd: false, price: 1 }, one]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].reviews, 2000);
  assert.equal(merged[0].isAd, false);
  assert.equal(merged[0].price, 28700);
});

test("화면 상태를 구분하고 상품이 있으면 차단 낱말을 무시한다", () => {
  assert.equal(pageState({ cardCount: 3, title: "", text: "자외선 차단 Access Denied" }), "ok");
  assert.equal(pageState({ cardCount: 0, title: "Access Denied", text: "" }), "blocked");
  assert.equal(pageState({ cardCount: 0, title: "쿠팡", text: "'텀블러'에 대한 검색결과가 없습니다." }), "no-result");
  assert.equal(pageState({ cardCount: 0, title: "쿠팡", text: "" }), "unknown");
});

test("CSV는 BOM과 수식 방지를 넣는다", () => {
  const csv = toCsv([{ name: '=1+1 "특가"', price: 100, reviews: 3, isAd: false, url: "u" }]);
  assert.ok(csv.startsWith("﻿\"상품명\""));
  assert.ok(csv.includes(`"'=1+1 ""특가"""`));
  // 순위가 있으면(확장 목록) 맨 앞에 순위 칸
  const ranked = toCsv([{ rank: 3, name: "텀블러", price: 100, reviews: 3, isAd: false, url: "u" }]);
  assert.ok(ranked.startsWith("﻿\"순위\",\"상품명\""));
  assert.ok(ranked.includes(`"3","텀블러"`));
});

test("1년(365일) 지난 저장본은 만료로 본다", () => {
  const now = 100 * 24 * 60 * 60 * 1000;
  assert.equal(isExpired(now - 364 * 24 * 60 * 60 * 1000, now), false);
  assert.equal(isExpired(now - 366 * 24 * 60 * 60 * 1000, now), true);
  assert.equal(isExpired(undefined, now), true);
});

test("서버 저장 자료를 다시 만들어 주소 위조와 잘못된 값을 막는다", async () => {
  const out = await build({ entryPoints: [fileURLToPath(new URL("../lib/coupangResults.ts", import.meta.url))], bundle: true, format: "esm", write: false, platform: "node" });
  const mod = await import("data:text/javascript;base64," + Buffer.from(out.outputFiles[0].text).toString("base64"));
  const items = mod.sanitizeReviewItems([
    { id: "123", name: " 상품 ", price: 1000, reviews: 5, isAd: true, url: "https://evil.example" },
    { id: "123", name: "중복", price: 1, reviews: 1 },
    { id: "abc", name: "번호 틀림" },
    { id: "456", name: "x".repeat(400), price: -1, reviews: "많음" },
  ]);
  assert.equal(items.length, 2);
  assert.equal(items[0].url, "https://www.coupang.com/vp/products/123");
  assert.equal(items[0].name, "상품");
  assert.equal(items[1].name.length, 300);
  assert.equal(items[1].price, null);
  assert.equal(items[1].reviews, 0);
  assert.deepEqual(mod.sanitizeReviewItems("x"), []);
  assert.equal(mod.COUPANG_RESULT_RETENTION_DAYS, 365);
});
