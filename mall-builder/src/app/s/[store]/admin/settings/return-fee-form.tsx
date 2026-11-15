"use client";

// M2-7 반품비 기본값(몰 설정) — 단순 변심·기타 반품의 반품비 기본값. 불량·오배송은 0. 운영사가 반품 승인 때 고칠 수 있다
import { useActionState } from "react";
import { saveReturnFeeAction, type ReturnFeeState } from "@/lib/return-actions";
const INITIAL: ReturnFeeState = { error: null, message: null };

export default function ReturnFeeForm({ slug, fee }: { slug: string; fee: number }) {
  const [state, action, pending] = useActionState(saveReturnFeeAction.bind(null, slug), INITIAL);
  return (
    <fieldset className="rounded-lg border p-4" data-return-fee>
      <legend className="px-1 text-sm font-semibold">↩️ 반품비</legend>
      <form action={action} className="flex flex-wrap items-end gap-2">
        <label className="block text-sm">
          <span>반품비 기본값(원)</span>
          <input name="return_fee" defaultValue={fee || ""} inputMode="numeric" placeholder="예: 6000" className="mt-1 w-32 rounded border px-3 py-2" />
        </label>
        <button disabled={pending} className="min-h-10 rounded bg-gray-900 px-4 text-sm text-white disabled:opacity-50">{pending ? "저장 중…" : "저장"}</button>
        {state.error && <span className="text-sm text-red-600">{state.error}</span>}
        {state.message && <span className="text-sm text-green-700">{state.message}</span>}
      </form>
      <p className="mt-2 text-xs text-gray-500">단순 변심·기타 사유 반품에 이 금액을 빼고 환불합니다(보통 왕복 배송비). 상품 불량·오배송은 0원. 반품 승인 때 주문마다 고칠 수 있습니다.</p>
    </fieldset>
  );
}
