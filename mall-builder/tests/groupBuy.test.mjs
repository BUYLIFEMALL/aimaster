import { test } from "node:test";
import assert from "node:assert/strict";
import { progressPercent, remainingLabel, validateGroupBuy } from "../src/lib/groupBuy.ts";
import { priceLine } from "../src/lib/pricing.ts";

test("진행률·남은 시간", () => {
  assert.equal(progressPercent(2, 3), 66);
  assert.equal(progressPercent(5, 3), 100);
  assert.equal(progressPercent(0, 0), 0);
  const now = Date.parse("2026-11-09T00:00:00Z");
  assert.equal(remainingLabel("2026-11-11T03:30:00Z", now), "2일 3시간 남음");
  assert.equal(remainingLabel("2026-11-09T01:05:00Z", now), "1시간 5분 남음");
  assert.equal(remainingLabel("2026-11-09T00:00:20Z", now), "1분 남음");
  assert.equal(remainingLabel("2026-11-08T00:00:00Z", now), "마감");
});

test("공동구매 입력 검사", () => {
  const ok = { title: "가을 공구", group_price: 40000, target_qty: 10, max_per_customer: 2, starts_at: "2026-11-09T00:00", ends_at: "2026-11-12T00:00" };
  assert.equal(validateGroupBuy(ok), null);
  assert.match(validateGroupBuy({ ...ok, ends_at: "2026-11-08T00:00" }), /뒤여야/);
  assert.match(validateGroupBuy({ ...ok, target_qty: 0 }), /목표 수량/);
  assert.equal(validateGroupBuy({ ...ok, max_per_customer: null }), null);
});

test("가격 엔진 — 공동구매가는 등급가·수량 할인 대신 (DB 시험: 47,000원 → 40,000원)", () => {
  const p = { status: "on_sale", base_price: 47000, stock_mode: "none", stock: 0, option_groups: [] };
  const ctx = { gradePrice: { price: null, discount_rate: 10 }, tiers: [{ min_qty: 2, discount_type: "amount", value: 1000 }] };
  assert.equal(priceLine(p, null, 2, ctx).unitPrice, 41300);
  const g = priceLine(p, null, 2, { ...ctx, groupPrice: 40000 });
  assert.equal(g.unitPrice, 40000);
  assert.equal(g.lineTotal, 80000);
  assert.deepEqual(g.breakdown, [{ label: "판매가", amount: 47000 }, { label: "공동구매가", amount: -7000 }]);
  // 옵션 추가금은 더한다
  const po = { ...p, option_groups: [{ name: "색", values: ["블랙"] }] };
  const v = { key: "블랙", values: ["블랙"], extra_price: 2000, stock: 0, sku: "", is_active: true };
  assert.equal(priceLine(po, v, 1, { groupPrice: 40000 }).unitPrice, 42000);
});
