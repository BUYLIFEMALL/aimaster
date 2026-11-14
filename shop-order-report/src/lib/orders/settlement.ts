// 정산 파일 → 주문 줄의 실제 정산액(순수 함수). 개인정보 열은 고르지 않는다.
// 마켓마다 정산 파일 열 이름이 달라 별칭으로 찾고, 못 찾으면 화면에서 회원이 고른다.
import type { SheetData } from "@/lib/sheet";
import type { MarketId } from "./markets";
import { isPersonalColumn } from "./markets";
import { parseMoney, type OrderLine } from "./parse";

export type SettleField = "orderNo" | "lineNo" | "amount";

export const SETTLE_FIELDS: { id: SettleField; label: string; required: boolean; aliases: string[] }[] = [
  { id: "orderNo", label: "주문번호", required: true, aliases: ["주문번호", "주문 번호", "orderid", "order no"] },
  { id: "lineNo", label: "상품주문번호", required: false, aliases: ["상품주문번호", "상품 주문번호", "주문상세번호", "주문순번"] },
  { id: "amount", label: "정산금액", required: true, aliases: ["최종정산금액", "정산금액", "정산예정금액", "정산대상금액", "정산액", "지급금액", "지급액", "판매자정산금액"] },
];

const norm = (s: string) => s.replace(/[\s_()\[\]]/g, "").toLowerCase();

export function guessSettleMapping(headers: string[]): Partial<Record<SettleField, string>> {
  const usable = headers.filter((h) => !isPersonalColumn(h));
  const map: Partial<Record<SettleField, string>> = {};
  for (const f of SETTLE_FIELDS) {
    const taken = () => Object.values(map);
    const exact = f.aliases.map(norm).map((a) => usable.find((h) => norm(h) === a && !taken().includes(h))).find(Boolean);
    const part = exact ?? f.aliases.map(norm).map((a) => usable.find((h) => norm(h).includes(a) && !taken().includes(h))).find(Boolean);
    if (part) map[f.id] = part;
  }
  return map;
}

export interface SettleResult {
  lines: OrderLine[];
  /** 정산액을 채운 주문 줄 수 */
  updatedLines: number;
  /** 정산 파일에서 읽은 줄 수 */
  readRows: number;
  /** 맞는 주문을 못 찾은 정산 파일 줄 수(이 PC에 아직 없는 주문 등) */
  unmatchedRows: number;
  /** 금액을 읽지 못해 건너뛴 정산 파일 줄 수 */
  badRows: number;
}

/**
 * 고른 마켓의 주문 줄에 정산액을 채운다.
 * 상품주문번호가 주문 줄 키와 맞으면 그 줄에, 아니면 같은 주문번호의 (아직 못 채운) 줄들에 판매금액 비율로 나눈다.
 * 같은 번호의 정산 줄이 여러 개면 더한다(할인·차감 줄 포함).
 */
export function applySettlement(lines: OrderLine[], market: MarketId, sheet: SheetData, map: Partial<Record<SettleField, string>>): SettleResult {
  const get = (rec: Record<string, string>, f: SettleField) => (map[f] ? (rec[map[f] as string] ?? "").trim() : "");
  const byLine = new Map<string, number>();
  const byOrder = new Map<string, number>();
  const orderRows = new Map<string, number>();
  let readRows = 0, badRows = 0;
  const lineKeys = new Set(lines.filter((l) => l.market === market).map((l) => l.id));
  for (const rec of sheet.rows) {
    const orderNo = get(rec, "orderNo");
    const amount = parseMoney(get(rec, "amount"));
    if (!orderNo) continue;
    if (amount == null) {
      badRows += 1;
      continue;
    }
    readRows += 1;
    const lineNo = get(rec, "lineNo");
    if (lineNo && lineKeys.has(`${market}|${lineNo}`)) byLine.set(lineNo, (byLine.get(lineNo) ?? 0) + amount);
    else {
      byOrder.set(orderNo, (byOrder.get(orderNo) ?? 0) + amount);
      orderRows.set(orderNo, (orderRows.get(orderNo) ?? 0) + 1);
    }
  }

  const next = new Map(lines.map((l) => [l.id, l]));
  const filled = new Set<string>();
  for (const [lineNo, amount] of byLine) {
    const id = `${market}|${lineNo}`;
    const l = next.get(id)!;
    next.set(id, { ...l, settlement: Math.round(amount), settlementFromFile: true });
    filled.add(id);
  }

  let unmatchedRows = 0;
  for (const [orderNo, amount] of byOrder) {
    const targets = lines.filter((l) => l.market === market && l.orderNo === orderNo && !filled.has(l.id));
    if (!targets.length) {
      unmatchedRows += orderRows.get(orderNo) ?? 0;
      continue;
    }
    const base = targets.reduce((s, l) => s + Math.max(0, l.amount), 0);
    let left = Math.round(amount);
    targets.forEach((l, i) => {
      const share = i === targets.length - 1 ? left : Math.round(base ? (amount * Math.max(0, l.amount)) / base : amount / targets.length);
      left -= share;
      next.set(l.id, { ...l, settlement: share, settlementFromFile: true });
      filled.add(l.id);
    });
  }

  return { lines: lines.map((l) => next.get(l.id)!), updatedLines: filled.size, readRows, unmatchedRows, badRows };
}
