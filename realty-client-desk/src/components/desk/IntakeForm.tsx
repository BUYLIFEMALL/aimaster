"use client";

import { useActionState } from "react";
import { submitIntakeAction, type DeskState } from "@/lib/actions/desk";
import { adConsentText, collectionConsentItems, OPTIONAL_FIELDS_NOTE } from "@/lib/desk/consent";
import { ClientFields } from "@/components/desk/ClientFields";

// 고객 접수(로그인 없음) — 동의 문구 consent-v1(docs/CONSENT_DRAFT_20261103.md A·B)
export function IntakeForm({ token, officeName }: { token: string; officeName: string }) {
  const [state, action, pending] = useActionState<DeskState, FormData>(submitIntakeAction, {});
  if (state.success) return <p className="mx-card p-6 text-center text-base font-bold text-mx-text">✅ {state.success}</p>;
  return (
    <form action={action} className="mx-card space-y-5 p-5">
      <input type="hidden" name="token" value={token} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <ClientFields />
      <div className="rounded-xl border border-mx-border p-4 text-sm text-mx-text">
        <p className="mb-2 font-bold">개인정보 수집·이용 안내</p>
        <ul className="space-y-1">
          {collectionConsentItems(officeName).map((c) => (
            <li key={c.label}>
              <b>{c.label}</b>: {c.text}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-mx-muted">{OPTIONAL_FIELDS_NOTE}</p>
        <label className="mt-3 flex min-h-[44px] items-start gap-2 font-bold">
          <input type="checkbox" name="consented" required className="mt-1 h-5 w-5 shrink-0" />
          (필수) 위 내용을 읽고 개인정보 수집·이용에 동의합니다.
        </label>
        <label className="mt-2 flex min-h-[44px] items-start gap-2">
          <input type="checkbox" name="adConsented" className="mt-1 h-5 w-5 shrink-0" />
          <span>{adConsentText(officeName)}</span>
        </label>
      </div>
      {state.error && <p className="text-sm text-mx-danger">{state.error}</p>}
      <button type="submit" disabled={pending} className="mx-btn-primary min-h-[48px] w-full text-base disabled:opacity-60">
        {pending ? "보내는 중…" : "상담 신청하기"}
      </button>
    </form>
  );
}
