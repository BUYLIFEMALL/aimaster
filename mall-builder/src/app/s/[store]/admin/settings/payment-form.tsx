"use client";

import { useActionState } from "react";
import { noResetSubmit } from "@/lib/no-reset-submit";
import { keyMode, MODE_LABEL } from "@/lib/payment";
import { savePaymentAction, type PaymentState } from "./payment-actions";

export type PaymentStatus = { clientKey: string; enabled: boolean; hasSecret: boolean; secretMode: string };

export default function PaymentForm({ slug, status }: { slug: string; status: PaymentStatus }) {
  const initial: PaymentState = { error: null, message: null, clientKey: status.clientKey, enabled: status.enabled };
  const [state, formAction, pending] = useActionState(savePaymentAction.bind(null, slug), initial);
  const mode = keyMode(status.clientKey);
  const label = !status.enabled ? "꺼짐" : `켜짐 · ${mode ? MODE_LABEL[mode] : "키 확인 필요"}`;

  return (
    <fieldset className="rounded-lg border p-4" data-card-payment>
      <legend className="px-1 text-sm font-semibold">카드 결제(토스페이먼츠)</legend>
      <p className="text-sm text-gray-600">
        손님이 주문서에서 카드·간편결제로 바로 결제합니다. 운영자님 본인 토스페이먼츠 계정의 「결제위젯」 키를 씁니다. 결제 승인·환불은 서버 안에서만 처리되고 시크릿 키는 화면에 다시 보이지 않습니다.
      </p>
      <p className="mt-2 text-sm" data-card-status>상태 <b>{label}</b></p>

      <form onSubmit={noResetSubmit(formAction)} className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm">클라이언트 키(test_gck_… / live_gck_…)</span>
          <input name="client_key" defaultValue={state.clientKey} autoComplete="off" maxLength={120} placeholder="test_gck_로 시작" className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm">
            시크릿 키(test_gsk_… / live_gsk_…) {status.hasSecret && <span className="text-green-700">(등록됨 — 바꿀 때만 입력)</span>}
          </span>
          <input name="secret_key" type="password" autoComplete="off" maxLength={120} placeholder={status.hasSecret ? "••••••••" : "test_gsk_로 시작"} className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="enabled" defaultChecked={state.enabled} /> 손님 주문서에 카드 결제 켜기
        </label>
        {status.hasSecret && (
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="remove_secret" /> 등록한 시크릿 키 지우기
          </label>
        )}
        <div className="sm:col-span-2">
          <button disabled={pending} className="min-h-11 rounded bg-gray-900 px-5 py-2 text-white disabled:opacity-50">
            {pending ? "저장 중…" : "카드 결제 저장"}
          </button>
        </div>
      </form>
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      {state.message && <p className="mt-2 text-sm text-green-700">{state.message}</p>}
      <p className="mt-3 text-xs text-gray-500">
        키는 토스페이먼츠 개발자센터(developers.tosspayments.com) → API 키 → 「결제위젯 연동 키」에서 확인합니다. 전자결제 계약 전에는 테스트 키(test_)로 시험할 수 있고, 실제 돈은 나가지 않습니다. 실제 판매는 토스페이먼츠와 계약한 뒤 라이브 키(live_)로 바꿉니다(수수료는 운영자님 계약 조건).
        결제하지 않은 카드 주문은 30분 뒤 자동 취소되며(위 「입금 기한 자동 취소」 작업이 켜져 있을 때), 카드 주문을 취소·부분 취소하면 카드 환불이 함께 됩니다.
      </p>
    </fieldset>
  );
}
