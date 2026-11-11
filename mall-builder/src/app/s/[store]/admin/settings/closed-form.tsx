"use client";

import { useActionState } from "react";
import { noResetSubmit } from "@/lib/no-reset-submit";
import { saveClosedAction, type ClosedState } from "./closed-actions";

export type ClosedStatus = { enabled: boolean; approval: boolean; code: boolean; notice: string; inviteCode: string; inviteUses: number; pending: number };

// 폐쇄몰(D20) — 승인된 회원만 상품을 보고 주문. 운영자 승인·초대 코드(몰 공용 1개)를 각각 켜고 끈다
export default function ClosedForm({ slug, status, customersHref }: { slug: string; status: ClosedStatus; customersHref: string }) {
  const [state, formAction, pending] = useActionState(saveClosedAction.bind(null, slug), { error: null, message: null } as ClosedState);

  return (
    <fieldset className="rounded-lg border p-4" data-closed-settings>
      <legend className="px-1 text-sm font-semibold">폐쇄몰(회원 전용)</legend>
      <p className="text-sm text-gray-600">
        켜면 승인된 회원만 상품·가격을 보고 주문할 수 있습니다. 그 밖의 손님에게는 「회원 전용 몰」 안내와 로그인·가입만 보입니다. 이미 가입한 손님은 그대로 들어올 수 있고, 비회원 주문은 꺼집니다.
      </p>
      <p className="mt-2 text-sm" data-closed-status>
        상태 <b>{status.enabled ? "켜짐" : "꺼짐"}</b>
        {status.enabled && status.pending > 0 && (
          <> · <a href={customersHref} className="text-amber-700 underline">입장 대기 {status.pending}명</a></>
        )}
        {status.code && status.inviteCode && (
          <> · 초대 코드 <b className="font-mono tracking-wider" data-invite-code>{status.inviteCode}</b> (사용 {status.inviteUses}번)</>
        )}
      </p>
      <form onSubmit={noResetSubmit(formAction)} className="mt-3 space-y-2 text-sm">
        <label className="flex items-center gap-2 font-medium"><input type="checkbox" name="enabled" defaultChecked={status.enabled} /> 폐쇄몰 켜기</label>
        <div className="flex flex-wrap gap-4 pl-6">
          <label className="flex items-center gap-2"><input type="checkbox" name="approval" defaultChecked={status.approval || !status.enabled} /> 운영자 승인(가입 뒤 대기)</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="code" defaultChecked={status.code || !status.enabled} /> 초대 코드(넣으면 바로 입장)</label>
          {status.code && status.inviteCode && <label className="flex items-center gap-2"><input type="checkbox" name="new_code" /> 코드 새로 만들기(이전 코드는 못 씀)</label>}
        </div>
        <label className="block">
          <span className="text-xs text-gray-500">안내 문구(선택, 승인 전 손님에게 보임)</span>
          <textarea name="notice" defaultValue={status.notice} maxLength={300} rows={2} placeholder="예: ○○회사 임직원 전용 복지몰입니다." className="mt-0.5 w-full rounded border px-2 py-1.5" />
        </label>
        <button disabled={pending} className="min-h-11 rounded bg-gray-900 px-5 py-2 text-white disabled:opacity-50">{pending ? "저장 중…" : "폐쇄몰 저장"}</button>
      </form>
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      {state.message && <p className="mt-2 text-sm text-green-700">{state.message}</p>}
    </fieldset>
  );
}
