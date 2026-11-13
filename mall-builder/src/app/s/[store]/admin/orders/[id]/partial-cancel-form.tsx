"use client";

import { formatWon } from "@/lib/products";
import type { OrderItemRow } from "@/lib/orders";
import { useInlineConfirm } from "@/app/inline-confirm";

// 운영자 부분 취소(D5) — 품목마다 「취소할 수량」 칸. 보내기 전에 한 번 더 묻는다(되돌릴 수 없음)
export default function PartialCancelForm({ items, action, isCredit, isCard = false, usedBenefits = false }: { items: OrderItemRow[]; action: (form: FormData) => Promise<void>; isCredit: boolean; isCard?: boolean; usedBenefits?: boolean }) {
  // 카드 주문은 줄어든 금액이 카드로 자동 환불된다(D11) — 「직접 환불」 안내는 무통장 주문에만
  const tail = (isCard ? " 줄어든 금액은 카드로 바로 환불됩니다." : isCredit ? " 외상 장부에서도 되돌립니다." : " 입금된 주문이면 차액은 직접 환불해 주세요.") +
    // 쿠폰·포인트를 쓴 주문(D17·D18): 현금(입금·카드·외상)부터 돌려주고 남으면 포인트로
    (usedBenefits ? " 쿠폰·포인트를 쓴 주문이라 현금부터 돌려주고, 남는 금액은 포인트로 돌려줍니다." : "");
  const c = useInlineConfirm();
  return (
    <form
      action={action}
      onSubmit={c.guard(`고른 수량을 취소할까요? 재고가 돌아오고 결제 금액이 줄어듭니다.${tail}`)}
      className="mt-6 rounded-lg border p-4 text-sm"
      data-partial-cancel
    >
      <h3 className="mb-2 font-semibold">부분 취소</h3>
      <ul className="divide-y">
        {items.map((it) => {
          const left = it.qty - it.cancelled_qty;
          return (
            <li key={it.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="min-w-0 flex-1">
                {it.name_snapshot}
                {it.option_snapshot && <span className="text-gray-500"> · {it.option_snapshot}</span>}
                <span className="ml-1 text-gray-500">({formatWon(it.unit_price)} · 남은 {left}개)</span>
              </span>
              {left > 0 ? (
                <label className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">취소</span>
                  <input type="number" name={`cancel_${it.id}`} min={0} max={left} defaultValue={0} className="w-20 rounded border px-2 py-1" />
                  <span className="text-xs text-gray-500">개</span>
                </label>
              ) : (
                <span className="text-xs text-gray-400">모두 취소됨</span>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="text-xs text-gray-500">메모(선택, 손님에게도 보임)</span>
          <input name="note" maxLength={200} className="mt-0.5 w-64 rounded border px-2 py-1.5" placeholder="예: 블랙 재고 부족" />
        </label>
        <button className="min-h-10 rounded border border-red-200 px-4 text-red-700">선택 수량 취소</button>
      </div>
      {c.box}
      <p className="mt-2 text-xs text-gray-500">단가는 주문 때 그대로입니다. 배송비는 남은 품목으로 다시 계산하되 원래 배송비보다 늘지 않습니다. 모든 품목을 취소하려면 위 「주문 취소」를 써 주세요.</p>
    </form>
  );
}
