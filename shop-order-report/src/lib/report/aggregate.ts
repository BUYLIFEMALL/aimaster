// 주문 줄 → 리포트 숫자(순수 함수). 시연·무작위 숫자 없이 회원이 올린 줄만으로 계산한다.
import type { OrderLine, OrderStatus } from "@/lib/orders/parse";
import type { MarketId } from "@/lib/orders/markets";
import { MARKET_FEES, estimateSettlement } from "@/lib/marketFees";

export interface ProductCost {
  /** 개당 원가(매입가) */
  unitCost: number;
  /** 개당 포장·부자재비 */
  packCost: number;
  /** 회원이 정한 수수료율(%) — 비우면 마켓 기본값 */
  feePct?: number | null;
  /** 현재 재고(재고 예측용) */
  stock?: number | null;
}

export interface ReportSettings {
  products: Record<string, ProductCost>;
  marketFeePct: Partial<Record<MarketId, number>>;
  /** 출고 1건당 실제 택배비(판매자 부담) */
  courierPerOrder: number;
  /** 기간 광고비 합계(리포트 기간 전체에 한 번 뺌) */
  adCost: number;
}

export const DEFAULT_SETTINGS: ReportSettings = { products: {}, marketFeePct: {}, courierPerOrder: 0, adCost: 0 };

/** 상품 키 — 상품명 + 옵션 */
export const productKey = (l: Pick<OrderLine, "product" | "option">) => (l.option ? `${l.product} / ${l.option}` : l.product);

/** 매출에 넣는 주문(취소·반품은 매출에서 뺀다) */
export const isSale = (s: OrderStatus) => s !== "cancel" && s !== "return";

export interface LineProfit {
  sales: number;
  settlement: number;
  settlementEstimated: boolean;
  cost: number;
  profit: number;
}

export function lineProfit(l: OrderLine, st: ReportSettings): LineProfit {
  if (!isSale(l.status)) return { sales: 0, settlement: 0, settlementEstimated: false, cost: 0, profit: 0 };
  const pc = st.products[productKey(l)];
  const fee = MARKET_FEES[l.market];
  const ratePct = pc?.feePct ?? st.marketFeePct[l.market] ?? fee.ratePct;
  const estimated = l.settlement == null;
  const settlement = l.settlement ?? estimateSettlement(l.amount, l.shippingFee, ratePct, fee.shippingRatePct);
  const cost = Math.round(((pc?.unitCost ?? 0) + (pc?.packCost ?? 0)) * l.qty);
  return { sales: l.amount, settlement, settlementEstimated: estimated, cost, profit: settlement - cost };
}

export interface Summary {
  orders: number;
  sales: number;
  qty: number;
  aov: number;
  settlement: number;
  cost: number;
  courier: number;
  adCost: number;
  profit: number;
  marginPct: number;
  cancel: number;
  returns: number;
  exchange: number;
  returnRatePct: number;
  estimatedShare: number;
  missingCost: number;
  byStatus: Record<OrderStatus, number>;
}

export function summarize(lines: OrderLine[], st: ReportSettings): Summary {
  const byStatus: Record<OrderStatus, number> = { new: 0, shipping: 0, done: 0, cancel: 0, return: 0, exchange: 0 };
  const orderSet = new Set<string>();
  const saleOrders = new Set<string>();
  let sales = 0, qty = 0, settlement = 0, cost = 0, est = 0, saleLines = 0, missingCost = 0;
  const missing = new Set<string>();
  for (const l of lines) {
    byStatus[l.status] += 1;
    orderSet.add(`${l.market}|${l.orderNo}`);
    if (!isSale(l.status)) continue;
    saleOrders.add(`${l.market}|${l.orderNo}`);
    const p = lineProfit(l, st);
    sales += p.sales;
    qty += l.qty;
    settlement += p.settlement;
    cost += p.cost;
    saleLines += 1;
    if (p.settlementEstimated) est += 1;
    if (!st.products[productKey(l)]?.unitCost) missing.add(productKey(l));
  }
  missingCost = missing.size;
  const courier = Math.round(saleOrders.size * (st.courierPerOrder || 0));
  const adCost = Math.round(st.adCost || 0);
  const profit = settlement - cost - courier - adCost;
  const orders = orderSet.size;
  return {
    orders,
    sales,
    qty,
    aov: saleOrders.size ? Math.round(sales / saleOrders.size) : 0,
    settlement,
    cost,
    courier,
    adCost,
    profit,
    marginPct: sales ? Math.round((profit / sales) * 1000) / 10 : 0,
    cancel: byStatus.cancel,
    returns: byStatus.return,
    exchange: byStatus.exchange,
    returnRatePct: lines.length ? Math.round(((byStatus.return + byStatus.exchange) / lines.length) * 1000) / 10 : 0,
    estimatedShare: saleLines ? Math.round((est / saleLines) * 100) : 0,
    missingCost,
    byStatus,
  };
}

export type Period = "day" | "week" | "month";

/** 날짜(YYYY-MM-DD) → 묶음 이름. 주는 월요일 시작. */
export function periodKey(date: string, p: Period): string {
  if (p === "day") return date;
  if (p === "month") return date.slice(0, 7);
  const d = new Date(`${date}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // 월=0
  d.setUTCDate(d.getUTCDate() - dow);
  return `${d.toISOString().slice(0, 10)} 주`;
}

export interface GroupRow {
  key: string;
  orders: number;
  qty: number;
  sales: number;
  settlement: number;
  cost: number;
  profit: number;
  returns: number;
}

function group(lines: OrderLine[], st: ReportSettings, keyOf: (l: OrderLine) => string): GroupRow[] {
  const map = new Map<string, GroupRow & { orderSet: Set<string> }>();
  for (const l of lines) {
    const k = keyOf(l);
    let g = map.get(k);
    if (!g) {
      g = { key: k, orders: 0, qty: 0, sales: 0, settlement: 0, cost: 0, profit: 0, returns: 0, orderSet: new Set() };
      map.set(k, g);
    }
    if (l.status === "return" || l.status === "exchange") g.returns += 1;
    if (!isSale(l.status)) continue;
    const p = lineProfit(l, st);
    g.orderSet.add(`${l.market}|${l.orderNo}`);
    g.qty += l.qty;
    g.sales += p.sales;
    g.settlement += p.settlement;
    g.cost += p.cost;
    g.profit += p.profit;
  }
  return [...map.values()].map(({ orderSet, ...g }) => ({ ...g, orders: orderSet.size }));
}

export const byPeriod = (lines: OrderLine[], st: ReportSettings, p: Period) =>
  group(lines, st, (l) => periodKey(l.orderedAt, p)).sort((a, b) => a.key.localeCompare(b.key));
export const byMarket = (lines: OrderLine[], st: ReportSettings) => group(lines, st, (l) => l.market).sort((a, b) => b.sales - a.sales);
export const byProduct = (lines: OrderLine[], st: ReportSettings) => group(lines, st, (l) => productKey(l)).sort((a, b) => b.sales - a.sales);

/** 기간 거르기(포함 범위) */
export function inRange(lines: OrderLine[], from: string, to: string): OrderLine[] {
  return lines.filter((l) => (!from || l.orderedAt >= from) && (!to || l.orderedAt <= to));
}
