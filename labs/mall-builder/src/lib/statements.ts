// D26 거래명세서·외상 원장 — 금액 계산(node --test 대상)
// 거래명세서 합계 공급가액·세액은 세금계산서 DB 함수(0039 mall_builder_private.tax_invoice_lines)와 1원까지 같게 계산한다:
//   과세 품목(취소분 뺀 수량) + 배송비(과세 품목이 있을 때만) → 쿠폰·포인트 할인을 금액 비율로 나눔(큰 줄부터, 마지막 줄이 나머지)
//   → 줄마다 세액 = round(금액 ÷ 11), 16줄 넘거나 1원 미만 줄이 생기면 합계로 한 번에 round(합계 ÷ 11)
// 표의 줄은 할인 전 금액으로 보여 주고, 할인 줄의 공급가액·세액으로 합계를 맞춘다.

import { LEDGER_LABEL, type LedgerKind } from "./credit.ts";

export type StatementItemInput = { name: string; option: string; unit_price: number; qty: number; cancelled_qty: number; tax_type: "taxable" | "exempt" };
export type StatementOrderInput = { subtotal: number; shipping_fee: number; coupon_discount: number; point_used: number };

export type StatementRow = {
  kind: "item" | "shipping" | "discount" | "adjust";
  name: string;
  option: string;
  qty: number | null;
  unit: number | null;
  amount: number;
  supply: number;
  tax: number;
  exempt: boolean;
};

const r11 = (n: number) => Math.round(n / 11); // DB round(n / 11.0)과 같음(양수 반올림)

/** 세금계산서 DB 함수와 같은 방식의 과세분 합계(공급가액·세액) */
export function invoiceTaxTotals(order: StatementOrderInput, items: StatementItemInput[]): { total: number; supply: number; tax: number } {
  const lines = items
    .map((i) => ({ i, q: i.qty - i.cancelled_qty }))
    .filter((x) => x.q > 0 && x.i.tax_type !== "exempt")
    .map((x) => x.i.unit_price * x.q)
    .sort((a, b) => b - a);
  const taxable = lines.reduce((s, g) => s + g, 0);
  if (order.shipping_fee > 0 && taxable > 0) lines.push(order.shipping_fee);
  const baseT = taxable + (taxable > 0 ? order.shipping_fee : 0);
  const baseAll = order.subtotal + order.shipping_fee;
  const disc = order.coupon_discount + order.point_used;
  const discT = baseT > 0 && baseAll > 0 && disc > 0 ? Math.round((disc * baseT) / baseAll) : 0;
  let used = 0;
  let total = 0;
  let tax = 0;
  let collapse = false;
  lines.forEach((g, idx) => {
    const net = g - (idx === lines.length - 1 ? discT - used : Math.floor((discT * g) / baseT));
    used += g - net;
    if (net < 1) collapse = true;
    total += net;
    tax += r11(net);
  });
  if (lines.length > 16 || collapse) tax = r11(total);
  return { total, supply: total - tax, tax };
}

/** 거래명세서 줄과 합계 */
export function buildStatement(order: StatementOrderInput, items: StatementItemInput[]) {
  const rows: StatementRow[] = [];
  let hasTaxable = false;
  for (const i of items) {
    const q = i.qty - i.cancelled_qty;
    if (q <= 0) continue;
    const amount = i.unit_price * q;
    const exempt = i.tax_type === "exempt";
    if (!exempt) hasTaxable = true;
    const tax = exempt ? 0 : r11(amount);
    rows.push({ kind: "item", name: i.name, option: i.option, qty: q, unit: i.unit_price, amount, supply: amount - tax, tax, exempt });
  }
  if (order.shipping_fee > 0) {
    // 세금계산서와 같게: 과세 품목이 있을 때만 배송비를 과세로
    const tax = hasTaxable ? r11(order.shipping_fee) : 0;
    rows.push({ kind: "shipping", name: "배송비", option: "", qty: null, unit: null, amount: order.shipping_fee, supply: order.shipping_fee - tax, tax, exempt: !hasTaxable });
  }
  const inv = invoiceTaxTotals(order, items);
  const rowTax = rows.reduce((s, r) => s + r.tax, 0);
  const disc = order.coupon_discount + order.point_used;
  if (disc > 0) {
    const tax = inv.tax - rowTax;
    const label = [order.coupon_discount > 0 ? "쿠폰" : "", order.point_used > 0 ? "포인트" : ""].filter(Boolean).join("·");
    rows.push({ kind: "discount", name: `할인(${label})`, option: "", qty: null, unit: null, amount: -disc, supply: -disc - tax, tax, exempt: false });
  } else if (inv.tax !== rowTax) {
    // 품목이 16줄을 넘어 세금계산서가 합계로 세액을 낸 경우의 끝전 차이
    const tax = inv.tax - rowTax;
    rows.push({ kind: "adjust", name: "세액 끝전 조정(세금계산서 기준)", option: "", qty: null, unit: null, amount: 0, supply: -tax, tax, exempt: false });
  }
  const totals = rows.reduce((t, r) => ({ amount: t.amount + r.amount, supply: t.supply + r.supply, tax: t.tax + r.tax }), { amount: 0, supply: 0, tax: 0 });
  return { rows, totals };
}

// ── 외상 원장 ──────────────────────────────────────────────
export type LedgerInput = { kind: LedgerKind; amount: number; balance_after: number; note: string; order_no: string | null; created_at: string };

/** 한국 날짜(YYYY-MM-DD) */
export const kstDate = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });

/** 기간 원장 — entries는 순서 상관없음. 이월 = 기간 시작 전 마지막 잔액, 기말 = 기간 안 마지막 잔액(없으면 이월) */
export function buildLedger(entries: LedgerInput[], from: string, to: string) {
  const sorted = [...entries].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const before = sorted.filter((e) => kstDate(e.created_at) < from);
  const inRange = sorted.filter((e) => kstDate(e.created_at) >= from && kstDate(e.created_at) <= to);
  const opening = before.length ? before[before.length - 1].balance_after : 0;
  const closing = inRange.length ? inRange[inRange.length - 1].balance_after : opening;
  const sums: Record<LedgerKind, number> = { charge: 0, payment: 0, adjust: 0 };
  for (const e of inRange) sums[e.kind] += e.amount;
  const rows = inRange.map((e) => ({ date: kstDate(e.created_at), label: LEDGER_LABEL[e.kind], kind: e.kind, order_no: e.order_no, note: e.note, amount: e.amount, balance: e.balance_after }));
  return { opening, closing, sums, rows };
}

/** 기간 글자 검사 — 비우면 이번 달 1일 ~ 오늘 */
export function ledgerPeriod(fromIn: unknown, toIn: unknown, today: string): { from: string; to: string } {
  const ok = (s: unknown) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
  let from = ok(fromIn) ? (fromIn as string) : `${today.slice(0, 8)}01`;
  let to = ok(toIn) ? (toIn as string) : today;
  if (from > to) [from, to] = [to, from];
  return { from, to };
}
