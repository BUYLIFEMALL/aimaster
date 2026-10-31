// 발주서 파일 만들기·송장 파일 읽기(R1). 외부 호출 없음(tests/orderFile.test.mjs). 파일은 브라우저에서만 다루고 서버에 저장하지 않는다.
import { COMMON_COURIERS } from "./defaults.ts";
import type { OrderSheet } from "./orders.ts";

export const ORDER_FILE_HEADERS = ["주문번호", "배송번호", "받는분", "안심번호", "우편번호", "주소", "상품", "수량", "배송메시지", "택배사", "송장번호"];

/** 배송 묶음 하나가 한 줄(송장 하나). 취소 수량을 뺀 보낼 수량만 적고, 비어 있는 상품은 적지 않는다 */
export function orderFileRows(orders: OrderSheet[], courierCode: string): string[][] {
  const courier = COMMON_COURIERS.find((c) => c.code === courierCode)?.name ?? "";
  return [
    ORDER_FILE_HEADERS,
    ...orders.map((o) => {
      const items = o.items.filter((i) => i.qty > 0);
      return [
        String(o.orderId),
        String(o.shipmentBoxId),
        o.receiverName,
        o.receiverSafeNumber,
        o.postCode,
        o.address,
        items.map((i) => `${i.name}${i.optionName && i.optionName !== i.name ? ` (${i.optionName})` : ""} x${i.qty}`).join(" / "),
        String(items.reduce((sum, i) => sum + i.qty, 0)),
        o.message,
        courier,
        o.invoiceNumber,
      ];
    }),
  ];
}

const pick = (row: Record<string, string>, names: string[]) => {
  const key = Object.keys(row).find((k) => names.some((n) => k.replace(/\s/g, "").includes(n)));
  return key ? row[key] : "";
};
const digits = (v: string) => v.replace(/[-\s]/g, "");

export function courierCodeOf(name: string): string {
  const n = name.replace(/\s/g, "").toUpperCase();
  if (!n) return "";
  return COMMON_COURIERS.find((c) => c.code === n || c.name.replace(/\s/g, "").toUpperCase() === n || c.name.replace(/\s/g, "").toUpperCase().includes(n) || n.includes(c.name.replace(/\s/g, "").toUpperCase()))?.code ?? "";
}

export type InvoiceFill = { shipmentBoxId: number; invoice: string; courier: string };

/** 택배사에서 받은 파일을 지금 목록의 주문에 맞춘다. 열 이름으로 찾고, 맞지 않는 줄은 건수로 알린다 */
export function matchInvoiceFile(rows: Record<string, string>[], orders: OrderSheet[]): { fills: InvoiceFill[]; unmatched: number; noInvoice: number; badKey: number } {
  const byBox = new Map(orders.map((o) => [String(o.shipmentBoxId), o]));
  const byOrder = new Map<string, OrderSheet[]>();
  for (const o of orders) byOrder.set(String(o.orderId), [...(byOrder.get(String(o.orderId)) ?? []), o]);
  const fills: InvoiceFill[] = [];
  let unmatched = 0;
  let noInvoice = 0;
  let badKey = 0;
  for (const row of rows) {
    const box = digits(pick(row, ["배송번호", "묶음배송"]));
    const order = digits(pick(row, ["주문번호"]));
    const invoice = digits(pick(row, ["송장", "운송장"]));
    if (!invoice) { noInvoice++; continue; }
    // 엑셀이 긴 번호를 2.2E+13처럼 바꾸면 값이 틀어지므로 받지 않는다
    if (/[eE]\+/.test(box) || /[eE]\+/.test(order)) { badKey++; continue; }
    const hit = byBox.get(box) ?? ((byOrder.get(order)?.length ?? 0) === 1 ? byOrder.get(order)![0] : undefined);
    if (!hit) { unmatched++; continue; }
    fills.push({ shipmentBoxId: hit.shipmentBoxId, invoice, courier: courierCodeOf(pick(row, ["택배사"])) });
  }
  return { fills, unmatched, noInvoice, badKey };
}

export const chunk = <T,>(list: T[], size: number): T[][] => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));
