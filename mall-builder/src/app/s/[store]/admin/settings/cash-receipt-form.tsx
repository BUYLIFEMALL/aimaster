"use client";

// M2-10 현금영수증 받기(볼타) — 켜면 무통장 주문 유저가 주문 상세에서 신청하고, 입금 확인 때 자동 발급된다. 대표만 바꿀 수 있다(DB가 검사)
import { useActionState } from "react";
import { saveCashReceiptSettingAction, type CashReceiptSettingState } from "@/lib/cash-receipt-actions";
const INITIAL: CashReceiptSettingState = { error: null, message: null };

export default function CashReceiptForm({ slug, enabled, hasKey }: { slug: string; enabled: boolean; hasKey: boolean }) {
  const [state, action, pending] = useActionState(saveCashReceiptSettingAction.bind(null, slug), INITIAL);
  return (
    <fieldset className="rounded-lg border p-4" data-cash-receipt-setting>
      <legend className="px-1 text-sm font-semibold">🧾 현금영수증(볼타)</legend>
      <form action={action} className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="enabled" value="1" defaultChecked={enabled} /> 무통장 입금 주문에 현금영수증 신청 받기
        </label>
        <button disabled={pending} className="min-h-10 rounded bg-gray-900 px-4 text-sm text-white disabled:opacity-50">{pending ? "저장 중…" : "저장"}</button>
        {state.error && <span className="text-sm text-red-600">{state.error}</span>}
        {state.message && <span className="text-sm text-green-700">{state.message}</span>}
      </form>
      <p className="mt-2 text-xs text-gray-500">
        유저가 주문 상세에서 휴대폰(소득공제·지출증빙) 또는 사업자번호를 넣으면, 입금 확인 때 운영사님 볼타 계정으로 자동 발급하고 주문 취소·반품 때 자동 취소합니다. 볼타 현금영수증 발행은 무료입니다.
        API 키는 위 「세금계산서 발행(볼타)」 칸의 키를 함께 쓰고, 쇼핑몰 정보의 상호·대표자·사업자등록번호·전화번호가 필요합니다.
      </p>
      {!hasKey && <p className="mt-1 text-xs text-amber-700">아직 볼타 API 키가 없습니다 — 켜 두어도 발급이 「발급 안 됨」으로 남습니다.</p>}
    </fieldset>
  );
}
