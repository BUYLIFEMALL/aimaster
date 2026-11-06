// 주문 상태 이름표 — 손님·운영자 화면 공통(상태 흐름: docs/mall/ARCHITECTURE.md §5)
import type { TaxInvoice } from "./taxInvoice.ts";

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "preparing"
  | "shipping"
  | "delivered"
  | "confirmed"
  | "cancel_requested"
  | "cancelled"
  | "return_requested"
  | "returned";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "입금 대기",
  paid: "결제 완료",
  preparing: "배송 준비",
  shipping: "배송 중",
  delivered: "배송 완료",
  confirmed: "구매 확정",
  cancel_requested: "취소 요청",
  cancelled: "취소",
  return_requested: "반품 요청",
  returned: "반품 완료",
};

export type ActorRole = "customer" | "staff";

/**
 * 허용 상태 이동표 — DB 함수 mall_builder_change_order_status의 표(0009_order_flow.sql)와 같아야 한다.
 * [바꾸는 사람, 지금 상태, 다음 상태, 버튼 글자]
 */
export const TRANSITIONS: [ActorRole, OrderStatus, OrderStatus, string][] = [
  ["customer", "pending_payment", "cancelled", "주문 취소"],
  ["customer", "paid", "cancel_requested", "취소 요청"],
  ["customer", "preparing", "cancel_requested", "취소 요청"],
  ["customer", "delivered", "confirmed", "구매 확정"],
  ["customer", "delivered", "return_requested", "반품 요청"],
  ["staff", "pending_payment", "paid", "입금 확인"],
  ["staff", "pending_payment", "cancelled", "주문 취소"],
  ["staff", "paid", "preparing", "배송 준비"],
  ["staff", "paid", "cancelled", "주문 취소"],
  ["staff", "preparing", "shipping", "발송(송장 입력)"],
  ["staff", "preparing", "cancelled", "주문 취소"],
  ["staff", "shipping", "delivered", "배송 완료"],
  ["staff", "delivered", "confirmed", "구매 확정"],
  ["staff", "cancel_requested", "cancelled", "취소 승인"],
  ["staff", "cancel_requested", "paid", "취소 거절"],
  ["staff", "return_requested", "returned", "반품 승인"],
  ["staff", "return_requested", "delivered", "반품 거절"],
];

/** 이 사람이 지금 상태에서 할 수 있는 이동(버튼 목록) */
export function nextActions(role: ActorRole, from: OrderStatus): { to: OrderStatus; label: string }[] {
  return TRANSITIONS.filter(([r, f]) => r === role && f === from).map(([, , to, label]) => ({ to, label }));
}

export function canTransition(role: ActorRole, from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS.some(([r, f, t]) => r === role && f === from && t === to);
}

/** 재고를 되돌리는 도착 상태 */
export const RESTOCK_STATUSES: OrderStatus[] = ["cancelled", "returned"];

export type OrderRow = {
  id: string;
  order_no: string;
  status: OrderStatus;
  subtotal: number;
  shipping_fee: number;
  total: number;
  receiver: { label: string; receiver: string; phone: string; zip: string; addr1: string; addr2: string; region: string };
  depositor: string;
  bank: { bank_name: string | null; bank_account: string | null; bank_holder: string | null };
  memo: string;
  courier: string;
  tracking_no: string;
  is_credit: boolean;
  /** 카드 결제 주문(0028) — 입금 대기로 시작해 토스 결제 승인 때 결제 완료 */
  is_card: boolean;
  tax_invoice: TaxInvoice | null;
  /** 입금 기한(자동 취소가 켜진 몰의 무통장 주문, 카드 주문은 결제 기한 30분) — 지나면 자동 취소 */
  pay_deadline_at: string | null;
  created_at: string;
  /** 비회원 주문(D15) — user_id 없이 이름·휴대폰(·이메일)로 주문, 조회는 토큰으로 */
  is_guest: boolean;
  guest_name: string | null;
  guest_phone: string | null;
  guest_email: string | null;
};

export type OrderItemRow = {
  id: string;
  product_id: string | null;
  name_snapshot: string;
  option_snapshot: string;
  image_url: string | null;
  unit_price: number;
  qty: number;
  line_total: number;
  cancelled_qty: number; // 부분 취소한 수량(D5) — 남은 금액 = unit_price × (qty - cancelled_qty)
};

/** 부분 취소할 수 있는 상태(배송 전) — DB 함수 mall_builder_cancel_order_items와 같은 기준 */
export const PARTIAL_CANCEL_STATUSES = ["pending_payment", "paid", "preparing"] as const;

export type OrderEventRow = { id: string; from_status: OrderStatus | null; to_status: OrderStatus; actor_role: string; note: string; created_at: string };

export const ORDER_COLUMNS = "id, order_no, status, subtotal, shipping_fee, total, receiver, depositor, bank, memo, courier, tracking_no, is_credit, is_card, tax_invoice, pay_deadline_at, created_at, is_guest, guest_name, guest_phone, guest_email";

/** 입금 기한 안내 등 날짜를 한국 시간으로 */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}
