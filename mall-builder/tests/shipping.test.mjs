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
