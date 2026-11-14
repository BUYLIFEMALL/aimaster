// D34 공급사 상태 규칙 — DB 함수(0053)와 같은 규칙인지
import { test } from "node:test";
import assert from "node:assert/strict";
import { inviteAlive, isInviteToken, nextStatuses, rateSplit, rateSupply, SUPPLIER_STATUS_LABEL } from "../src/lib/supplier.ts";

test("상태별로 고를 수 있는 다음 상태", () => {
  assert.deepEqual(nextStatuses("invited"), ["invited", "revoked"]);
  assert.deepEqual(nextStatuses("active"), ["active", "paused"]);
  assert.deepEqual(nextStatuses("paused"), ["active", "paused"]);
  assert.deepEqual(nextStatuses("revoked"), []);
});

test("초대 링크 살아 있음 판정", () => {
  const now = Date.parse("2026-11-11T00:00:00Z");
  assert.equal(inviteAlive({ status: "invited", invite_expires_at: "2026-11-12T00:00:00Z" }, now), true);
  assert.equal(inviteAlive({ status: "invited", invite_expires_at: "2026-11-10T00:00:00Z" }, now), false);
  assert.equal(inviteAlive({ status: "active", invite_expires_at: "2026-11-12T00:00:00Z" }, now), false);
  assert.equal(inviteAlive({ status: "invited", invite_expires_at: null }, now), false);
});

test("토큰 모양과 상태 글자", () => {
  assert.equal(isInviteToken("a".repeat(48)), true);
  assert.equal(isInviteToken("A".repeat(48)), false);
  assert.equal(isInviteToken("a".repeat(47)), false);
  assert.equal(SUPPLIER_STATUS_LABEL.paused, "쉬는 중");
});

test("공급사 상품 노출과 마진", async () => {
  const { supplierProductLive, marginOf } = await import("../src/lib/supplier.ts");
  assert.equal(supplierProductLive({ approval: "approved", status: "on_sale" }, "active"), true);
  assert.equal(supplierProductLive({ approval: "pending", status: "on_sale" }, "active"), false);
  assert.equal(supplierProductLive({ approval: "approved", status: "on_sale" }, "paused"), false);
  assert.equal(supplierProductLive({ approval: "approved", status: "hidden" }, "active"), false);
  assert.deepEqual(marginOf(15000, 10000), { won: 5000, rate: 33.3 });
  assert.deepEqual(marginOf(0, 0), { won: 0, rate: 0 });
});

test("월별 정산서", async () => {
  const { monthKst, monthlySummary } = await import("../src/lib/supplier.ts");
  assert.equal(monthKst("2026-10-31T15:30:00Z"), "2026-11"); // 한국 시각 11월 1일 00:30
  assert.equal(monthKst("2026-10-31T14:30:00Z"), "2026-10");
  const rows = monthlySummary([
    { kind: "earn", amount: 20000, created_at: "2026-11-02T00:00:00Z" },
    { kind: "settle", amount: -5000, created_at: "2026-11-03T00:00:00Z" },
    { kind: "reclaim", amount: -20000, created_at: "2026-11-04T00:00:00Z" },
    { kind: "earn", amount: 7000, created_at: "2026-10-10T00:00:00Z" },
  ]);
  assert.deepEqual(rows[0], { month: "2026-11", earned: 20000, reclaimed: -20000, settled: 5000, net: 0 });
  assert.deepEqual(rows[1], { month: "2026-10", earned: 7000, reclaimed: 0, settled: 0, net: 7000 });
});

test("옵션 추가 판매가 기본값(마진 비율) — DB default_extra_sale과 같음", async () => {
  const { defaultExtraSale, isSupplierShippingType } = await import("../src/lib/supplier.ts");
  assert.equal(defaultExtraSale(1000, 13000, 10000), 1300);
  assert.equal(defaultExtraSale(2000, 13000, 10000), 2600);
  assert.equal(defaultExtraSale(333, 10000, 9000), 370); // 반올림
  assert.equal(defaultExtraSale(500, 13000, 0), 500); // 공급가 0이면 같은 금액
  assert.equal(defaultExtraSale(0, 13000, 10000), 0);
  assert.ok(isSupplierShippingType("conditional"));
  assert.ok(!isSupplierShippingType("weird"));
});

// M1-2(0068) 공급가 = 판매가 × (1 − 본사율 − 리셀러율), DB rate_supply와 같은 값(시나리오 0068과 같은 수)
test("rateSupply — 마스터 플랜 예시와 시나리오 값", () => {
  assert.equal(rateSupply(10000, 3, 0), 9700);
  assert.equal(rateSupply(10000, 3, 10), 8700);
  assert.equal(rateSupply(10000, 5, 10), 8500);
  assert.equal(rateSupply(12000, 5, 10), 10200);
  assert.equal(rateSupply(12000, 3, 10), 10440);
  assert.equal(rateSupply(1000, 3, 10), 870);
  assert.equal(rateSupply(9999, 3, 10), 8699); // 원 단위 버림
  assert.equal(rateSupply(10000, 3.5, 12.25), 8425);
  assert.equal(rateSupply(-5, 3, 10), 0);
});

test("rateSplit — 세 몫의 합이 판매가", () => {
  const s = rateSplit(10000, 3, 10);
  assert.deepEqual(s, { supply: 8700, reseller: 1000, hq: 300 });
  const t = rateSplit(9999, 3, 10);
  assert.equal(t.supply + t.reseller + t.hq, 9999);
});

// ── M3-S2·S3 기간·판매 요약
import { periodRange, todayKst, summarizeSupplierSales } from "../src/lib/supplier.ts";

test("todayKst: UTC 15시 이후는 한국 다음 날", () => {
  assert.equal(todayKst(new Date("2026-11-14T15:30:00Z")), "2026-11-15");
  assert.equal(todayKst(new Date("2026-11-14T14:59:00Z")), "2026-11-14");
});

test("periodRange: 오늘·7일·30일·이번 달·지난 달(연 넘김)·전체", () => {
  assert.deepEqual(periodRange("today", "2026-11-15"), { from: "2026-11-15", to: "2026-11-15" });
  assert.deepEqual(periodRange("7d", "2026-11-15"), { from: "2026-11-09", to: "2026-11-15" });
  assert.deepEqual(periodRange("30d", "2026-11-15"), { from: "2026-10-17", to: "2026-11-15" });
  assert.deepEqual(periodRange("month", "2026-11-15"), { from: "2026-11-01", to: "2026-11-15" });
  assert.deepEqual(periodRange("lastmonth", "2026-01-10"), { from: "2025-12-01", to: "2025-12-31" });
  assert.deepEqual(periodRange("all", "2026-11-15"), { from: null, to: null });
});

test("summarizeSupplierSales: 합계·리셀러 비중·상품 순위, 남은 수량 0 제외", () => {
  const R = (o) => ({ item_id: "i", order_no: "T-1", ordered_at: "", order_status: "paid", product_id: "p1", name: "티셔츠", option: null, qty: 1, sales: 10000, supply: 8700, reseller: 1200, hq: 100, reseller_code: "R1", ...o });
  const s = summarizeSupplierSales([
    R({}),
    R({ order_no: "T-2", reseller: 0, hq: 1300, reseller_code: null }),
    R({ order_no: "T-3", product_id: "p2", name: "컵", qty: 2, sales: 6000, supply: 5000, reseller: 0, hq: 1000, reseller_code: null }),
    R({ order_no: "T-4", qty: 0, sales: 0, supply: 0, reseller: 0, hq: 0 }),
  ]);
  assert.deepEqual([s.orders, s.qty, s.sales, s.supply, s.reseller, s.hq, s.resellerSales, s.resellers], [3, 4, 26000, 22400, 1200, 2400, 10000, 1]);
  assert.deepEqual(s.top.map((t) => [t.name, t.qty, t.supply]), [["티셔츠", 2, 17400], ["컵", 2, 5000]]);
});
