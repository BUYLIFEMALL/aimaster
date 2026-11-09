"use client";

import { useActionState } from "react";
import { noResetSubmit } from "@/lib/no-reset-submit";
import { PERM_GROUPS } from "@/lib/staff";
import { inviteStaffAction, type InviteState } from "./actions";

// 직원 초대(D22) — 이메일·권한을 고르면 7일짜리 1회용 링크가 이 화면에만 한 번 보인다
export default function InviteForm({ slug }: { slug: string }) {
  const [state, formAction, pending] = useActionState(inviteStaffAction.bind(null, slug), { error: null, link: null, email: "" } as InviteState);
  return (
    <section className="rounded border p-4" data-staff-invite>
      <h2 className="text-sm font-semibold">직원 초대</h2>
      <p className="mt-1 text-xs text-gray-500">초대한 이메일로 로그인해야 수락할 수 있습니다. 링크는 7일 동안 한 번만 쓸 수 있고, 이 화면을 벗어나면 다시 볼 수 없습니다.</p>
      <form onSubmit={noResetSubmit(formAction)} className="mt-3 space-y-2 text-sm">
        <input name="email" type="email" required maxLength={120} defaultValue={state.email} placeholder="직원 이메일" className="w-full rounded border px-2 py-1.5 sm:w-80" />
        <div className="flex flex-wrap gap-3">
          {PERM_GROUPS.map((g) => (
            <label key={g.key} className="flex items-center gap-1"><input type="checkbox" name={`perm_${g.key}`} defaultChecked={g.key === "orders"} /> {g.label}</label>
          ))}
        </div>
        <p className="text-xs text-gray-500">설정(키·결제·알림·폐쇄몰)과 직원 관리는 대표만 할 수 있습니다.</p>
        <button disabled={pending} className="rounded bg-gray-900 px-4 py-1.5 text-white disabled:opacity-50">{pending ? "만드는 중…" : "초대 링크 만들기"}</button>
      </form>
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      {state.link && (
        <div className="mt-3 rounded bg-green-50 p-3 text-sm" data-invite-link>
          <p className="font-medium text-green-800">초대 링크를 만들었습니다. 직원에게 직접 전해 주세요.</p>
          <input readOnly value={state.link} className="mt-1 w-full rounded border bg-white px-2 py-1.5 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
        </div>
      )}
    </section>
  );
}
