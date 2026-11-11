"use client";

import { useActionState } from "react";
import { noResetSubmit } from "@/lib/no-reset-submit";
import { saveTaxSettingsAction, testTaxKeyAction, type TaxState } from "./tax-actions";

export type TaxStatus = { hasKey: boolean; mode: string; managerEmail: string; businessType: string; businessItem: string };

// 세금계산서 발행(볼타, D19) — 운영자 본인 볼타 키·공동인증서로 발행. 손님 요청 → 운영자가 주문 상세에서 「발행」
export default function TaxForm({ slug, status }: { slug: string; status: TaxStatus }) {
  const initial: TaxState = { error: null, message: null, managerEmail: status.managerEmail, businessType: status.businessType, businessItem: status.businessItem };
  const [state, formAction, pending] = useActionState(saveTaxSettingsAction.bind(null, slug), initial);
  const [testState, testAction, testing] = useActionState(testTaxKeyAction.bind(null, slug), initial);
  const label = !status.hasKey ? "키 없음(홈택스에서 직접 발행)" : status.mode === "live" ? "라이브 키 — 실제 국세청 발행" : "테스트 키 — 국세청 전송·요금 없음";

  return (
    <fieldset className="rounded-lg border p-4" data-tax-settings>
      <legend className="px-1 text-sm font-semibold">세금계산서 발행(볼타)</legend>
      <p className="text-sm text-gray-600">
        사업자 손님이 주문에 세금계산서를 요청하면, 주문 상세에서 「발행」 한 번으로 전자세금계산서를 보냅니다. 운영자님 본인 볼타(bolta.io) 계정의 API 키와 공동인증서로 발행되고, 요금(건당 90원, VAT 별도)은 운영자님 볼타 포인트에서 빠집니다. 카드 결제 주문은 카드 매출전표가 대신하므로 발행하지 않습니다.
      </p>
      <p className="mt-2 text-sm" data-tax-status>상태 <b>{label}</b></p>

      <form onSubmit={noResetSubmit(formAction)} className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm">볼타 API 키(test_… / live_…) {status.hasKey && <span className="text-green-700">(등록됨 — 바꿀 때만 입력)</span>}</span>
          <input name="api_key" type="password" autoComplete="off" maxLength={210} placeholder={status.hasKey ? "••••••••" : "test_로 시작"} className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm">담당자 메일(세금계산서 공급자 담당, 40자 이내)</span>
          <input name="manager_email" type="email" defaultValue={state.managerEmail} maxLength={40} placeholder="비우면 쇼핑몰 정보의 이메일" className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-sm">업태(선택)</span>
            <input name="business_type" defaultValue={state.businessType} maxLength={100} placeholder="예: 도소매" className="mt-1 w-full rounded border px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-sm">종목(선택)</span>
            <input name="business_item" defaultValue={state.businessItem} maxLength={100} placeholder="예: 생활가전" className="mt-1 w-full rounded border px-3 py-2" />
          </label>
        </div>
        {status.hasKey && (
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="remove_key" /> 등록한 볼타 키 지우기
          </label>
        )}
        <div className="sm:col-span-2">
          <button disabled={pending} className="min-h-11 rounded bg-gray-900 px-5 py-2 text-white disabled:opacity-50">{pending ? "저장 중…" : "세금계산서 설정 저장"}</button>
        </div>
      </form>
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      {state.message && <p className="mt-2 text-sm text-green-700">{state.message}</p>}
      {status.hasKey && (
        <form action={testAction} className="mt-3">
          <button disabled={testing} className="rounded border px-4 py-1.5 text-sm" data-tax-test>{testing ? "확인 중…" : "연결 시험(요금 없음)"}</button>
          {testState.error && <span className="ml-2 text-sm text-red-600">{testState.error}</span>}
          {testState.message && <span className="ml-2 text-sm text-green-700">{testState.message}</span>}
        </form>
      )}
      <p className="mt-3 text-xs text-gray-500">
        처음 한 번: 볼타 가입 → 개발자센터에서 API 키 발급 → 볼타 화면에서 사업자 공동인증서 등록. 테스트 키(test_)로는 국세청 전송도 요금도 없이 시험할 수 있습니다. 공급자 정보(상호·대표자·사업자등록번호·주소)는 위 「쇼핑몰 정보」 값을 씁니다.
      </p>
    </fieldset>
  );
}
