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

export function normalizeAckResult(raw: unknown, sent: number[]): { results: AckResult[]; summary: string } {
  const data = ((raw ?? {}) as { data?: Record<string, unknown> }).data ?? {};
  const list = Array.isArray(data.responseList) ? (data.responseList as Record<string, unknown>[]) : [];
  const byId = new Map(list.map((r) => [Number(r.shipmentBoxId), r]));
  const results = sent.map((id) => {
    const r = byId.get(id);
    if (!r) return { shipmentBoxId: id, ok: false, message: "쿠팡 응답에 이 주문 결과가 없습니다. 발주서를 다시 불러와 상태를 확인해 주세요.", retryable: false };
    const ok = r.succeed === true;
    return { shipmentBoxId: id, ok, message: ok ? "상품준비중으로 바꿨습니다." : s(r.resultMessage) || s(r.resultCode) || "쿠팡이 처리하지 않았습니다.", retryable: !ok && r.retryRequired === true };
  });
  const okCount = results.filter((r) => r.ok).length;
  return { results, summary: `${results.length}건 중 ${okCount}건을 상품준비중으로 바꿨습니다.` };
}
