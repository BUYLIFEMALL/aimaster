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
  // 보낸 순서(판매량순 화면이면 판매 순위)를 1부터 저장한다
  assert.deepEqual(items.map((item) => item.salesRank), [1, 2]);
  assert.deepEqual(mod.sanitizeReviewItems("x"), []);
  assert.equal(mod.COUPANG_RESULT_RETENTION_DAYS, 365);
});

import { DAILY_LIMIT, kstDay, nextGapMinutes, parseKeywords, searchUrl, startProblem, todayRecord } from "../extension/lib/auto.js";

test("자동 검색 키워드는 줄·쉼표로 나누고 중복·빈 칸을 빼며 10개까지만 쓴다", () => {
  assert.deepEqual(parseKeywords(" 스텐 텀블러 \n\n빨대  텀블러, 스텐 텀블러,"), ["스텐 텀블러", "빨대 텀블러"]);
  assert.equal(parseKeywords(Array.from({ length: 15 }, (_, i) => `k${i}`).join("\n")).length, 10);
});

test("자동 검색은 판매량순 1페이지 주소만 연다", () => {
  assert.equal(searchUrl("빨대 텀블러"), "https://www.coupang.com/np/search?q=%EB%B9%A8%EB%8C%80%20%ED%85%80%EB%B8%94%EB%9F%AC&sorter=saleCountDesc");
});

test("하루 상한·오늘 중단·날짜 바뀜을 한국 시간으로 판단한다", () => {
  const night = Date.parse("2026-11-03T15:30:00Z"); // 한국 11-04 00:30
  assert.equal(kstDay(night), "2026-11-04");
  assert.deepEqual(todayRecord({ day: "2026-11-03", count: 30, stopped: true }, night), { day: "2026-11-04", count: 0, stopped: false });
  assert.equal(startProblem([], { count: 0 }), "검색할 키워드를 한 줄에 하나씩 넣어 주세요.");
  assert.match(startProblem(["a"], { count: 0, stopped: true }), /멈췄습니다/);
  assert.match(startProblem(["a"], { count: DAILY_LIMIT }), /상한/);
  assert.match(startProblem(["a", "b", "c"], { count: DAILY_LIMIT - 2 }), /남은 자동 검색은 2개/);
  assert.equal(startProblem(["a", "b"], { count: DAILY_LIMIT - 2 }), null);
});

test("키워드 사이 대기는 3~5분이다", () => {
  assert.equal(nextGapMinutes(0), 3);
  assert.equal(nextGapMinutes(0.999) < 5, true);
});

import { nextScheduleAt, validTime } from "../extension/lib/auto.js";

test("매일 예약: 시각 형식과 다음 시작 시각", () => {
  assert.equal(validTime("09:30"), true);
  assert.equal(validTime("24:00"), false);
  assert.equal(validTime("9:30"), false);
  const morning = new Date(2026, 10, 3, 8, 0).getTime();
  const noon = new Date(2026, 10, 3, 12, 0).getTime();
  assert.equal(nextScheduleAt("09:30", { now: morning }), new Date(2026, 10, 3, 9, 30).getTime());
  assert.equal(nextScheduleAt("09:30", { now: noon }), new Date(2026, 10, 4, 9, 30).getTime());
  // 크롬을 늦게 켰고 오늘 아직 안 돌았으면 1분 뒤, 이미 돌았으면 내일
  assert.equal(nextScheduleAt("09:30", { now: noon, catchUp: true }), noon + 60_000);
  assert.equal(nextScheduleAt("09:30", { now: noon, catchUp: true, lastRunDay: kstDay(noon) }), new Date(2026, 10, 4, 9, 30).getTime());
});

import { isSearchUrl, safetyMessage } from "../extension/lib/auto.js";

test("거부 징후: 검색 화면이 아닌 주소로 튕기면 징후로 본다", () => {
  assert.equal(isSearchUrl("https://www.coupang.com/np/search?q=a&sorter=saleCountDesc"), true);
  assert.equal(isSearchUrl("https://login.coupang.com/login/login.pang"), false);
  assert.equal(isSearchUrl("https://www.coupang.com/"), false);
  assert.match(safetyMessage("blocked", "텀블러"), /「텀블러」.*확인하는 화면.*일시정지/);
});
