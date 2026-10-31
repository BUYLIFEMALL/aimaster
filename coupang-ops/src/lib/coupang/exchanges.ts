// 교환 처리(C4-2). 경로·본문·정리만 — 외부 호출 없음(tests/exchanges.test.mjs).
// 명세 2026-10-31 확인: 목록 GET v4 exchangeRequests(createdAtFrom/To yyyy-MM-ddTHH:mm:ss, 최대 7일, status, orderId, nextToken)
// 입고 확인 PATCH …/{id}/receiveConfirmation { exchangeId, vendorId } · 거부 PATCH …/{id}/rejection { exchangeId, vendorId, exchangeRejectCode: SOLDOUT|WITHDRAW }
// 교환 송장 POST …/{id}/invoices [{ exchangeId, vendorId, shipmentBoxId, goodsDeliveryCode, invoiceNumber }]
//   회수상태가 CompleteCollect일 때, 입고 확인 뒤 새로 생긴 shipmentBoxId로, 입고 확인 후 최대 10분 뒤 가능.
// 고객 이름·전화·주소 칸은 읽지 않는다.
import { redactInquiry } from "./inquiry.ts";

const base = (vendorId: string) => `/v2/providers/openapi/apis/api/v4/vendors/${encodeURIComponent(vendorId)}/exchangeRequests`;
export const exchangesPath = base;
export const exchangeConfirmPath = (vendorId: string, id: number) => `${base(vendorId)}/${id}/receiveConfirmation`;
export const exchangeRejectPath = (vendorId: string, id: number) => `${base(vendorId)}/${id}/rejection`;
export const exchangeInvoicePath = (vendorId: string, id: number) => `${base(vendorId)}/${id}/invoices`;

export const EXCHANGE_READ_GAP_SECONDS = 10;
export const EXCHANGE_REJECT_REASONS: { code: string; label: string }[] = [
  { code: "SOLDOUT", label: "교환할 상품이 품절" },
  { code: "WITHDRAW", label: "고객이 교환 요청을 철회" },
];
const DAY_MS = 86_400_000;
const KST_MS = 9 * 3_600_000;

/** 한국 시간 기준 오늘 포함 7일(문의 조회에서 차이 7일이 거절된 사례가 있어 같은 범위를 쓴다) */
export function exchangeRange(nowMs: number): { from: string; to: string } {
  const day = (ms: number) => new Date(ms + KST_MS).toISOString().slice(0, 10);
  return { from: `${day(nowMs - 6 * DAY_MS)}T00:00:00`, to: `${day(nowMs)}T23:59:59` };
}

export function exchangesQuery(opt: { from: string; to: string; orderId?: number; nextToken?: string }): string {
  const q = new URLSearchParams({ createdAtFrom: opt.from, createdAtTo: opt.to, maxPerPage: "50" });
  if (opt.orderId) q.set("orderId", String(opt.orderId));
  if (opt.nextToken) q.set("nextToken", opt.nextToken);
  return q.toString();
}

const STATUS: Record<string, string> = { RECEIPT: "접수", PROGRESS: "진행", SUCCESS: "완료", REJECT: "불가", CANCEL: "철회" };
const COLLECT: Record<string, string> = { BeforeDirection: "회수연동 전", CompleteDirection: "회수연동", Delivering: "회수 중", CompleteCollect: "업체 전달 완료", DirectionFail: "회수연동 실패", Fail: "회수 실패", Withdraw: "회수 철회", NoCollect: "회수 불필요", NoneData: "정보 없음" };
const FAULT: Record<string, string> = { COUPANG: "쿠팡 과실", VENDOR: "판매자 과실", CUSTOMER: "고객 과실", WMS: "물류 과실", GENERAL: "일반" };

export type ExchangeRow = {
  exchangeId: number;
  orderId: number;
  status: string;
  statusLabel: string;
  collectStatus: string;
  collectLabel: string;
  faultLabel: string;
  reason: string;
  createdAt: string;
  items: string[];
  /** 입고 확인 뒤 새로 생긴 배송번호. 교환 송장에 쓴다 */
  shipmentBoxId: string;
};

const s = (v: unknown) => (v == null ? "" : String(v)).trim();

export function normalizeExchanges(raw: unknown): { rows: ExchangeRow[]; nextToken: string } {
  const r = (raw ?? {}) as { data?: unknown; nextToken?: unknown };
  const rows = (Array.isArray(r.data) ? r.data : [])
    .map((x: Record<string, unknown>) => {
      const items = (Array.isArray(x.exchangeItemDtoV1s) ? x.exchangeItemDtoV1s : []) as Record<string, unknown>[];
      const groups = (Array.isArray(x.deliveryInvoiceGroupDtos) ? x.deliveryInvoiceGroupDtos : []) as Record<string, unknown>[];
      const status = s(x.exchangeStatus);
      const collect = s(x.collectStatus);
      return {
        exchangeId: Number(x.exchangeId) || 0,
        orderId: Number(x.orderId) || 0,
        status,
        statusLabel: STATUS[status] ?? status,
        collectStatus: collect,
        collectLabel: COLLECT[collect] ?? collect,
        faultLabel: FAULT[s(x.faultType)] ?? s(x.faultType),
        reason: redactInquiry([s(x.reasonCodeText), s(x.reasonEtcDetail)].filter(Boolean).join(" · ")),
        createdAt: s(x.createdAt),
        items: items.map((i) => s(i.targetItemName) || s(i.orderItemName)).filter(Boolean),
        shipmentBoxId: s(groups[groups.length - 1]?.shipmentBoxId),
      };
    })
    .filter((x) => x.exchangeId > 0);
  return { rows, nextToken: s(r.nextToken) };
}

/** 아직 처리 중인 교환 */
export const isOpenExchange = (r: Pick<ExchangeRow, "status">) => r.status === "RECEIPT" || r.status === "PROGRESS";
/** 고객이 보낸 상품이 도착해 입고 확인을 눌렀거나 누를 차례인가. 송장은 회수 완료 + 배송번호가 있어야 한다 */
export const canSendExchangeInvoice = (r: Pick<ExchangeRow, "status" | "collectStatus" | "shipmentBoxId">) => isOpenExchange(r) && r.collectStatus === "CompleteCollect" && !!r.shipmentBoxId;

export function exchangeInvoiceBody(vendorId: string, exchangeId: number, shipmentBoxId: string, courier: string, invoice: string) {
  return [{ exchangeId: String(exchangeId), vendorId, shipmentBoxId, goodsDeliveryCode: courier, invoiceNumber: invoice }];
}

/** 쓰기 응답. 교환 송장만 data.resultCode가 있고, 나머지는 HTTP 성공이면 처리된 것이다 */
export function exchangeActionFailed(raw: unknown): string {
  const d = (raw as { data?: { resultCode?: unknown; resultMessage?: unknown } })?.data;
  return s(d?.resultCode) === "FAIL" ? s(d?.resultMessage) || "쿠팡이 처리하지 않았습니다." : "";
}
