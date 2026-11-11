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

// F13 — 보는 사람·등급가·가격 비공개·사업자 전용
const b2b = { ...plain, base_price: 10000 };

test("등급가 — 금액 지정·할인율, 옵션 추가금은 그대로 더함", () => {
  const byPrice = priceLine(b2b, null, 2, { viewer: "business", gradePrice: { price: 8000, discount_rate: null }, gradeName: "사업자" });
  assert.equal(byPrice.unitPrice, 8000);
  assert.equal(byPrice.lineTotal, 16000);
  assert.deepEqual(byPrice.breakdown, [{ label: "판매가", amount: 10000 }, { label: "등급가(사업자)", amount: -2000 }]);
  const byRate = priceLine(b2b, null, 1, { viewer: "business", gradePrice: { price: null, discount_rate: 15 }, gradeName: "사업자" });
  assert.equal(byRate.unitPrice, 8500);
  // 원 단위 내림: 9,999 × 0.85 = 8,499.15 → 8,499
  assert.equal(priceLine({ ...b2b, base_price: 9999 }, null, 1, { viewer: "business", gradePrice: { price: null, discount_rate: 15 } }).unitPrice, 8499);
  const opt = { ...withOptions, base_price: 10000 };
  assert.equal(priceLine(opt, v("블랙", 2000, 7), 1, { viewer: "business", gradePrice: { price: 8000, discount_rate: null } }).unitPrice, 10000);
  assert.equal(priceLine(opt, v("블랙", 2000, 7), 1, { viewer: "business", gradePrice: { price: null, discount_rate: 10 } }).unitPrice, 10800);
});

test("가격 비공개 — 로그인 / 승인 사업자", () => {
  const loginOnly = { ...b2b, price_visibility: "login" };
  const g = priceLine(loginOnly, null, 1, { viewer: "guest" });
  assert.equal(g.priceHidden, true);
  assert.equal(g.unitPrice, 0);
  assert.equal(g.orderable, false);
  assert.match(g.errors[0], /로그인/);
  assert.equal(priceLine(loginOnly, null, 1, { viewer: "consumer" }).priceHidden, false);
  const bizOnly = { ...b2b, price_visibility: "approved_business" };
  for (const viewer of ["guest", "consumer", "pending"]) {
    const r = priceLine(bizOnly, null, 1, { viewer });
    assert.equal(r.priceHidden, true, viewer);
    assert.match(r.errors[0], /사업자 승인 후/);
  }
  assert.equal(priceLine(bizOnly, null, 1, { viewer: "business" }).orderable, true);
});

test("보이기 — 사업자 전용 상품, 회원 전용 구매", () => {
  const only = { ...b2b, visibility: "business_only" };
  const c = priceLine(only, null, 1, { viewer: "consumer" });
  assert.equal(c.visible, false);
  assert.match(c.errors[0], /사업자 회원 전용/);
  assert.equal(priceLine(only, null, 1, { viewer: "business" }).visible, true);
  const members = { ...b2b, visibility: "members" };
  assert.match(priceLine(members, null, 1, { viewer: "guest" }).errors[0], /로그인 후 구매/);
  assert.equal(priceLine(members, null, 1, { viewer: "consumer" }).orderable, true);
});

test("문맥이 없으면 예전과 같다(일반 손님·공개 상품)", () => {
  const r = priceLine(plain, null, 1);
  assert.equal(r.visible, true);
  assert.equal(r.priceHidden, false);
  assert.equal(r.unitPrice, 47000);
});

// F14 — 최소·단위·최대 수량, 수량 구간 할인
const bulk = { ...plain, base_price: 10000, moq: 10, order_unit: 5, max_qty: 100 };
const tiers = [
  { min_qty: 20, discount_type: "rate", value: 5 },
  { min_qty: 50, discount_type: "amount", value: 1500 },
  { min_qty: 80, discount_type: "unit_price", value: 8000 },
];

test("수량 규칙 — 최소·단위·최대", () => {
  assert.match(priceLine(bulk, null, 5).errors[0], /최소 10개/);
  assert.match(priceLine(bulk, null, 12).errors[0], /5개 단위/);
  assert.match(priceLine(bulk, null, 105).errors[0], /최대 100개/);
  assert.equal(priceLine(bulk, null, 15).orderable, true);
});

test("수량 구간 할인 — 가장 큰 구간 하나만", () => {
  assert.equal(priceLine(bulk, null, 15, { tiers }).unitPrice, 10000);
  const r20 = priceLine(bulk, null, 20, { tiers });
  assert.equal(r20.unitPrice, 9500);
  assert.deepEqual(r20.breakdown.at(-1), { label: "수량 할인(20개 이상)", amount: -500 });
  assert.equal(priceLine(bulk, null, 50, { tiers }).unitPrice, 8500);
  assert.equal(priceLine(bulk, null, 80, { tiers }).unitPrice, 8000);
  assert.equal(priceLine(bulk, null, 80, { tiers }).lineTotal, 640000);
});

test("구간 할인은 등급가 다음에 — 단가 지정은 더 싼 쪽", () => {
  const ctx = { viewer: "business", gradePrice: { price: null, discount_rate: 10 }, tiers };
  assert.equal(priceLine(bulk, null, 20, ctx).unitPrice, 8550); // 9000 × 0.95
  assert.equal(priceLine(bulk, null, 50, ctx).unitPrice, 7500); // 9000 − 1500
  assert.equal(priceLine(bulk, null, 80, { ...ctx, gradePrice: { price: 7000, discount_rate: null } }).unitPrice, 7000); // 등급가가 더 쌈
});

test("옵션 추가금과 단가 지정", () => {
  const opt = { ...withOptions, base_price: 10000, stock_mode: "none" };
  assert.equal(priceLine(opt, v("블랙", 2000, 0), 80, { tiers }).unitPrice, 10000); // 8000 + 2000
});

// D24 거래처 특가 — 상품별 특가 > 기본 할인율 > 등급가, 특가는 최종 단가(수량 할인 안 함), 공동구매가가 우선
const cpProduct = { status: "on_sale", base_price: 10000, stock_mode: "none", stock: 0, option_groups: [{ name: "색", values: ["A"] }] };
const cpVariant = { key: "A", values: ["A"], extra_price: 500, stock: 0, sku: "", is_active: true };
const cpTiers = [{ min_qty: 10, discount_type: "rate", value: 10 }];

test("D24 거래처 특가 금액 — 등급가 대신, 옵션 추가금은 더함, 수량 할인 안 함", () => {
  const l = priceLine(cpProduct, cpVariant, 10, { gradePrice: { price: 9000, discount_rate: null }, gradeName: "사업자", tiers: cpTiers, customerPrice: { price: 8000, discount_rate: null } });
  assert.equal(l.unitPrice, 8500);
  assert.equal(l.lineTotal, 85000);
  assert.ok(l.breakdown.some((b) => b.label === "거래처 특가"));
  assert.ok(!l.breakdown.some((b) => b.label.startsWith("수량 할인")));
});

test("D24 거래처 기본 할인율 — (판매가 + 추가금)에 적용, 원 단위 내림", () => {
  const l = priceLine(cpProduct, cpVariant, 1, { customerPrice: { price: null, discount_rate: 7 } });
  assert.equal(l.unitPrice, Math.floor((10500 * 93) / 100)); // 9765
});

test("D24 특가가 없으면 등급가·수량 할인 그대로", () => {
  const l = priceLine(cpProduct, cpVariant, 10, { gradePrice: { price: 9000, discount_rate: null }, tiers: cpTiers, customerPrice: null });
  assert.equal(l.unitPrice, Math.floor((9500 * 90) / 100));
});

test("D24 공동구매 중이면 공동구매가가 우선", () => {
  const l = priceLine(cpProduct, cpVariant, 1, { customerPrice: { price: 8000, discount_rate: null }, groupPrice: 7000 });
  assert.equal(l.unitPrice, 7500);
  assert.ok(!l.breakdown.some((b) => b.label === "거래처 특가"));
});

test("최저 판매가 보호(T1 공급가 하한)", () => {
  const sp = { status: "on_sale", base_price: 12000, stock_mode: "none", stock: 0, option_groups: [] };
  // 등급 25% → 9000, 하한 10500 → 10500
  const a = priceLine(sp, null, 1, { viewer: "business", gradePrice: { price: null, discount_rate: 25 }, gradeName: "도매상", floorPrice: 10500 });
  assert.equal(a.unitPrice, 10500);
  assert.deepEqual(a.breakdown.at(-1), { label: "최저 판매가 보호", amount: 1500 });
  // 하한이 안 걸리면 그대로
  assert.equal(priceLine(sp, null, 1, { gradePrice: { price: null, discount_rate: 5 }, floorPrice: 10500 }).unitPrice, 11400);
  // 하한이 판매가보다 커도 판매가를 넘지 않음
  assert.equal(priceLine(sp, null, 1, { floorPrice: 20000 }).unitPrice, 12000);
  // 수량 할인 뒤에도 하한
  assert.equal(priceLine(sp, null, 10, { tiers: [{ min_qty: 10, discount_type: "rate", value: 30 }], floorPrice: 10500 }).unitPrice, 10500);
});
