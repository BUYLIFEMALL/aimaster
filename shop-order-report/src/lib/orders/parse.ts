// 표 → 주문 줄(순수 함수). 지정된 칸만 읽으므로 개인정보 열 값은 결과에 들어가지 않는다.
import type { SheetData } from "@/lib/sheet";
import type { FieldId, MarketId } from "./markets";

export type OrderStatus = "new" | "shipping" | "done" | "cancel" | "return" | "exchange";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "신규·발송 전",
  shipping: "배송 중",
  done: "배송 완료",
  cancel: "취소",
  return: "반품",
  exchange: "교환",
};

export interface OrderLine {
  /** 마켓|주문 키 — 중복 제거 기준 */
  id: string;
  market: MarketId;
  orderNo: string;
  orderedAt: string; // YYYY-MM-DD
  product: string;
  option: string;
  qty: number;
  amount: number;
  settlement: number | null;
  shippingFee: number;
  status: OrderStatus;
  statusRaw: string;
}

/** 마켓마다 다른 상태 글자를 6가지로 묶는다. 순서가 중요(반품·교환·취소를 먼저 본다). */
export function normalizeStatus(raw: string): OrderStatus {
  const s = raw.replace(/\s/g, "");
  if (!s) return "done";
  if (/반품|환불/.test(s)) return "return";
  if (/교환/.test(s)) return "exchange";
  if (/취소/.test(s)) return "cancel";
  if (/배송완료|구매확정|거래완료|수취확인|정산완료/.test(s)) return "done";
  if (/배송중|발송완료|출고완료|배송시작|집화/.test(s)) return "shipping";
  if (/신규|결제완료|발송대기|상품준비|발주|입금|주문접수|배송준비|발송전|미발송/.test(s)) return "new";
  return "done";
}

/** 「29,900원」「₩ 1,000」「-500」 → 숫자. 읽을 수 없으면 null. */
export function parseMoney(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v ?? "").replace(/[,\s원₩]/g, "");
  if (!s || !/^-?\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

/** 여러 날짜 모양 → YYYY-MM-DD. 엑셀 날짜 숫자도 받는다. */
export function parseDate(v: unknown): string | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const s = String(v ?? "").trim();
  if (!s) return null;
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    // 엑셀 날짜 번호(1900 체계)
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(s)) * 86400000);
    return d.toISOString().slice(0, 10);
  }
  const m = /^(\d{4})[-./년\s]*(\d{1,2})[-./월\s]*(\d{1,2})/.exec(s);
  if (m) {
    const [, y, mo, d] = m;
    const mm = Number(mo), dd = Number(d);
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) return `${y}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  }
  const short = /^(\d{2})[-./](\d{1,2})[-./](\d{1,2})/.exec(s);
  if (short) return `20${short[1]}-${short[2].padStart(2, "0")}-${short[3].padStart(2, "0")}`;
  return null;
}

export interface ParseResult {
  lines: OrderLine[];
  skipped: { row: number; reason: string }[];
}

/** 표와 칸 대응으로 주문 줄을 만든다. 같은 파일 안 같은 주문 키는 한 번만. */
export function toOrderLines(sheet: SheetData, market: MarketId, map: Partial<Record<FieldId, string>>): ParseResult {
  const lines: OrderLine[] = [];
  const skipped: ParseResult["skipped"] = [];
  const seen = new Set<string>();
  const get = (rec: Record<string, string>, f: FieldId) => (map[f] ? rec[map[f] as string] ?? "" : "");
  sheet.rows.forEach((rec, i) => {
    const rowNo = i + 2;
    const orderNo = get(rec, "orderNo").trim();
    const orderedAt = parseDate(get(rec, "orderedAt"));
    const product = get(rec, "product").trim();
    const amount = parseMoney(get(rec, "amount"));
    const qty = parseMoney(get(rec, "qty")) ?? 1;
    if (!orderNo) return skipped.push({ row: rowNo, reason: "주문번호 없음" });
    if (!orderedAt) return skipped.push({ row: rowNo, reason: "주문일을 읽지 못함" });
    if (!product) return skipped.push({ row: rowNo, reason: "상품명 없음" });
    if (amount == null) return skipped.push({ row: rowNo, reason: "금액을 읽지 못함" });
    const option = get(rec, "option").trim();
    const lineNo = get(rec, "lineNo").trim();
    const key = lineNo || `${orderNo}#${product}#${option}`;
    const id = `${market}|${key}`;
    if (seen.has(id)) return skipped.push({ row: rowNo, reason: "같은 파일 안 중복 줄" });
    seen.add(id);
    const statusRaw = get(rec, "status").trim();
    lines.push({
      id,
      market,
      orderNo,
      orderedAt,
      product,
      option,
      qty: Math.max(0, qty),
      amount,
      settlement: parseMoney(get(rec, "settlement")),
      shippingFee: parseMoney(get(rec, "shippingFee")) ?? 0,
      status: normalizeStatus(statusRaw),
      statusRaw,
    });
  });
  return { lines, skipped };
}

/** 이미 있는 주문에 새 주문을 합친다. 같은 id는 새 값으로(상태가 바뀐 최신 파일 우선). */
export function mergeLines(existing: OrderLine[], incoming: OrderLine[]): { lines: OrderLine[]; added: number; updated: number } {
  const byId = new Map(existing.map((l) => [l.id, l]));
  let added = 0, updated = 0;
  for (const l of incoming) {
    if (byId.has(l.id)) updated += 1;
    else added += 1;
    byId.set(l.id, l);
  }
  return { lines: [...byId.values()].sort((a, b) => a.orderedAt.localeCompare(b.orderedAt)), added, updated };
}
