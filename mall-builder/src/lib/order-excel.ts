// M2-2(2026-11-15) 운영사 주문 엑셀 — 내려받기 칸 만들기·송장 시트 읽기·일괄 처리 계획(순수 함수, exceljs 없음 → 단위 시험)
// 내려받은 파일의 「택배사·송장번호」 칸을 채워 그대로 다시 올리면 송장 일괄 등록이 된다.

export const ORDER_EXPORT_MAX = 3000;
export const TRACKING_MAX_ROWS = 500;
export const ORDER_SHEET = "주문";

export const EXPORT_HEADERS = [
  "주문번호", "주문일시", "상태", "주문자", "받는 분", "연락처", "우편번호", "주소", "상세 주소",
  "품목", "수량 합계", "상품 금액", "배송비", "결제 금액", "결제 방법", "입금자", "메모", "택배사", "송장번호",
] as const;

export type ExportOrder = {
  order_no: string;
  created_at: string;
  status: string;
  receiver: { receiver?: string; phone?: string; zip?: string; addr1?: string; addr2?: string } | null;
  depositor: string;
  memo: string;
  subtotal: number;
  shipping_fee: number;
  total: number;
  is_card: boolean;
  is_credit: boolean;
  is_guest: boolean;
  guest_name: string | null;
  courier: string;
  tracking_no: string;
  items: { name_snapshot: string; option_snapshot: string; qty: number; cancelled_qty: number }[];
};

/** 한국 시간 「2026-11-15 14:05」 */
export function kstStamp(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 3600_000);
  return d.toISOString().slice(0, 16).replace("T", " ");
}

export function payMethodLabel(o: Pick<ExportOrder, "is_card" | "is_credit">): string {
  return o.is_card ? "카드" : o.is_credit ? "외상" : "무통장 입금";
}

/** 주문 한 건 → 엑셀 한 줄(글자). 취소한 수량은 빼고 적는다 */
export function orderExportRow(o: ExportOrder, statusLabel: Record<string, string>): string[] {
  const r = o.receiver ?? {};
  const live = o.items.map((i) => ({ ...i, left: i.qty - (i.cancelled_qty ?? 0) })).filter((i) => i.left > 0);
  const items = live.map((i) => `${i.name_snapshot}${i.option_snapshot ? ` (${i.option_snapshot})` : ""} × ${i.left}`).join(" / ");
  const qty = live.reduce((s, i) => s + i.left, 0);
  const tracking = o.tracking_no === "품목별 송장" ? "" : o.tracking_no; // 품목별 송장은 주문 상세에서
  return [
    o.order_no, kstStamp(o.created_at), statusLabel[o.status] ?? o.status, o.is_guest ? `${o.guest_name ?? ""}(비회원)` : "",
    r.receiver ?? "", r.phone ?? "", r.zip ?? "", r.addr1 ?? "", r.addr2 ?? "",
    items, String(qty), String(o.subtotal), String(o.shipping_fee), String(o.total), payMethodLabel(o), o.depositor ?? "", o.memo ?? "",
    tracking ? o.courier : "", tracking,
  ];
}

export type TrackingLine = { row: number; orderNo: string; courier: string; tracking: string };
export type TrackingSheet = { lines: TrackingLine[]; errors: { row: number; message: string }[] };

const norm = (s: string) => s.replace(/\s+/g, "");

/** 송장 시트 읽기 — 머리글에서 「주문번호·택배사·송장번호」 칸을 찾고(순서·다른 칸 무관), 두 칸 다 빈 줄은 건너뜀 */
export function parseTrackingSheet(table: string[][]): TrackingSheet | { error: string } {
  const head = (table[0] ?? []).map((h) => norm(h ?? ""));
  const col = (name: string) => head.indexOf(norm(name));
  const [cNo, cCourier, cTrack] = [col("주문번호"), col("택배사"), col("송장번호")];
  if (cNo < 0 || cCourier < 0 || cTrack < 0) return { error: "첫 줄에 「주문번호」「택배사」「송장번호」 칸이 있어야 합니다. 주문 엑셀을 내려받아 그 파일에 채워 올려 주세요." };
  const out: TrackingSheet = { lines: [], errors: [] };
  const seen = new Map<string, number>();
  for (let i = 1; i < table.length; i++) {
    const row = i + 1;
    const cell = (c: number) => String(table[i]?.[c] ?? "").trim();
    const orderNo = cell(cNo);
    const courier = cell(cCourier);
    const tracking = cell(cTrack).replace(/\s+/g, "");
    if (!orderNo || (!courier && !tracking)) continue; // 송장을 안 채운 주문 줄은 그대로 둠
    if (!courier || !tracking) { out.errors.push({ row, message: `${orderNo}: 택배사와 송장번호를 둘 다 넣어 주세요.` }); continue; }
    if (courier.length > 30 || tracking.length > 40) { out.errors.push({ row, message: `${orderNo}: 택배사 30자·송장번호 40자 이내로 넣어 주세요.` }); continue; }
    if (seen.has(orderNo)) { out.errors.push({ row, message: `${orderNo}: ${seen.get(orderNo)}번째 줄과 같은 주문입니다(한 주문에 한 줄).` }); continue; }
    seen.set(orderNo, row);
    out.lines.push({ row, orderNo, courier, tracking });
  }
  if (out.lines.length > TRACKING_MAX_ROWS) return { error: `한 번에 ${TRACKING_MAX_ROWS}건까지 올릴 수 있습니다(지금 ${out.lines.length}건). 나눠 올려 주세요.` };
  return out;
}

/** 송장을 넣을 때 거칠 상태 이동 — 결제 완료는 배송 준비를 거쳐 배송 중으로. 그 밖은 null(사유) */
export function trackingSteps(status: string): { steps: ("preparing" | "shipping")[] } | { skip: string } {
  if (status === "preparing") return { steps: ["shipping"] };
  if (status === "paid") return { steps: ["preparing", "shipping"] };
  if (status === "shipping") return { skip: "이미 배송 중입니다(송장 수정은 주문 상세에서)." };
  return { skip: "결제 완료·배송 준비 주문만 송장을 넣을 수 있습니다." };
}

/** 목록에서 고른 주문을 한꺼번에 바꿀 수 있는 상태(되돌리기·환불이 없는 앞으로 가는 이동만) */
export const BULK_TARGETS = { paid: "입금 확인", preparing: "배송 준비", delivered: "배송 완료" } as const;
export type BulkTarget = keyof typeof BULK_TARGETS;
export const BULK_MAX = 100;

export function isBulkTarget(v: string): v is BulkTarget {
  return Object.prototype.hasOwnProperty.call(BULK_TARGETS, v);
}

/** 고른 주문 id 정리 — uuid만, 중복 제거, 최대 BULK_MAX */
export function cleanIds(values: string[]): string[] {
  const ok = values.filter((v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v));
  return [...new Set(ok)].slice(0, BULK_MAX);
}
