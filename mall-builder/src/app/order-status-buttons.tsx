"use client";

import { nextActions, type ActorRole, type OrderStatus } from "@/lib/orders";
import { changeOrderStatusAction } from "@/lib/order-actions";

// 지금 상태에서 할 수 있는 버튼들 — 취소·반품처럼 되돌리기 어려운 것은 한 번 더 묻는다. 발송은 택배사·송장 칸을 함께 받는다
const CONFIRM: Partial<Record<OrderStatus, string>> = {
  cancelled: "이 주문을 취소할까요? 재고가 되돌려집니다.",
  returned: "반품을 승인할까요? 재고가 되돌려집니다.",
  cancel_requested: "취소를 요청할까요?",
  return_requested: "반품을 요청할까요?",
  confirmed: "구매를 확정할까요? 확정 뒤에는 취소·반품을 요청할 수 없습니다.",
};

// 카드 주문(D11): 운영자 취소·반품 승인은 카드 환불과 함께 된다
const CARD_CONFIRM: Partial<Record<OrderStatus, string>> = {
  cancelled: "이 주문을 취소할까요? 재고가 되돌려지고, 결제된 카드 금액은 바로 환불됩니다.",
  returned: "반품을 승인할까요? 재고가 되돌려지고, 결제된 카드 금액은 바로 환불됩니다.",
};

export default function OrderStatusButtons({
  slug,
  orderId,
  status,
  role,
  backPath,
  isCard = false,
}: {
  slug: string;
  orderId: string;
  status: OrderStatus;
  role: ActorRole;
  backPath: string;
  /** 카드 주문이면 「입금 확인」을 숨긴다 — 결제 완료는 손님 결제창 승인으로만(0029 감시 트리거도 막음) */
  isCard?: boolean;
}) {
  const actions = nextActions(role, status).filter((a) => !(isCard && status === "pending_payment" && a.to === "paid"));
  if (!actions.length) return null;
  return (
    <div className="space-y-3" data-status-actions>
      {actions.map((a) => (
        <form
          key={a.to}
          action={changeOrderStatusAction.bind(null, slug, orderId, a.to, backPath)}
          onSubmit={(e) => {
            const msg = (isCard && role === "staff" && status !== "pending_payment" && CARD_CONFIRM[a.to]) || CONFIRM[a.to];
            if (msg && !window.confirm(msg)) e.preventDefault();
          }}
          className="flex flex-wrap items-end gap-2"
        >
          {a.to === "shipping" && (
            <>
              <label className="block">
                <span className="text-xs text-gray-500">택배사</span>
                <input name="courier" required maxLength={30} placeholder="CJ대한통운" className="mt-0.5 w-32 rounded border px-2 py-1.5 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">송장 번호</span>
                <input name="tracking_no" required maxLength={40} className="mt-0.5 w-44 rounded border px-2 py-1.5 text-sm" />
              </label>
            </>
          )}
          {role === "staff" && (
            <label className="block">
              <span className="text-xs text-gray-500">메모(선택)</span>
              <input name="note" maxLength={200} className="mt-0.5 w-48 rounded border px-2 py-1.5 text-sm" />
            </label>
          )}
          <button
            className={`min-h-10 rounded px-4 text-sm ${
              a.to === "cancelled" || a.to === "cancel_requested" || a.to === "return_requested" ? "border border-red-200 text-red-700" : "bg-gray-900 text-white"
            }`}
          >
            {a.label}
          </button>
        </form>
      ))}
    </div>
  );
}
