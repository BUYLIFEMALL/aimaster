import { test } from "node:test";
import assert from "node:assert/strict";
import { invoiceTaxTotals, buildStatement, buildLedger, ledgerPeriod, kstDate } from "../src/lib/statements.ts";

const it = (u, q, c = 0, t = "taxable", name = "상품") => ({ name, option: "", unit_price: u, qty: q, cancelled_qty: c, tax_type: t });

test("D26 세금계산서 DB 함수(0039)와 같은 값 — Lab 실제 주문 5건", () => {
  const cases = [
    [{ subtotal: 42300, shipping_fee: 0, coupon_discount: 3000, point_used: 3000 }, [it(42300, 2, 1)], 33000, 3300],
    [{ subtotal: 80000, shipping_fee: 0, coupon_discount: 0, point_used: 0 }, [it(40000, 2)], 72727, 7273],
    [{ subtotal: 84600, shipping_fee: 0, coupon_discount: 0, point_used: 0 }, [it(42300, 2)], 76909, 7691],
    [{ subtotal: 82600, shipping_fee: 0, coupon_discount: 0, point_used: 0 }, [it(41300, 3, 1)], 75091, 7509],
    [{ subtotal: 123900, shipping_fee: 0, coupon_discount: 0, point_used: 0 }, [it(41300, 3)], 112636, 11264],
  ];
  for (const [o, items, supply, tax] of cases) {
    const r = invoiceTaxTotals(o, items);
    assert.deepEqual([r.supply, r.tax], [supply, tax]);
    const s = buildStatement(o, items);
    assert.deepEqual([s.totals.supply, s.totals.tax], [supply, tax], "명세서 합계도 세금계산서와 같아야 함");
    assert.equal(s.totals.amount, o.subtotal + o.shipping_fee - o.coupon_discount - o.point_used);
  }
});

test("D26 명세서 — 과세·면세·배송비·할인, 줄마다 금액 = 공급가액 + 세액", () => {
  const o = { subtotal: 33000 + 10000, shipping_fee: 3000, coupon_discount: 2000, point_used: 500 };
  const items = [it(11000, 3, 0, "taxable", "복사지"), it(5000, 2, 0, "exempt", "쌀"), it(9999, 2, 2, "taxable", "취소됨")];
  const s = buildStatement(o, items);
  assert.deepEqual(s.rows.map((r) => r.kind), ["item", "item", "shipping", "discount"]); // 다 취소된 줄은 빠짐
  for (const r of s.rows) assert.equal(r.supply + r.tax, r.amount);
  assert.equal(s.rows[1].tax, 0);
  assert.equal(s.rows[1].exempt, true);
  assert.equal(s.rows[2].tax, Math.round(3000 / 11));
  const inv = invoiceTaxTotals(o, items);
  assert.equal(s.totals.tax, inv.tax);
  assert.equal(s.totals.amount, 43000 + 3000 - 2500);
});

test("D26 면세만 있으면 배송비도 세액 0(세금계산서와 같게)", () => {
  const s = buildStatement({ subtotal: 10000, shipping_fee: 3000, coupon_discount: 0, point_used: 0 }, [it(5000, 2, 0, "exempt")]);
  assert.equal(s.totals.tax, 0);
  assert.equal(s.rows[1].kind, "shipping");
  assert.equal(s.rows[1].exempt, true);
});

test("D26 품목 17줄 — 세금계산서가 합계로 세액을 내면 끝전 조정 줄로 맞춤", () => {
  const items = Array.from({ length: 17 }, (_, n) => it(1005 + n, 1));
  const o = { subtotal: items.reduce((s, i) => s + i.unit_price, 0), shipping_fee: 0, coupon_discount: 0, point_used: 0 };
  const s = buildStatement(o, items);
  assert.equal(s.totals.tax, invoiceTaxTotals(o, items).tax);
  assert.equal(s.totals.tax, Math.round(o.subtotal / 11));
});

test("D26 외상 원장 — 이월·기간 내역·기말·구분별 합계(한국 날짜 기준)", () => {
  const e = (iso, kind, amount, bal, no = null) => ({ kind, amount, balance_after: bal, note: "", order_no: no, created_at: iso });
  const entries = [
    e("2026-10-31T14:59:00Z", "charge", 50000, 50000, "A"), // 한국 10-31 23:59 → 이월
    e("2026-10-31T15:01:00Z", "charge", 30000, 80000, "B"), // 한국 11-01 00:01 → 기간 안
    e("2026-11-05T03:00:00Z", "payment", -50000, 30000),
    e("2026-12-01T00:00:00Z", "charge", 1000, 31000, "C"), // 기간 뒤
  ];
  const l = buildLedger(entries, "2026-11-01", "2026-11-30");
  assert.equal(l.opening, 50000);
  assert.equal(l.closing, 30000);
  assert.deepEqual(l.rows.map((r) => r.order_no), ["B", null]);
  assert.deepEqual(l.sums, { charge: 30000, payment: -50000, adjust: 0 });
  assert.deepEqual(buildLedger(entries, "2026-12-05", "2026-12-31").rows, []);
  assert.equal(buildLedger(entries, "2026-12-05", "2026-12-31").closing, 31000);
  assert.equal(kstDate("2026-10-31T15:01:00Z"), "2026-11-01");
});

test("D26 원장 기간 — 비우면 이번 달 1일~오늘, 거꾸로면 바꿈", () => {
  assert.deepEqual(ledgerPeriod("", "", "2026-11-11"), { from: "2026-11-01", to: "2026-11-11" });
  assert.deepEqual(ledgerPeriod("2026-11-20", "2026-11-01", "2026-11-11"), { from: "2026-11-01", to: "2026-11-20" });
});
