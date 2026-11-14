import { test } from "node:test";
import assert from "node:assert/strict";
import { regionOfZip, feeForPolicy, computeShipping, describePolicy, validatePolicy } from "../src/lib/shipping.ts";

const P = (over) => ({ id: "p", name: "기본", type: "conditional", base_fee: 3000, free_over: 50000, jeju_fee: 3000, island_fee: 5000, is_default: true, ...over });

test("우편번호로 지역", () => {
  assert.equal(regionOfZip("63100"), "jeju");
  assert.equal(regionOfZip("63644"), "jeju");
  assert.equal(regionOfZip("40210"), "island");
  assert.equal(regionOfZip("06236"), "mainland");
  assert.equal(regionOfZip("abc"), "mainland");
});

test("정책 하나 — 무료·고정·조건부", () => {
  assert.equal(feeForPolicy(P({ type: "free" }), 1000, "mainland"), 0);
  assert.equal(feeForPolicy(P({ type: "fixed" }), 100000, "mainland"), 3000);
  assert.equal(feeForPolicy(P(), 49999, "mainland"), 3000);
  assert.equal(feeForPolicy(P(), 50000, "mainland"), 0);
});

test("제주·도서 추가금 — 무료가 돼도 추가금은 붙는다", () => {
  assert.equal(feeForPolicy(P(), 60000, "jeju"), 3000);
  assert.equal(feeForPolicy(P(), 10000, "island"), 8000);
  assert.equal(feeForPolicy(P({ type: "free" }), 10000, "jeju"), 3000);
});

test("여러 줄 — 같은 정책끼리 묶어 합계로 판단", () => {
  const policies = [P(), P({ id: "q", name: "대형", type: "fixed", base_fee: 10000, is_default: false })];
  const r = computeShipping([
    { policyId: null, amount: 30000 }, // 기본 정책
    { policyId: "p", amount: 25000 }, // 기본 정책 — 합계 55,000 → 무료
    { policyId: "q", amount: 5000 },
  ], policies);
  assert.equal(r.total, 10000);
  assert.deepEqual(r.breakdown.map((b) => [b.name, b.subtotal, b.fee]), [["기본", 55000, 0], ["대형", 5000, 10000]]);
});

test("정책이 하나도 없으면 무료", () => {
  assert.equal(computeShipping([{ policyId: null, amount: 1000 }], []).total, 0);
});

test("안내 문구", () => {
  assert.equal(describePolicy(null), "무료 배송");
  assert.equal(describePolicy(P({ jeju_fee: 0, island_fee: 0 })), "배송비 3,000원 (50,000원 이상 무료)");
  assert.match(describePolicy(P()), /제주 \+3,000원/);
});

test("정책 입력 검사", () => {
  const ok = { name: "기본", type: "conditional", base_fee: 3000, free_over: 50000, jeju_fee: 0, island_fee: 0 };
  assert.equal(validatePolicy(ok), null);
  assert.match(validatePolicy({ ...ok, free_over: null }), /기준 금액/);
  assert.match(validatePolicy({ ...ok, type: "fixed", base_fee: 0 }), /기본 배송비/);
  assert.equal(validatePolicy({ ...ok, type: "free", base_fee: 0, free_over: null }), null);
  assert.match(validatePolicy({ ...ok, jeju_fee: -1 }), /0 이상/);
});

test("수량별·구간별(0065) — DB shipping_qty_fee와 같은 계산", () => {
  const Q = P({ type: "quantity", repeat_qty: 3, free_over: null });
  assert.equal(feeForPolicy(Q, 0, "mainland", 1), 3000);
  assert.equal(feeForPolicy(Q, 0, "mainland", 3), 3000);
  assert.equal(feeForPolicy(Q, 0, "mainland", 4), 6000);
  assert.equal(feeForPolicy(Q, 0, "jeju", 7), 12000); // 3묶음 9,000 + 제주 3,000
  const R = P({ type: "range", range_upto: 5, range_extra_fee: 4000, free_over: null });
  assert.equal(feeForPolicy(R, 0, "mainland", 5), 3000);
  assert.equal(feeForPolicy(R, 0, "mainland", 6), 7000);
  assert.equal(describePolicy(Q), "배송비 3개마다 3,000원 · 제주 +3,000원 / 도서산간 +5,000원");
  assert.match(describePolicy(R), /5개 넘으면 \+4,000원/);
});

test("묶음 불가(0065) — 같은 정책이어도 상품마다 따로, 수량은 상품별로 셈", () => {
  const Q = P({ id: "q", type: "quantity", repeat_qty: 2, bundle: false, free_over: null, jeju_fee: 0, island_fee: 0 });
  const r = computeShipping([
    { policyId: "q", amount: 10000, qty: 2, productId: "a" },
    { policyId: "q", amount: 10000, qty: 1, productId: "b" },
  ], [Q]);
  assert.equal(r.breakdown.length, 2);
  assert.equal(r.total, 6000); // a: 2개→3,000 · b: 1개→3,000
  const bundled = computeShipping([
    { policyId: "q", amount: 10000, qty: 2, productId: "a" },
    { policyId: "q", amount: 10000, qty: 1, productId: "b" },
  ], [{ ...Q, bundle: true }]);
  assert.equal(bundled.total, 6000); // 묶어서 3개 → 2묶음 6,000
  assert.match(describePolicy(Q), /상품마다 따로/);
});

test("수량별·구간별 입력 검사 + 반품·교환 안내", async () => {
  const { describeReturnFees } = await import("../src/lib/shipping.ts");
  const base = { name: "수량", base_fee: 3000, free_over: null, jeju_fee: 0, island_fee: 0 };
  assert.match(validatePolicy({ ...base, type: "quantity" }), /몇 개마다/);
  assert.equal(validatePolicy({ ...base, type: "quantity", repeat_qty: 3 }), null);
  assert.match(validatePolicy({ ...base, type: "range", range_upto: 5 }), /추가할|더할/);
  assert.equal(validatePolicy({ ...base, type: "range", range_upto: 5, range_extra_fee: 3000 }), null);
  assert.equal(describeReturnFees(P({ return_fee: 3000, exchange_fee: 6000 })), "반품 배송비(편도) 3,000원 · 교환 배송비(왕복) 6,000원");
  assert.equal(describeReturnFees(P()), "");
});
