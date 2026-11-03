// 주문 상태 이름표 — 손님·운영자 화면 공통(상태 흐름: docs/mall/ARCHITECTURE.md §5)

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
  created_at: string;
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
};

export type OrderEventRow = { id: string; from_status: OrderStatus | null; to_status: OrderStatus; actor_role: string; note: string; created_at: string };

export const ORDER_COLUMNS = "id, order_no, status, subtotal, shipping_fee, total, receiver, depositor, bank, memo, created_at";

/** 입금 기한 안내 등 날짜를 한국 시간으로 */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}
