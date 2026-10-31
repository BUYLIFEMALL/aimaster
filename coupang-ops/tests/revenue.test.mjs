// 매출·정산 계산(외부 호출 없음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkRevenueRange, defaultRevenueRange, normalizeRevenue, normalizeSettlements, revenueQuery, revenueToTsv, revenueWarnings, runoutDays, summarizeOptions } from "../src/lib/coupang/revenue.ts";
import { guessMapping, guessMarket, isPersonalColumn, missingRequired } from "../../shop-order-report/src/lib/orders/markets.ts";
import { normalizeStatus } from "../../shop-order-report/src/lib/orders/parse.ts";

const NOW = Date.parse("2026-10-31T12:00:00+09:00");
const raw = { code: 200, hasNext: false, nextToken: "", data: [
  { orderId: 1, saleType: "SALE", saleDate: "2026-10-01", recognitionDate: "2026-10-08", settlementDate: "2026-11-20", deliveryFee: { amount: 3000, settlementAmount: 2900 }, items: [
    { vendorItemId: 10, productName: "백팩", vendorItemName: "백팩, 블랙, L", quantity: 2, salePrice: 100000, saleAmount: 100000, serviceFee: 9000, serviceFeeVat: 900, serviceFeeRatio: 9, settlementAmount: 90100, sellerDiscountCoupon: 1000, downloadableCoupon: 0 },
  ] },
  { orderId: 2, saleType: "REFUND", saleDate: "2026-10-02", settlementDate: "2026-11-20", deliveryFee: {}, items: [
    { vendorItemId: 10, productName: "백팩", vendorItemName: "백팩, 블랙, L", quantity: 1, saleAmount: 50000, serviceFee: 4500, serviceFeeVat: 450, settlementAmount: 45050 },
  ] },
  { orderId: 0, saleType: "SALE", items: [{ vendorItemId: 0 }] },
] };

test("기간을 명세 범위로 검사한다", () => {
  const r = defaultRevenueRange(NOW);
  assert.deepEqual(r, { from: "2026-10-01", to: "2026-10-30" });
  assert.equal(checkRevenueRange(r.from, r.to, NOW), "");
  assert.match(checkRevenueRange("2026-10-01", "2026-10-31", NOW), /어제|30일/);
  assert.match(checkRevenueRange("2026-09-29", "2026-10-29", NOW), /30일/);
  assert.match(checkRevenueRange("2026-10-20", "2026-10-10", NOW), /늦습니다/);
  assert.match(checkRevenueRange("어제", "2026-10-10", NOW), /날짜/);
  assert.match(revenueQuery("A1", r), /token=&/);
});

test("반품은 음수로 바꾸고 빈 줄을 버린다", () => {
  const { lines, shipping, nextToken } = normalizeRevenue(raw);
  assert.equal(lines.length, 2);
  assert.equal(lines[1].qty, -1);
  assert.equal(lines[1].saleAmount, -50000);
  assert.equal(lines[1].fee, -4950);
  assert.deepEqual(shipping, [{ orderId: "1", amount: 3000, settlement: 2900 }]);
  assert.equal(nextToken, "");
  assert.equal(normalizeRevenue(null).lines.length, 0);
});

test("원가가 없으면 순이익을 만들지 않고, 있으면 실제 값으로 계산한다", () => {
  const { lines } = normalizeRevenue(raw);
  const none = summarizeOptions(lines, {})[0];
  assert.equal(none.profit, null);
  assert.equal(none.feeRate, 9.9);
  assert.equal(none.netQty, 1);
  const withCost = summarizeOptions(lines, { 10: 20000 })[0];
  assert.equal(withCost.profit, 90100 - 45050 - 1000 - 20000);
  assert.equal(withCost.margin, 48.1);
  assert.equal(summarizeOptions(lines, { 10: 0 })[0].profit, 44050);
});

test("주의 항목을 규칙으로 찾는다", () => {
  const row = { vendorItemId: 1, productName: "p", optionName: "o", soldQty: 10, refundQty: 2, margin: 8 };
  assert.equal(revenueWarnings([row], 15).length, 2);
  assert.equal(revenueWarnings([{ ...row, soldQty: 3, refundQty: 2, margin: null }], 15).length, 0);
  assert.equal(revenueWarnings([{ ...row, refundQty: 0, margin: 15 }], 15).length, 0);
});

test("소진일은 순판매가 있을 때만 계산한다", () => {
  assert.equal(runoutDays(30, 30, 30), 30);
  assert.equal(runoutDays(5, 30, 30), 5);
  assert.equal(runoutDays(30, 0, 30), null);
  assert.equal(runoutDays(30, -1, 30), null);
});

test("주문 리포트가 파일을 그대로 알아본다(양쪽 계약)", () => {
  const tsv = revenueToTsv(normalizeRevenue(raw).lines);
  const [headLine, first, second] = tsv.split("\r\n");
  const headers = headLine.split("\t");
  assert.ok(!headers.some(isPersonalColumn));
  const map = guessMapping(headers);
  assert.deepEqual(missingRequired(map), []);
  assert.equal(map.orderNo, "주문번호");
  assert.equal(map.product, "등록상품명");
  assert.equal(map.option, "등록옵션명");
  assert.equal(map.qty, "구매수");
  assert.equal(map.amount, "결제액");
  assert.equal(map.settlement, "정산예정금액");
  assert.equal(guessMarket(headers, "쿠팡_매출_2026-10-01_2026-10-30.tsv"), "coupang");
  const cells = first.split("\t");
  assert.equal(cells.length, headers.length);
  assert.equal(cells[headers.indexOf("등록옵션명")], "백팩, 블랙, L"); // 쉼표가 있어도 칸이 밀리지 않는다
  assert.equal(normalizeStatus(cells[headers.indexOf("주문상태")]), "done");
  assert.equal(normalizeStatus(second.split("\t")[headers.indexOf("주문상태")]), "return");
});

test("지급내역에서 계좌 정보를 읽지 않는다", () => {
  const rows = normalizeSettlements([{ settlementType: "MONTHLY", settlementDate: "2026-10-10", totalSale: 100, serviceFee: 10, finalAmount: 90, status: "DONE", bankAccount: "110-***", bankAccountHolder: "홍길동", bankName: "은행" }]);
  assert.equal(rows[0].type, "월 정산");
  assert.equal(rows[0].done, true);
  assert.ok(!JSON.stringify(rows).includes("홍길동"));
  assert.ok(!JSON.stringify(rows).includes("110"));
  assert.equal(normalizeSettlements({ data: [] }).length, 0);
  assert.equal(normalizeSettlements(null).length, 0);
});
