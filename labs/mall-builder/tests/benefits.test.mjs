import { test } from "node:test";
import assert from "node:assert/strict";
import { couponDiscount, couponEligible, maxPoints, clampPoints, earnPreview, couponLabel, validateCouponForm, DEFAULT_POINT_SETTINGS } from "../src/lib/benefits.ts";

const lines = [
  { productId: "p1", categoryIds: ["c1"], lineTotal: 84600 },
  { productId: "p2", categoryIds: ["c2"], lineTotal: 10000 },
];
const base = { max_discount: null, min_order: 0, target: "all", target_ids: [], allow_business: true };

test("정액 쿠폰 — 대상 금액 안에서", () => {
  assert.deepEqual(couponDiscount({ ...base, discount_type: "amount", value: 5000 }, lines, false), { amount: 5000, eligible: 94600, error: null });
  assert.equal(couponDiscount({ ...base, discount_type: "amount", value: 5000, target: "product", target_ids: ["p2"] }, lines, false).eligible, 10000);
  // 할인액이 대상 금액보다 크면 대상 금액까지만
  assert.equal(couponDiscount({ ...base, discount_type: "amount", value: 50000, target: "product", target_ids: ["p2"] }, lines, false).amount, 10000);
});

test("정률 쿠폰 — 최대 할인액·원 단위 내림 (DB 시험: 84,600원 10% 최대 3천 → 3,000)", () => {
  const one = [lines[0]];
  assert.equal(couponDiscount({ ...base, discount_type: "rate", value: 10, max_discount: 3000 }, one, false).amount, 3000);
  assert.equal(couponDiscount({ ...base, discount_type: "rate", value: 10 }, one, false).amount, 8460);
  assert.equal(couponDiscount({ ...base, discount_type: "rate", value: 7 }, [{ productId: "x", categoryIds: [], lineTotal: 999 }], false).amount, 69);
});

test("카테고리 대상·최소 주문·사업자 막힘", () => {
  assert.equal(couponEligible({ target: "category", target_ids: ["c2"] }, lines[1]), true);
  assert.equal(couponEligible({ target: "category", target_ids: ["c2"] }, lines[0]), false);
  const c = { ...base, discount_type: "amount", value: 5000, min_order: 30000, target: "category", target_ids: ["c2"] };
  assert.match(couponDiscount(c, lines, false).error, /30,000원 이상/);
  assert.match(couponDiscount({ ...c, target_ids: ["zz"] }, lines, false).error, /쓸 수 있는 상품이 없/);
  assert.match(couponDiscount({ ...base, discount_type: "amount", value: 1000, allow_business: false }, lines, true).error, /사업자/);
  assert.equal(couponDiscount({ ...base, discount_type: "amount", value: 1000, allow_business: false }, lines, false).amount, 1000);
});

test("포인트 최대 — 사용 비율·보유·단위, 꺼짐·최소 보유", () => {
  const s = { ...DEFAULT_POINT_SETTINGS, enabled: true };
  assert.deepEqual(maxPoints(s, 85000, 84600), { max: 84600, reason: null });
  assert.deepEqual(maxPoints(s, 5050, 84600), { max: 5000, reason: null });
  assert.equal(maxPoints({ ...s, max_use_rate: 50 }, 100000, 84650).max, 42300);
  assert.equal(maxPoints(s, 999, 84600).max, 0);
  assert.match(maxPoints(DEFAULT_POINT_SETTINGS, 5000, 84600).reason, /쓰지 않습니다/);
  assert.equal(clampPoints(3050, 5000, 100), 3000);
  assert.equal(clampPoints(9999, 5000, 100), 5000);
  assert.equal(clampPoints(-5, 5000, 100), 0);
});

test("적립 미리보기 — 배송비 제외, 등급 적립률 우선 (DB 시험: 84,600원 1% → 846)", () => {
  const s = { ...DEFAULT_POINT_SETTINGS, enabled: true };
  assert.equal(earnPreview(s, null, 84600, 0), 846);
  assert.equal(earnPreview(s, 2, 45300, 3000), 846);
  assert.equal(earnPreview(DEFAULT_POINT_SETTINGS, null, 84600, 0), 0);
});

test("쿠폰 설명·입력 검사", () => {
  assert.equal(couponLabel({ discount_type: "rate", value: 10, max_discount: 3000, min_order: 30000 }), "10% 할인(최대 3,000원) · 30,000원 이상");
  const ok = { name: "가입 축하", discount_type: "amount", value: 3000, max_discount: null, min_order: 0, valid_days: 30, ends_at: null, target: "all", target_ids: [], issue_mode: "signup", code: null };
  assert.equal(validateCouponForm(ok), null);
  assert.match(validateCouponForm({ ...ok, discount_type: "rate", value: 95 }), /90%/);
  assert.match(validateCouponForm({ ...ok, issue_mode: "code", code: "ab" }), /코드/);
  assert.match(validateCouponForm({ ...ok, target: "category" }), /1개 이상/);
  assert.equal(validateCouponForm({ ...ok, issue_mode: "code", code: "WELCOME10" }), null);
});

import { parseBirthMd } from "../src/lib/benefits.ts";
test("생일 월·일 → MM-DD", () => {
  assert.deepEqual(parseBirthMd("3", "7"), { ok: true, value: "03-07" });
  assert.deepEqual(parseBirthMd("2", "29"), { ok: true, value: "02-29" });
  assert.deepEqual(parseBirthMd("", ""), { ok: true, value: null });
  assert.equal(parseBirthMd("2", "30").ok, false);
  assert.equal(parseBirthMd("13", "1").ok, false);
  assert.equal(parseBirthMd("5", "").ok, false);
});
