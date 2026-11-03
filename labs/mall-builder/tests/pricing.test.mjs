import { test } from "node:test";
import assert from "node:assert/strict";
import { priceLine, cartTotals, MAX_QTY } from "../src/lib/pricing.ts";

const plain = { status: "on_sale", base_price: 47000, stock_mode: "none", stock: 0, option_groups: [] };
const withOptions = {
  status: "on_sale",
  base_price: 47000,
  stock_mode: "product",
  stock: 0,
  option_groups: [{ name: "색상", values: ["화이트", "블랙", "실버"] }],
};
const v = (key, extra_price, stock, is_active = true) => ({ key, values: [key], extra_price, stock, sku: "", is_active });

test("옵션 없는 상품 — 판매가 × 수량", () => {
  const r = priceLine(plain, null, 3);
  assert.equal(r.orderable, true);
  assert.equal(r.unitPrice, 47000);
  assert.equal(r.lineTotal, 141000);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.breakdown, [{ label: "판매가", amount: 47000 }]);
});

test("옵션 추가금이 단가에 더해지고 근거에 남는다", () => {
  const r = priceLine(withOptions, v("블랙", 2000, 7), 2);
  assert.equal(r.unitPrice, 49000);
  assert.equal(r.lineTotal, 98000);
  assert.deepEqual(r.breakdown, [{ label: "판매가", amount: 47000 }, { label: "옵션 추가금", amount: 2000 }]);
  // 음수 추가금
  assert.equal(priceLine(withOptions, v("실버", -1000, 5), 1).unitPrice, 46000);
});

test("판매 상태", () => {
  assert.match(priceLine({ ...plain, status: "sold_out" }, null, 1).errors[0], /품절/);
  assert.match(priceLine({ ...plain, status: "hidden" }, null, 1).errors[0], /판매하지 않는/);
  assert.equal(priceLine({ ...plain, status: "draft" }, null, 1).orderable, false);
});

test("옵션 선택 검사", () => {
  assert.match(priceLine(withOptions, null, 1).errors[0], /옵션을 선택/);
  assert.match(priceLine(withOptions, v("화이트", 0, 3, false), 1).errors[0], /판매하지 않/);
  assert.match(priceLine(plain, v("화이트", 0, 3), 1).errors[0], /옵션이 없는/);
});

test("수량 검사", () => {
  assert.match(priceLine(plain, null, 0).errors[0], /1개 이상/);
  assert.match(priceLine(plain, null, 1.5).errors[0], /1개 이상/);
  assert.match(priceLine(plain, null, MAX_QTY + 1).errors[0], /까지/);
  assert.equal(priceLine(plain, null, MAX_QTY).orderable, true);
});

test("재고 — 옵션별 재고와 상품 재고", () => {
  assert.match(priceLine(withOptions, v("실버", 0, 0), 1).errors[0], /품절/);
  assert.match(priceLine(withOptions, v("블랙", 2000, 7), 8).errors[0], /7개 남았/);
  assert.equal(priceLine(withOptions, v("블랙", 2000, 7), 7).orderable, true);
  const stocked = { ...plain, stock_mode: "product", stock: 2 };
  assert.match(priceLine(stocked, null, 3).errors[0], /2개 남았/);
  assert.match(priceLine({ ...stocked, stock: 0 }, null, 1).errors[0], /품절/);
  // 재고 관리 안 함이면 수량 제한 없음(최대 수량만)
  assert.equal(priceLine(plain, null, 500).orderable, true);
});

test("주문 불가 줄도 금액은 계산해 보여 준다(합계에서는 뺀다)", () => {
  const r = priceLine(withOptions, v("블랙", 2000, 7), 8);
  assert.equal(r.orderable, false);
  assert.equal(r.lineTotal, 392000);
});

test("장바구니 합계 — 주문 가능한 줄만, 배송비는 정책 묶음별", () => {
  const policies = [
    { id: "p1", name: "기본 배송", type: "conditional", base_fee: 3000, free_over: 50000, jeju_fee: 3000, island_fee: 5000, is_default: true },
    { id: "p2", name: "대형", type: "fixed", base_fee: 10000, free_over: null, jeju_fee: 0, island_fee: 0, is_default: false },
  ];
  const lines = [
    { lineTotal: 30000, policyId: null, orderable: true },
    { lineTotal: 25000, policyId: "p1", orderable: true },
    { lineTotal: 99000, policyId: "p2", orderable: true },
    { lineTotal: 70000, policyId: null, orderable: false },
  ];
  const t = cartTotals(lines, policies);
  assert.equal(t.subtotal, 154000);
  assert.equal(t.shipping, 10000); // 기본 묶음 55,000원 → 무료, 대형 10,000원
  assert.equal(t.total, 164000);
  assert.equal(cartTotals(lines, policies, "jeju").shipping, 13000);
  // 주문 가능한 줄이 없으면 배송비도 0
  assert.deepEqual(cartTotals([lines[3]], policies), { subtotal: 0, shipping: 0, total: 0, shippingBreakdown: [] });
});
