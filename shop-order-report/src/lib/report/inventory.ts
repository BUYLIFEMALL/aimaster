// 재고 소진 예측(순수 함수) — 최근 N일 실제 판매 수량으로 하루 평균을 내고 현재 재고를 나눈다.
import type { OrderLine } from "@/lib/orders/parse";
import { isSale, productKey } from "./aggregate";

export interface StockForecast {
  key: string;
  soldInWindow: number;
  perDay: number;
  stock: number | null;
  daysLeft: number | null;
  level: "danger" | "warn" | "ok" | "unknown";
}

/** 기준일(보통 올린 파일의 마지막 주문일)부터 거꾸로 windowDays일. */
export function forecastStock(
  lines: OrderLine[],
  stocks: Record<string, number | null | undefined>,
  endDate: string,
  windowDays = 14,
): StockForecast[] {
  const end = new Date(`${endDate}T00:00:00Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (windowDays - 1));
  const from = start.toISOString().slice(0, 10);
  const sold = new Map<string, number>();
  for (const l of lines) {
    if (!isSale(l.status) || l.orderedAt < from || l.orderedAt > endDate) continue;
    const k = productKey(l);
    sold.set(k, (sold.get(k) ?? 0) + l.qty);
  }
  const keys = new Set([...sold.keys(), ...Object.keys(stocks).filter((k) => stocks[k] != null)]);
  return [...keys]
    .map((key) => {
      const s = sold.get(key) ?? 0;
      const perDay = Math.round((s / windowDays) * 100) / 100;
      const stock = stocks[key] ?? null;
      const daysLeft = stock == null ? null : perDay > 0 ? Math.floor(stock / perDay) : null;
      const level: StockForecast["level"] = stock == null ? "unknown" : daysLeft == null ? "ok" : daysLeft <= 7 ? "danger" : daysLeft <= 14 ? "warn" : "ok";
      return { key, soldInWindow: s, perDay, stock, daysLeft, level };
    })
    .sort((a, b) => (a.daysLeft ?? 1e9) - (b.daysLeft ?? 1e9) || b.soldInWindow - a.soldInWindow);
}

/** 마지막 주문일 */
export const lastOrderDate = (lines: OrderLine[]) => lines.reduce((m, l) => (l.orderedAt > m ? l.orderedAt : m), "");
