"use client";

import { useActionState } from "react";
import { saveGuestSettingAction, type GuestSettingState } from "./guest-actions";

// 비회원 주문(D15) — 기본 끔. 켜면 로그인 없이 장바구니·무통장 주문, 주문번호+휴대폰으로 조회
export default function GuestForm({ slug, enabled }: { slug: string; enabled: boolean }) {
  const [state, formAction, pending] = useActionState(saveGuestSettingAction.bind(null, slug), { error: null, message: null } as GuestSettingState);
  return (
    <fieldset className="rounded-lg border p-4" data-guest-setting>
      <legend className="px-1 text-sm font-semibold">비회원 주문</legend>
      <p className="text-sm text-gray-600">
        켜면 로그인·가입하지 않은 손님도 장바구니에 담고 <b>무통장 입금</b>으로 주문할 수 있습니다. 손님은 주문번호와 휴대폰 번호로 주문을 조회·취소합니다.
        카드 결제·외상·등급가·견적·세금계산서·후기·문의는 가입 손님만 씁니다. 사업자 전용 상품과 비회원에게 가격을 숨긴 상품은 비회원이 주문할 수 없습니다.
      </p>
      <form action={formAction} className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="guest_order" defaultChecked={enabled} /> 비회원 주문 받기
        </label>
        <button disabled={pending} className="min-h-11 rounded bg-gray-900 px-5 py-2 text-white disabled:opacity-50">{pending ? "저장 중…" : "비회원 주문 저장"}</button>
      </form>
      <p className="mt-2 text-sm" data-guest-setting-status>상태 <b>{enabled ? "켜짐" : "꺼짐"}</b></p>
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      {state.message && <p className="mt-2 text-sm text-green-700">{state.message}</p>}
    </fieldset>
  );
}
