// 오래 멈춘 배송 판정·배송 이력 정리 — 외부 호출 없음(tests/exchanges.test.mjs).
// 배송 이력 GET v5 ordersheets/{shipmentBoxId}/history(명세 2026-10-31 확인). 수취인 정보는 돌려주지 않는다.
import { orderStatusLabel, type OrderSheet } from "./orders.ts";

export const STALE_DAYS: Record<string, number> = { DEPARTURE: 3, DELIVERING: 5 };
export const STALE_READ_GAP_SECONDS = 30;
const DAY_MS = 86_400_000;

export const historyPath = (vendorId: string, shipmentBoxId: number) => `/v2/providers/openapi/apis/api/v5/vendors/${encodeURIComponent(vendorId)}/ordersheets/${shipmentBoxId}/history`;

export type StaleShipment = { shipmentBoxId: number; orderId: number; statusLabel: string; days: number; courier: string; invoice: string; itemName: string };
export type HistoryStep = { at: string; label: string };

export function staleShipments(orders: OrderSheet[], nowMs: number): StaleShipment[] {
  return orders
    .map((o) => {
      const at = Date.parse(o.orderedAt);
      const days = Number.isNaN(at) ? 0 : Math.floor((nowMs - at) / DAY_MS);
      return { o, days };
    })
    .filter(({ o, days }) => STALE_DAYS[o.status] !== undefined && days >= STALE_DAYS[o.status])
    .sort((a, b) => b.days - a.days)
    .map(({ o, days }) => ({
      shipmentBoxId: o.shipmentBoxId,
      orderId: o.orderId,
      statusLabel: orderStatusLabel(o.status),
      days,
      courier: o.deliveryCompanyName,
      invoice: o.invoiceNumber,
      itemName: o.items.map((i) => i.name).filter(Boolean).join(", "),
    }));
}

export function normalizeHistorySteps(raw: unknown): HistoryStep[] {
  const data = (raw as { data?: unknown })?.data;
  const groups = (Array.isArray(data) ? data : data ? [data] : []) as { details?: unknown }[];
  const s = (v: unknown) => (v == null ? "" : String(v)).trim();
  return groups
    .flatMap((g) => (Array.isArray(g.details) ? g.details : []) as Record<string, unknown>[])
    .map((d) => ({ at: s(d.updatedAt), label: s(d.deliveryStatusDesc) || orderStatusLabel(s(d.deliveryStatus)) }))
    .sort((a, b) => b.at.localeCompare(a.at));
}
