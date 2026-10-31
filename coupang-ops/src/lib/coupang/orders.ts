// 발주서(주문) 조회(C3-1). 발주서 목록 조회(일단위 페이징)
// GET /v2/providers/openapi/apis/api/v5/vendors/{vendorId}/ordersheets?createdAtFrom=…&createdAtTo=…&status=…&maxPerPage=…&nextToken=…
// 명세: developers.coupang.com/ko/api/shipments/po-list-query-paging-by-day (2026-10-30 확인) — 기간 최대 31일, 한 쪽 최대 50건, status 필수.
// 주문자·수취인 정보는 화면에만 보여 주고 DB에 저장하지 않는다(실전화번호 ordererNumber/receiverNumber는 읽지 않음, 안심번호만).
// 외부 호출 없음(tests/orders.test.mjs).

export const ordersPath = (vendorId: string) => `/v2/providers/openapi/apis/api/v5/vendors/${encodeURIComponent(vendorId)}/ordersheets`;

export const ORDER_STATUSES: { value: string; label: string }[] = [
  { value: "ACCEPT", label: "결제완료" },
  { value: "INSTRUCT", label: "상품준비중" },
  { value: "DEPARTURE", label: "배송지시" },
  { value: "DELIVERING", label: "배송중" },
  { value: "FINAL_DELIVERY", label: "배송완료" },
  { value: "NONE_TRACKING", label: "업체 직접 배송" },
];

export const ORDER_MAX_PER_PAGE = 50; // 쿠팡 최대 50
export const ORDER_MAX_DAYS = 31; // 시작일·종료일 포함 31일(예: 7-01 ~ 7-31)

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const dayNumber = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 86_400_000;

/** 조회 기간 검사 — 문제가 있으면 안내 문장, 괜찮으면 null */
export function checkOrderRange(from: string, to: string): string | null {
  if (!DATE.test(from) || !DATE.test(to) || Number.isNaN(dayNumber(from)) || Number.isNaN(dayNumber(to))) return "조회 기간 날짜를 다시 골라 주세요.";
  const days = dayNumber(to) - dayNumber(from) + 1;
  if (days < 1) return "시작일이 종료일보다 늦습니다.";
  if (days > ORDER_MAX_DAYS) return `쿠팡은 한 번에 ${ORDER_MAX_DAYS}일까지만 조회할 수 있습니다.`;
  return null;
}

/** 조회 조건 — 날짜는 명세 예시처럼 「yyyy-mm-dd%2B09:00」(한국 시간) */
export function ordersQuery(opt: { from: string; to: string; status: string; nextToken?: string }): string {
  const status = ORDER_STATUSES.some((s) => s.value === opt.status) ? opt.status : "ACCEPT";
  const parts = [`createdAtFrom=${opt.from}%2B09:00`, `createdAtTo=${opt.to}%2B09:00`, `maxPerPage=${ORDER_MAX_PER_PAGE}`, `status=${status}`];
  if (opt.nextToken) parts.push(`nextToken=${encodeURIComponent(opt.nextToken)}`);
  return parts.join("&");
}

/** S6 건수·점검용: 다음 쪽이 있으면 이어 읽는다. 호출을 아끼려고 기본 3쪽(150건)까지. 다 못 읽으면 nextToken이 남는다 */
export async function readPages<T>(readPage: (nextToken?: string) => Promise<{ items: T[]; nextToken?: string | null }>, maxPages = 3): Promise<{ items: T[]; nextToken: string }> {
  const items: T[] = [];
  let token = "";
  for (let i = 0; i < maxPages; i++) {
    const r = await readPage(token || undefined);
    items.push(...r.items);
    token = r.nextToken ?? "";
    if (!token) break;
  }
  return { items, nextToken: token };
}

export type OrderItem = { vendorItemId: number; name: string; optionName: string; orderedQty: number; cancelQty: number; qty: number; unitPrice: number; orderPrice: number; estimatedShippingDate: string };
export type OrderSheet = {
  shipmentBoxId: number;
  orderId: number;
  orderedAt: string;
  paidAt: string;
  status: string;
  ordererName: string;
  receiverName: string;
  receiverSafeNumber: string;
  postCode: string;
  address: string;
  message: string;
  shippingPrice: number;
  deliveryCompanyName: string;
  invoiceNumber: string;
  items: OrderItem[];
};

const s = (v: unknown) => (v == null ? "" : String(v)).trim();
/** 가격은 { currencyCode, units, nanos } 객체(v5) — 옛 응답처럼 숫자로 와도 읽는다 */
export function money(v: unknown): number {
  if (typeof v === "number") return v;
  if (v && typeof v === "object") return Number((v as { units?: unknown }).units) || 0;
  return Number(v) || 0;
}

export function normalizeOrderSheets(raw: unknown): { orders: OrderSheet[]; nextToken: string } {
  const r = (raw ?? {}) as { data?: unknown; nextToken?: unknown };
  const orders = (Array.isArray(r.data) ? r.data : [])
    .map((o: Record<string, unknown>) => {
      const orderer = (o.orderer ?? {}) as Record<string, unknown>;
      const receiver = (o.receiver ?? {}) as Record<string, unknown>;
      const items = (Array.isArray(o.orderItems) ? o.orderItems : []).map((it: Record<string, unknown>) => {
        const orderedQty = Number(it.shippingCount) || 0;
        const cancelQty = (Number(it.holdCountForCancel) || 0) + (Number(it.cancelCount) || 0);
        return {
          vendorItemId: Number(it.vendorItemId) || 0,
          name: s(it.vendorItemName) || s(it.sellerProductName),
          optionName: s(it.firstSellerProductItemName),
          orderedQty,
          cancelQty,
          qty: Math.max(0, orderedQty - cancelQty), // 발주 가능 수량(명세: shippingCount − (holdCountForCancel + cancelCount))
          unitPrice: money(it.salesPrice),
          orderPrice: money(it.orderPrice),
          estimatedShippingDate: s(it.estimatedShippingDate),
        };
      });
      return {
        shipmentBoxId: Number(o.shipmentBoxId) || 0,
        orderId: Number(o.orderId) || 0,
        orderedAt: s(o.orderedAt),
        paidAt: s(o.paidAt),
        status: s(o.status),
        ordererName: s(orderer.name),
        receiverName: s(receiver.name),
        receiverSafeNumber: s(receiver.safeNumber),
        postCode: s(receiver.postCode),
        address: [s(receiver.addr1), s(receiver.addr2)].filter(Boolean).join(" "),
        message: s(o.parcelPrintMessage),
        shippingPrice: money(o.shippingPrice),
        deliveryCompanyName: s(o.deliveryCompanyName),
        invoiceNumber: s(o.invoiceNumber),
        items,
      };
    })
    .filter((o) => o.shipmentBoxId > 0);
  return { orders, nextToken: s(r.nextToken) };
}

export const orderStatusLabel = (v: string) => ORDER_STATUSES.find((x) => x.value === v)?.label ?? v;

// ── C3-2 상품준비중 처리 ─────────────────────────────────────────────
// PATCH /v2/providers/openapi/apis/api/v4/vendors/{vendorId}/ordersheets/acknowledgement  body { vendorId, shipmentBoxIds(최대 50) }
// 명세: developers.coupang.com/ko/api/shipments/changing-the-status-to-product-in-preparation (2026-10-30 확인)
// 결제완료 주문에만 적용되고(아니면 쿠팡이 건별 실패로 돌려줌), 결과는 건별 succeed. 처리 뒤 고객이 배송지를 바꿨을 수 있어 다시 조회해 확인한다.

export const ackPath = (vendorId: string) => `/v2/providers/openapi/apis/api/v4/vendors/${encodeURIComponent(vendorId)}/ordersheets/acknowledgement`;
export const ACK_MAX = 50;

/** 보낼 묶음배송번호 정리(중복·0 제거). 문제가 있으면 error */
export function ackIds(ids: unknown[]): { ids: number[] } | { error: string } {
  const clean = [...new Set(ids.map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0))];
  if (clean.length === 0) return { error: "상품준비중으로 바꿀 주문을 골라 주세요." };
  if (clean.length > ACK_MAX) return { error: `한 번에 ${ACK_MAX}건까지만 처리할 수 있습니다.` };
  return { ids: clean };
}

export type AckResult = { shipmentBoxId: number; ok: boolean; message: string; retryable: boolean };

/** 묶음배송번호별 결과(상품준비중·송장 업로드·송장 수정 응답이 같은 모양) */
export function normalizeAckResult(raw: unknown, sent: number[], done = "상품준비중으로 바꿨습니다."): { results: AckResult[]; summary: string } {
  const data = ((raw ?? {}) as { data?: Record<string, unknown> }).data ?? {};
  const list = Array.isArray(data.responseList) ? (data.responseList as Record<string, unknown>[]) : [];
  const byId = new Map(list.map((r) => [Number(r.shipmentBoxId), r]));
  const results = sent.map((id) => {
    const r = byId.get(id);
    if (!r) return { shipmentBoxId: id, ok: false, message: "쿠팡 응답에 이 주문 결과가 없습니다. 발주서를 다시 불러와 상태를 확인해 주세요.", retryable: false };
    const ok = r.succeed === true;
    return { shipmentBoxId: id, ok, message: ok ? done : s(r.resultMessage) || s(r.resultCode) || "쿠팡이 처리하지 않았습니다.", retryable: !ok && r.retryRequired === true };
  });
  const okCount = results.filter((r) => r.ok).length;
  return { results, summary: `${results.length}건 중 ${okCount}건을 처리했습니다(${done.replace(/.$/, "")}).` };
}

// ── C3-3 송장 등록·수정 ─────────────────────────────────────────────
// 등록 POST …/vendors/{vendorId}/orders/invoices        — 상품준비중 주문만, 성공하면 배송지시로 바뀜
// 수정 POST …/vendors/{vendorId}/orders/updateInvoices  — 배송지시·배송중·배송완료·업체직송 상태만
// 명세: developers.coupang.com/ko/api/shipments/uploading-waybills · updating-waybills (2026-10-30 확인)
// 분리배송은 다루지 않는다(splitShipping false — 한 배송 묶음 = 송장 하나, 묶음 안 옵션 모두 같은 송장으로 보냄. 빠지면 쿠팡이 NOT_FOUND_VENDOR_ITEM).

export const invoicePath = (vendorId: string, mode: "upload" | "update") =>
  `/v2/providers/openapi/apis/api/v4/vendors/${encodeURIComponent(vendorId)}/orders/${mode === "upload" ? "invoices" : "updateInvoices"}`;
/** 송장을 새로 올릴 수 있는 상태 / 고칠 수 있는 상태 */
export const INVOICE_UPLOAD_STATUS = "INSTRUCT";
export const INVOICE_UPDATE_STATUSES = ["DEPARTURE", "DELIVERING", "FINAL_DELIVERY", "NONE_TRACKING"];

/** 송장번호 정리: 공백·하이픈 제거. CJ대한통운·업체직송은 숫자만(쿠팡 오류 사례), 그 밖은 영문·숫자 6~30자 */
export function cleanInvoice(courier: string, raw: string): { invoice: string } | { error: string } {
  const invoice = String(raw ?? "").replace(/[\s-]/g, "");
  if (!invoice) return { error: "송장번호를 넣어 주세요." };
  if ((courier === "CJGLS" || courier === "DIRECT") && !/^\d+$/.test(invoice)) return { error: "이 택배사 송장번호는 숫자만 넣어 주세요." };
  if (!/^[0-9A-Za-z]{6,30}$/.test(invoice)) return { error: "송장번호는 영문·숫자 6~30자로 넣어 주세요." };
  return { invoice };
}

export type InvoiceEntry = { shipmentBoxId: number; orderId: number; courier: string; invoice: string; vendorItemIds: number[] };

/** 화면에서 받은 입력을 검사해 쿠팡 요청 본문으로 만든다(번호마다 문제가 있으면 errors) */
export function invoiceBody(vendorId: string, entries: InvoiceEntry[]): { body: Record<string, unknown>; ids: number[] } | { errors: string[] } {
  const errors: string[] = [];
  if (entries.length === 0) errors.push("송장을 넣은 주문이 없습니다.");
  if (entries.length > ACK_MAX) errors.push(`한 번에 ${ACK_MAX}건까지만 처리할 수 있습니다.`);
  const seen = new Set<number>();
  const dtos: Record<string, unknown>[] = [];
  for (const e of entries) {
    const box = Number(e.shipmentBoxId);
    const label = `배송번호 ${box || "?"}`;
    if (!Number.isInteger(box) || box <= 0 || !Number(e.orderId)) { errors.push(`${label}: 주문 정보가 없습니다.`); continue; }
    if (seen.has(box)) { errors.push(`${label}: 같은 주문이 두 번 들어 있습니다.`); continue; }
    seen.add(box);
    const courier = String(e.courier ?? "").trim().toUpperCase();
    if (!/^[A-Z0-9_]{2,30}$/.test(courier)) { errors.push(`${label}: 택배사를 골라 주세요.`); continue; }
    const inv = cleanInvoice(courier, e.invoice);
    if ("error" in inv) { errors.push(`${label}: ${inv.error}`); continue; }
    const items = [...new Set((e.vendorItemIds ?? []).map(Number).filter((n) => Number.isInteger(n) && n > 0))];
    if (items.length === 0) { errors.push(`${label}: 옵션 정보가 없습니다.`); continue; }
    for (const vendorItemId of items) {
      dtos.push({ shipmentBoxId: box, orderId: Number(e.orderId), vendorItemId, deliveryCompanyCode: courier, invoiceNumber: inv.invoice, splitShipping: false, preSplitShipped: false, estimatedShippingDate: "" });
    }
  }
  if (errors.length) return { errors };
  return { body: { vendorId, orderSheetInvoiceApplyDtos: dtos }, ids: [...seen] };
}

/** 엑셀에서 붙여 넣은 「주문번호(또는 배송번호) 송장번호」 줄을 읽는다. 탭·쉼표·공백 구분, 숫자가 아닌 머리글 줄은 건너뜀 */
export function parseInvoicePaste(text: string): { key: number; invoice: string }[] {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.split(/[\t,;]+|\s{2,}|\s/).map((x) => x.trim()).filter(Boolean))
    .filter((cols) => cols.length >= 2 && /^\d+$/.test(cols[0].replace(/-/g, "")))
    .map((cols) => ({ key: Number(cols[0].replace(/-/g, "")), invoice: cols[cols.length - 1] }));
}
