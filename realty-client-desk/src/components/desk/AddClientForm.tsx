"use client";

import { useActionState } from "react";
import { addClientAction, type DeskState } from "@/lib/actions/desk";
import { CONSENT_METHODS } from "@/lib/desk/consent";
import { ClientFields } from "@/components/desk/ClientFields";

// 결정 1(2026-11-03): 직접 입력은 「동의를 받았습니다」 체크 + 방법·날짜가 있어야 저장
export function AddClientForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState<DeskState, FormData>(addClientAction, {});
  return (
    <details className="mx-card p-5" open={Boolean(state.error)}>
      <summary className="cursor-pointer text-base font-bold text-mx-text">➕ 고객 직접 입력 (전화·방문 고객)</summary>
      <form action={action} key={state.success ?? "form"} className="mt-4 space-y-4">
        <ClientFields />
        <div className="rounded-xl border border-mx-border p-4 text-sm text-mx-text">
          <label className="flex min-h-[44px] items-start gap-2 font-bold">
            {/* required: 서버에서 거절되면 React가 폼을 비워 적은 내용이 사라지므로, 제출 전에 브라우저가 먼저 막는다 */}
            <input type="checkbox" name="consented" required className="mt-1 h-5 w-5 shrink-0" />
            이 고객에게 개인정보 수집·이용 동의(목적·항목·1년 보관·거부 권리 안내)를 받았습니다. *
          </label>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-mx-muted" htmlFor="consentMethod">동의 받은 방법 *</label>
              <select id="consentMethod" name="consentMethod" defaultValue="" required className="mx-input">
                <option value="" disabled>고르세요</option>
                {CONSENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-mx-muted" htmlFor="consentDate">동의 받은 날짜 *</label>
              <input id="consentDate" name="consentDate" type="date" defaultValue={today} max={today} required className="mx-input" />
            </div>
          </div>
          <label className="mt-3 flex min-h-[44px] items-start gap-2">
            <input type="checkbox" name="adConsented" className="mt-1 h-5 w-5 shrink-0" />
            (선택) 매물 안내 문자(광고) 수신에도 동의를 받았습니다.
          </label>
        </div>
        {state.error && <p className="text-sm text-mx-danger">{state.error}</p>}
        {state.success && <p className="text-sm text-mx-success">{state.success}</p>}
        <button type="submit" disabled={pending} className="mx-btn-primary min-h-[44px] px-4 text-sm disabled:opacity-60">{pending ? "저장 중…" : "고객 저장"}</button>
      </form>
    </details>
  );
}
