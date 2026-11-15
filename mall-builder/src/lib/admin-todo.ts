// M2-3(2026-11-15) 운영사 대시보드 「처리할 일」 — 항목 정의(순수 함수, 단위 시험). 숫자 읽기는 admin-todo-server.ts
// 주문 항목은 M2-1 주문 목록 조건(OrderListQuery)으로 정의해, 숫자와 눌렀을 때 열리는 목록 건수가 항상 같다.
import { orderListHref, type OrderListQuery } from "./order-list.ts";

export type TodoTone = "urgent" | "normal" | "info";
export type TodoItem = { key: string; label: string; count: number; href: string; tone: TodoTone };
export type TodoGroup = { title: string; items: TodoItem[] };

/** 한국 날짜(YYYY-MM-DD) n일 전 */
export function kstDaysAgo(now: Date, n: number): string {
  return new Date(now.getTime() + 9 * 3600_000 - n * 86_400_000).toISOString().slice(0, 10);
}

const Q = (p: Partial<OrderListQuery>): OrderListQuery => ({ q: "", noTracking: false, page: 1, ...p });

/** 주문 「처리할 일」 — 목록 조건 그대로(누르면 그 조건 목록) */
export function orderTodoQueries(now: Date): { key: string; label: string; tone: TodoTone; query: OrderListQuery }[] {
  return [
    { key: "pending_payment", label: "입금 대기", tone: "normal", query: Q({ status: "pending_payment" }) },
    { key: "paid", label: "결제 완료(발송 준비 전)", tone: "urgent", query: Q({ status: "paid" }) },
    { key: "preparing", label: "배송 준비 중", tone: "normal", query: Q({ status: "preparing" }) },
    { key: "no_tracking", label: "송장 없음", tone: "urgent", query: Q({ noTracking: true }) },
    { key: "late3", label: "3일 넘게 발송 전", tone: "urgent", query: Q({ noTracking: true, to: kstDaysAgo(now, 3) }) },
    { key: "late7", label: "7일 넘게 발송 전", tone: "urgent", query: Q({ noTracking: true, to: kstDaysAgo(now, 7) }) },
    { key: "cancel_requested", label: "취소 요청", tone: "urgent", query: Q({ status: "cancel_requested" }) },
    { key: "return_requested", label: "반품 요청", tone: "urgent", query: Q({ status: "return_requested" }) },
    { key: "refund_pending", label: "환불 대기(무통장)", tone: "urgent", query: Q({ refundPending: true }) },
  ];
}

/** 답변·승인 대기 — menu는 관리 메뉴 주소(직원 권한 판정·이동) */
export const WAITING_TODOS = [
  { key: "inquiries", label: "문의 답변 대기", menu: "/inquiries" },
  { key: "reviews", label: "후기 답글 대기", menu: "/reviews" },
  { key: "quotes", label: "견적 요청", menu: "/quotes" },
  { key: "biz", label: "사업자 승인 대기", menu: "/customers" },
  { key: "members", label: "회원 가입 승인 대기", menu: "/customers" },
  { key: "product_approval", label: "상품 승인 대기", menu: "/products" },
  { key: "supplier_apps", label: "공급사 입점 신청", menu: "/suppliers" },
  { key: "reseller_apps", label: "리셀러 신청", menu: "/resellers" },
  { key: "resale_apps", label: "분양 신청", menu: "/resale" },
  { key: "restock", label: "재입고 알림 대기", menu: "/restock" },
] as const;
export type WaitingKey = (typeof WAITING_TODOS)[number]["key"];

export const PRODUCT_TODOS = [
  { key: "on_sale", label: "판매 중", tone: "info" },
  { key: "low_stock", label: "재고 바닥(판매 중)", tone: "urgent" },
  { key: "sold_out", label: "품절", tone: "normal" },
  { key: "hidden", label: "숨김", tone: "info" },
  { key: "draft", label: "임시 저장", tone: "info" },
] as const;
export type ProductKey = (typeof PRODUCT_TODOS)[number]["key"];

export type TodoCounts = {
  orders: Partial<Record<string, number>>;
  waiting: Partial<Record<WaitingKey, number>>;
  products: Partial<Record<ProductKey, number>>;
};

/** 화면에 보일 묶음 — 볼 수 없는 메뉴는 빼고, 「답변·승인 대기」는 0건 항목을 숨김(전부 0이면 묶음째 숨김) */
export function buildTodoGroups(c: TodoCounts, base: string, now: Date, can: (menu: string) => boolean): TodoGroup[] {
  const groups: TodoGroup[] = [];
  if (can("/orders")) {
    groups.push({
      title: "주문 처리",
      items: orderTodoQueries(now).map((o) => ({ key: o.key, label: o.label, count: c.orders[o.key] ?? 0, href: orderListHref(`${base}/orders`, o.query, {}), tone: o.tone })),
    });
  }
  const waiting = WAITING_TODOS.filter((w) => can(w.menu) && (c.waiting[w.key] ?? 0) > 0).map((w) => ({
    key: w.key, label: w.label, count: c.waiting[w.key] ?? 0, href: `${base}${w.menu}`, tone: "urgent" as const,
  }));
  if (waiting.length) groups.push({ title: "답변·승인 대기", items: waiting });
  if (can("/products")) {
    groups.push({
      title: "상품 현황",
      items: PRODUCT_TODOS.map((p) => ({ key: p.key, label: p.label, count: c.products[p.key] ?? 0, href: `${base}/products`, tone: p.tone })),
    });
  }
  return groups;
}
