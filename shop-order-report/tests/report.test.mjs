import test from "node:test";
import assert from "node:assert/strict";
import { guessMapping, guessMarket, isPersonalColumn, missingRequired } from "../src/lib/orders/markets.ts";
import { toOrderLines, mergeLines, normalizeStatus, parseMoney, parseDate } from "../src/lib/orders/parse.ts";
import { summarize, byPeriod, byMarket, byProduct, periodKey, lineProfit, DEFAULT_SETTINGS, productKey, inRange } from "../src/lib/report/aggregate.ts";
import { forecastStock, lastOrderDate } from "../src/lib/report/inventory.ts";
import { toReviews, topWords, complaints, ratingDistribution, averageRating, tokenize } from "../src/lib/report/reviews.ts";
import { estimateSettlement, MARKET_FEES } from "../src/lib/marketFees.ts";
import { aoaToSheet } from "../src/lib/sheet.ts";
import { sampleOrders, SMARTSTORE_HEADERS, COUPANG_HEADERS, SAMPLE_REVIEW_HEADERS, SAMPLE_REVIEWS } from "../src/lib/sample.ts";

const smart = aoaToSheet([SMARTSTORE_HEADERS, ...sampleOrders("smartstore")]);
const coup = aoaToSheet([COUPANG_HEADERS, ...sampleOrders("coupang")]);

test("마켓·열 자동 인식, 개인정보 열은 고르지 않는다", () => {
  assert.equal(guessMarket(SMARTSTORE_HEADERS), "smartstore");
  assert.equal(guessMarket(COUPANG_HEADERS), "coupang");
  assert.equal(guessMarket(["주문번호"], "11번가_주문.xlsx"), "11st");
  const m = guessMapping(SMARTSTORE_HEADERS);
  assert.equal(m.lineNo, "상품주문번호");
  assert.equal(m.amount, "최종 상품별 총 주문금액");
  assert.equal(m.settlement, "정산예정금액");
  assert.deepEqual(missingRequired(m), []);
  const c = guessMapping(COUPANG_HEADERS);
  assert.equal(c.product, "등록상품명");
  assert.equal(c.qty, "구매수");
  assert.equal(c.lineNo, undefined); // 묶음배송번호는 여러 상품을 묶으므로 상품주문번호로 쓰지 않는다
  assert.equal(c.amount, "결제액");
  for (const v of [...Object.values(m), ...Object.values(c)]) assert.equal(isPersonalColumn(v), false, v);
  assert.ok(isPersonalColumn("수취인연락처1") && isPersonalColumn("배송지") && isPersonalColumn("구매자명"));
  assert.equal(isPersonalColumn("구매수"), false);
  assert.ok(isPersonalColumn("수취인 주소"));
});

test("주문 줄에는 개인정보 값이 없다", () => {
  const { lines } = toOrderLines(smart, "smartstore", guessMapping(SMARTSTORE_HEADERS));
  assert.ok(lines.length > 40);
  const text = JSON.stringify(lines);
  assert.ok(!text.includes("홍길동") && !text.includes("010-0000-0000"));
});

test("상태 사전·금액·날짜 읽기", () => {
  assert.equal(normalizeStatus("반품완료"), "return");
  assert.equal(normalizeStatus("취소요청"), "cancel");
  assert.equal(normalizeStatus("교환 수거중"), "exchange");
  assert.equal(normalizeStatus("구매확정"), "done");
  assert.equal(normalizeStatus("배송중"), "shipping");
  assert.equal(normalizeStatus("발송대기"), "new");
  assert.equal(parseMoney("29,900원"), 29900);
  assert.equal(parseMoney("가"), null);
  assert.equal(parseDate("2026.10.3 14:22"), "2026-10-03");
  assert.equal(parseDate("2026-10-24 13:22:11"), "2026-10-24");
  assert.equal(parseDate("46319"), "2026-10-24");
  assert.equal(parseDate("26/10/24"), "2026-10-24");
});

test("빠진 칸이 있는 줄은 이유와 함께 건너뛴다·같은 주문은 합친다", () => {
  const sheet = aoaToSheet([["주문번호", "주문일", "상품명", "수량", "결제금액"], ["A1", "2026-10-01", "사과", "1", "1000"], ["A2", "", "배", "1", "2000"], ["A1", "2026-10-01", "사과", "1", "1000"]]);
  const r = toOrderLines(sheet, "other", guessMapping(sheet.headers));
  assert.equal(r.lines.length, 1);
  assert.deepEqual(r.skipped.map((s) => s.reason), ["주문일을 읽지 못함", "같은 파일 안 중복 줄"]);
  const again = mergeLines(r.lines, [{ ...r.lines[0], status: "return" }]);
  assert.equal(again.added, 0);
  assert.equal(again.updated, 1);
  assert.equal(again.lines[0].status, "return");
});

test("순이익: 정산액 우선, 없으면 수수료 추정, 원가·택배·광고비 차감", () => {
  assert.equal(estimateSettlement(10000, 3000, 13, 3.3), 8700 + 2901);
  const base = { id: "x", market: "coupang", orderNo: "1", orderedAt: "2026-10-01", product: "사과", option: "", qty: 2, amount: 20000, settlement: null, shippingFee: 0, status: "done", statusRaw: "" };
  const st = { ...DEFAULT_SETTINGS, products: { 사과: { unitCost: 5000, packCost: 500 } }, courierPerOrder: 3000, adCost: 1000 };
  const p = lineProfit(base, st);
  assert.equal(p.settlement, Math.round(20000 * (1 - MARKET_FEES.coupang.ratePct / 100)));
  assert.equal(p.cost, 11000);
  const withSettle = lineProfit({ ...base, settlement: 18000 }, st);
  assert.equal(withSettle.profit, 7000);
  assert.equal(lineProfit({ ...base, status: "cancel" }, st).sales, 0);
  const s = summarize([{ ...base, settlement: 18000 }], st);
  assert.equal(s.profit, 18000 - 11000 - 3000 - 1000);
  assert.equal(s.marginPct, 15);
  const own = lineProfit(base, { ...st, products: { 사과: { unitCost: 0, packCost: 0, feePct: 5 } } });
  assert.equal(own.settlement, 19000);
});

test("기간·마켓·상품 묶음", () => {
  assert.equal(periodKey("2026-10-24", "week"), "2026-10-19 주"); // 2026-10-24는 토요일
  assert.equal(periodKey("2026-10-24", "month"), "2026-10");
  const a = toOrderLines(smart, "smartstore", guessMapping(SMARTSTORE_HEADERS)).lines;
  const b = toOrderLines(coup, "coupang", guessMapping(COUPANG_HEADERS)).lines;
  const all = mergeLines(a, b).lines;
  const s = summarize(all, DEFAULT_SETTINGS);
  const months = byPeriod(all, DEFAULT_SETTINGS, "month");
  assert.equal(months.reduce((t, r) => t + r.sales, 0), s.sales);
  assert.equal(byMarket(all, DEFAULT_SETTINGS).length, 2);
  assert.equal(byProduct(all, DEFAULT_SETTINGS).length, 3);
  assert.ok(s.returns > 0 && s.cancel > 0);
  assert.equal(inRange(all, "2026-10-20", "2026-10-24").every((l) => l.orderedAt >= "2026-10-20"), true);
  assert.equal(productKey({ product: "사과", option: "1kg" }), "사과 / 1kg");
});

test("재고 소진 예측", () => {
  const lines = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((d) => ({ id: String(d), market: "other", orderNo: String(d), orderedAt: `2026-10-${String(11 + d).padStart(2, "0")}`, product: "사과", option: "", qty: 2, amount: 1, settlement: 1, shippingFee: 0, status: "done", statusRaw: "" }));
  assert.equal(lastOrderDate(lines), "2026-10-24");
  const f = forecastStock(lines, { 사과: 20, 배: 5 }, "2026-10-24", 14);
  assert.equal(f[0].key, "사과");
  assert.equal(f[0].perDay, 2);
  assert.equal(f[0].daysLeft, 10);
  assert.equal(f[0].level, "warn");
  assert.equal(f.find((x) => x.key === "배").daysLeft, null);
});

test("리뷰 분석", () => {
  const reviews = toReviews(aoaToSheet([SAMPLE_REVIEW_HEADERS, ...SAMPLE_REVIEWS]));
  assert.equal(reviews.length, 6);
  assert.equal(averageRating(reviews), 3.33);
  assert.deepEqual(ratingDistribution(reviews).map((r) => r.count), [2, 1, 1, 1, 1]);
  const c = complaints(reviews);
  assert.equal(c[0].rating, 1);
  assert.ok(c.some((r) => r.text.includes("늦게")));
  assert.ok(tokenize("포장이 꼼꼼해서").includes("포장"));
  assert.ok(topWords(reviews).some((w) => w.word === "포장"));
});
