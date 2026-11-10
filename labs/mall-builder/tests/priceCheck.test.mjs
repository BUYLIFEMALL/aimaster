import { test } from "node:test";
import assert from "node:assert/strict";
import { checkPrices, marginOf } from "../src/lib/priceCheck.ts";

const prod = (o = {}) => ({
  id: "p1", name: "복사지", product_code: "P1", cost: 18000,
  base_price: 25000, option_groups: [], status: "on_sale", stock_mode: "none", stock: null,
  visibility: "public", price_visibility: "public", moq: null, order_unit: null, max_qty: null, ...o,
});
const input = (o = {}) => ({ products: [prod()], grades: [], gradePrices: new Map(), tiers: new Map(), customers: [], minMargin: 10, ...o });

test("마진 계산", () => {
  assert.equal(marginOf(20000, 18000), 10);
  assert.equal(marginOf(15000, 18000), -20);
});

test("판매가 마진이 넉넉하면 경고 없음", () => {
  const r = checkPrices(input());
  assert.equal(r.rows.length, 0);
  assert.equal(r.checked, 1);
});

test("원가 없는 상품은 따로 모은다", () => {
  const r = checkPrices(input({ products: [prod({ cost: null })] }));
  assert.equal(r.checked, 0);
  assert.deepEqual(r.noCost, [{ id: "p1", name: "복사지" }]);
});

test("등급가·그 위 수량 할인까지 본다", () => {
  const r = checkPrices(input({
    grades: [{ id: "g1", name: "도매" }],
    gradePrices: new Map([["p1", new Map([["g1", { price: 20500, discount_rate: null }]])]]),
    tiers: new Map([["p1", [{ min_qty: 10, discount_type: "rate", value: 5 }, { min_qty: 100, discount_type: "amount", value: 3000 }]]]),
  }));
  const where = r.rows.map((x) => x.where);
  assert.ok(where.includes("등급가(도매) + 수량 할인(100개 이상)")); // 20500-3000=17500 < 원가
  assert.ok(!where.includes("등급가(도매)")); // 20500 → 12.1% 는 기준 위
  const loss = r.rows.find((x) => x.where.startsWith("등급가(도매) +"));
  assert.equal(loss.price, 17500);
  assert.equal(loss.level, "loss");
  assert.ok(where.includes("수량 할인(100개 이상)") === false); // 25000-3000=22000 → 18.2%
});

test("거래처 특가는 상품별이 기본 할인율보다 우선, 수량 할인 없음", () => {
  const r = checkPrices(input({
    tiers: new Map([["p1", [{ min_qty: 10, discount_type: "rate", value: 50 }]]]),
    customers: [
      { id: "c1", label: "가나상사", base: { price: null, discount_rate: 30 }, byProduct: new Map([["p1", { price: 19500, discount_rate: null }]]) },
      { id: "c2", label: "다라유통", base: { price: null, discount_rate: 25 }, byProduct: new Map() },
    ],
  }));
  const c1 = r.rows.find((x) => x.where === "거래처 가나상사 특가");
  assert.equal(c1.price, 19500); // 7.7% 낮음
  assert.equal(c1.level, "low");
  const c2 = r.rows.find((x) => x.where === "거래처 다라유통 기본 할인");
  assert.equal(c2.price, 18750); // 25% 할인 → 4%
  // 판매가 + 50% 수량 할인 = 12500 손해
  assert.equal(r.rows[0].where, "수량 할인(10개 이상)");
  assert.equal(r.rows[0].level, "loss");
});

test("마진 낮은 순으로 정렬", () => {
  const r = checkPrices(input({
    products: [prod(), prod({ id: "p2", name: "토너", cost: 9000, base_price: 9500 })],
    customers: [{ id: "c1", label: "A", base: { price: null, discount_rate: 20 }, byProduct: new Map() }],
  }));
  for (let i = 1; i < r.rows.length; i++) assert.ok(r.rows[i - 1].margin <= r.rows[i].margin);
});
