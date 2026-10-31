// 출고중지·취소(C3-4). 경로·본문·정리만 — 외부 호출 없음(tests/returns.test.mjs).
// 명세(developers.coupang.com, 2026-10-30 확인):
//   반품·취소 요청 목록 GET /v6/vendors/{vendorId}/returnRequests  (/ko/api/returns/return-cancellation-request-list-query)
//     일단위: createdAtFrom/To = yyyy-MM-dd, 최대 31일, status RU(출고중지요청)·UC(반품접수)…, cancelType=CANCEL이면 status 빼고 조회, maxPerPage 기본 50, nextToken
//     「발송 전에 출고중지요청(RU)을 반드시 확인」, 상품준비중 단계 반품 접수는 RU·UC 둘 다 확인
//   출고중지완료 PATCH /v4/vendors/{vendorId}/returnRequests/{receiptId}/stoppedShipment  body { vendorId, receiptId, cancelCount(=접수 수량) }
//   이미출고   PATCH /v4/vendors/{vendorId}/returnRequests/{receiptId}/completedShipment body { vendorId, receiptId, deliveryCompanyCode, invoiceNumber }
//     둘 다 receiptStatus RELEASE_STOP_UNCHECKED·RETURNS_UNCHECKED 이고 releaseStatus "N" 일 때만. 응답 data.resultCode SUCCESS|FAIL
//   주문 상품 취소 POST /v5/vendors/{vendorId}/orders/{orderId}/cancel (/ko/api/shipments/cancel-an-order)
//     body { orderId, vendorItemIds[], receiptCounts[], bigCancelCode "CANERR", middleCancelCode, vendorId, userId(WING 아이디) }
//     결제완료 = 즉시 취소, 상품준비중 = 출고중지 처리. 묶음배송번호마다 따로 요청. 판매자 점수(주문이행)가 낮아짐.
// 신청인 이름·전화·회수지 주소는 읽지 않는다(화면에 필요 없음, 저장 안 함).

const V = (ver: number, vendorId: string) => `/v2/providers/openapi/apis/api/v${ver}/vendors/${encodeURIComponent(vendorId)}`;
export const returnsPath = (vendorId: string) => `${V(6, vendorId)}/returnRequests`;
export const stopShipmentPath = (vendorId: string, receiptId: number) => `${V(4, vendorId)}/returnRequests/${receiptId}/stoppedShipment`;
export const alreadyShippedPath = (vendorId: string, receiptId: number) => `${V(4, vendorId)}/returnRequests/${receiptId}/completedShipment`;
export const cancelOrderPath = (vendorId: string, orderId: number) => `${V(5, vendorId)}/orders/${orderId}/cancel`;
// 반품 입고 확인 PATCH …/receiveConfirmation { vendorId, receiptId } · 승인 PATCH …/approval { vendorId, receiptId, cancelCount } (명세 2026-10-31 확인)
//   입고 확인: 반품접수(RETURNS_UNCHECKED) 건, 빠른환불 대상은 이 단계에서 바로 환불·완료될 수 있다. 승인: 입고완료(VENDOR_WAREHOUSE_CONFIRM) 건, 환불이 나간다.
export const returnReceiptPath = (vendorId: string, receiptId: number) => `${V(4, vendorId)}/returnRequests/${receiptId}/receiveConfirmation`;
export const returnApprovalPath = (vendorId: string, receiptId: number) => `${V(4, vendorId)}/returnRequests/${receiptId}/approval`;
/** 반품요청 단건 조회 GET /v6/vendors/{vendorId}/returnRequests/{receiptId} — data는 배열(목록과 같은 필드) */
export const returnOnePath = (vendorId: string, receiptId: number) => `${returnsPath(vendorId)}/${receiptId}`;

/** 화면에서 고르는 조회 종류 */
export const RETURN_VIEWS: { value: string; label: string }[] = [
  { value: "RU", label: "출고중지 요청" },
  { value: "UC", label: "반품 접수" },
  { value: "CANCEL", label: "취소된 주문(결제완료 단계)" },
];

export function returnsQuery(opt: { from: string; to: string; view: string; nextToken?: string }): string {
  const q = new URLSearchParams({ createdAtFrom: opt.from, createdAtTo: opt.to, maxPerPage: "50" });
  if (opt.view === "CANCEL") q.set("cancelType", "CANCEL");
  else q.set("status", opt.view === "UC" ? "UC" : "RU");
  if (opt.nextToken) q.set("nextToken", opt.nextToken);
  return q.toString();
}

const RECEIPT_STATUS: Record<string, string> = {
  RELEASE_STOP_UNCHECKED: "출고중지요청",
  RETURNS_UNCHECKED: "반품접수",
  VENDOR_WAREHOUSE_CONFIRM: "입고완료",
  REQUEST_COUPANG_CHECK: "쿠팡확인요청",
  RETURNS_COMPLETED: "반품완료",
};
const RELEASE: Record<string, string> = { Y: "출고됨", N: "미출고", S: "출고중지됨", A: "이미출고됨" };

export type ReturnItem = { vendorItemId: number; name: string; purchaseCount: number; cancelCount: number; shipmentBoxId: number; release: string; releaseLabel: string };
export type ReturnRequest = {
  receiptId: number;
  orderId: number;
  receiptType: string;
  receiptStatus: string;
  statusLabel: string;
  createdAt: string;
  reason: string;
  cancelCountSum: number;
  releaseStopStatus: string;
  items: ReturnItem[];
  /** 출고중지완료·이미출고를 처리할 수 있는가(명세 조건) */
  actionable: boolean;
};

const s = (v: unknown) => (v == null ? "" : String(v)).trim();

export function normalizeReturns(raw: unknown): { requests: ReturnRequest[]; nextToken: string } {
  const r = (raw ?? {}) as { data?: unknown; nextToken?: unknown };
  const requests = (Array.isArray(r.data) ? r.data : [])
    .map((x: Record<string, unknown>) => {
      const items = (Array.isArray(x.returnItems) ? x.returnItems : []).map((it: Record<string, unknown>) => ({
        vendorItemId: Number(it.vendorItemId) || 0,
        name: s(it.vendorItemName) || s(it.sellerProductName),
        purchaseCount: Number(it.purchaseCount) || 0,
        cancelCount: Number(it.cancelCount) || 0,
        shipmentBoxId: Number(it.shipmentBoxId) || 0,
        release: s(it.releaseStatus),
        releaseLabel: RELEASE[s(it.releaseStatus)] ?? s(it.releaseStatus),
      }));
      const receiptStatus = s(x.receiptStatus);
      return {
        receiptId: Number(x.receiptId) || 0,
        orderId: Number(x.orderId) || 0,
        receiptType: s(x.receiptType),
        receiptStatus,
        statusLabel: RECEIPT_STATUS[receiptStatus] ?? receiptStatus,
        createdAt: s(x.createdAt),
        reason: [s(x.cancelReasonCategory1), s(x.cancelReasonCategory2), s(x.cancelReason)].filter(Boolean).join(" · "),
        cancelCountSum: Number(x.cancelCountSum) || 0,
        releaseStopStatus: s(x.releaseStopStatus),
        items,
        actionable: (receiptStatus === "RELEASE_STOP_UNCHECKED" || receiptStatus === "RETURNS_UNCHECKED") && items.length > 0 && items.every((it) => it.release === "N"),
      };
    })
    .filter((x) => x.receiptId > 0);
  return { requests, nextToken: s(r.nextToken) };
}

/** 지금 누를 수 있는 반품 단계. 미출고 반품접수는 출고중지 흐름이라 입고 확인 대상이 아니다 */
export function returnSteps(r: Pick<ReturnRequest, "receiptStatus" | "actionable">): { canConfirmReceipt: boolean; canApprove: boolean } {
  return { canConfirmReceipt: r.receiptStatus === "RETURNS_UNCHECKED" && !r.actionable, canApprove: r.receiptStatus === "VENDOR_WAREHOUSE_CONFIRM" };
}

/** 출고중지완료·이미출고 응답(data.resultCode) */
export function normalizeReturnAction(raw: unknown): { ok: boolean; message: string } {
  const d = ((raw ?? {}) as { data?: { resultCode?: unknown; resultMessage?: unknown } }).data ?? {};
  const ok = s(d.resultCode) === "SUCCESS";
  return { ok, message: s(d.resultMessage) || (ok ? "처리했습니다." : "쿠팡이 처리하지 않았습니다.") };
}

/** 판매자 취소 사유(명세 중분류 3가지, 대분류는 CANERR 고정) */
export const CANCEL_REASONS: { code: string; label: string }[] = [
  { code: "CCTTER", label: "재고 문제(품절)" },
  { code: "CCPNER", label: "배송지 문제(주소로 배송 불가)" },
  { code: "CCPRER", label: "가격 등록 오류" },
];

export function cancelBody(opt: { vendorId: string; userId: string; orderId: number; reason: string; items: { vendorItemId: number; count: number }[] }): Record<string, unknown> | { error: string } {
  if (!Number.isInteger(opt.orderId) || opt.orderId <= 0) return { error: "주문번호가 없습니다." };
  if (!CANCEL_REASONS.some((r) => r.code === opt.reason)) return { error: "취소 사유를 골라 주세요." };
  if (!opt.userId) return { error: "「API키등록·플랫폼연동」에 WING 아이디가 없습니다." };
  const items = opt.items.filter((it) => Number.isInteger(it.vendorItemId) && it.vendorItemId > 0 && Number.isInteger(it.count) && it.count > 0);
  if (items.length === 0) return { error: "취소할 수 있는 수량이 없습니다(이미 취소·환불 진행 중일 수 있습니다)." };
  return {
    orderId: opt.orderId,
    vendorItemIds: items.map((it) => it.vendorItemId),
    receiptCounts: items.map((it) => it.count),
    bigCancelCode: "CANERR",
    middleCancelCode: opt.reason,
    vendorId: opt.vendorId,
    userId: opt.userId,
  };
}

/** 취소 응답 — 명세 표와 예시의 필드 이름이 달라(receiptMap/ReceiptMap, failedVendorItemIds/failedItemIds) 둘 다 읽는다 */
export function normalizeCancel(raw: unknown): { failed: number[]; receiptType: string; total: number } {
  const d = ((raw ?? {}) as { data?: Record<string, unknown> }).data ?? {};
  const map = (d.receiptMap ?? d.ReceiptMap ?? {}) as Record<string, unknown>;
  const failedRaw = (d.failedVendorItemIds ?? d.failedItemIds ?? []) as unknown[];
  return {
    failed: (Array.isArray(failedRaw) ? failedRaw : []).map(Number).filter((n) => n > 0),
    receiptType: s(map.receiptType),
    total: Number(map.totalCount) || 0,
  };
}

/** 송장 등록 전 안전 점검: 출고중지요청·반품접수 목록에서 아직 처리 안 된 주문번호 모으기 */
export function blockedOrderIds(requests: ReturnRequest[]): Set<number> {
  return new Set(requests.filter((r) => r.receiptStatus === "RELEASE_STOP_UNCHECKED" || r.receiptStatus === "RETURNS_UNCHECKED").map((r) => r.orderId));
}
