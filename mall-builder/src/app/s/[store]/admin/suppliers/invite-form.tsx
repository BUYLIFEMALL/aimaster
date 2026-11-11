"use client";

import { useActionState } from "react";
import { noResetSubmit } from "@/lib/no-reset-submit";
import { inviteSupplierAction, type SupplierInviteState } from "@/lib/supplier-actions";

// D34 공급사 초대 — 이름·이메일을 적으면 7일짜리 1회용 링크가 이 화면에만 한 번 보인다
export default function SupplierInviteForm({ slug }: { slug: string }) {
  const [state, formAction, pending] = useActionState(inviteSupplierAction.bind(null, slug), { error: null, link: null, keep: {} } as SupplierInviteState);
  const k = state.keep;
  return (
    <section className="rounded border p-4" data-supplier-invite>
      <h2 className="text-sm font-semibold">공급사 초대</h2>
      <p className="mt-1 text-xs text-gray-500">공급사는 초대한 이메일로 로그인해야 수락할 수 있습니다. 링크는 7일 동안 한 번만 쓸 수 있고, 이 화면을 벗어나면 다시 볼 수 없습니다(목록에서 새로 만들 수 있음).</p>
      <form key={state.link ?? "invite"} onSubmit={noResetSubmit(formAction)} className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <input name="name" required maxLength={60} defaultValue={k.name} placeholder="공급사 이름(상호)" className="rounded border px-2 py-2" />
        <input name="email" type="email" required maxLength={120} defaultValue={k.email} placeholder="공급사 로그인 이메일" className="rounded border px-2 py-2" />
        <input name="biz_no" maxLength={20} defaultValue={k.biz_no} placeholder="사업자등록번호(선택)" className="rounded border px-2 py-2" />
        <input name="contact_name" maxLength={30} defaultValue={k.contact_name} placeholder="담당자(선택)" className="rounded border px-2 py-2" />
        <input name="phone" maxLength={30} defaultValue={k.phone} placeholder="연락처(선택)" className="rounded border px-2 py-2" />
        <input name="memo" maxLength={300} defaultValue={k.memo} placeholder="운영자 메모(공급사에게 안 보임)" className="rounded border px-2 py-2" />
        <button disabled={pending} className="min-h-11 rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-50 sm:col-span-2 sm:w-fit">{pending ? "만드는 중…" : "초대 링크 만들기"}</button>
      </form>
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      {state.link && <InviteLink link={state.link} />}
    </section>
  );
}

export function InviteLink({ link }: { link: string }) {
  return (
    <div className="mt-3 rounded bg-green-50 p-3 text-sm" data-supplier-link>
      <p className="font-medium text-green-800">초대 링크를 만들었습니다. 공급사에게 직접 전해 주세요.</p>
      <input readOnly value={link} className="mt-1 w-full rounded border bg-white px-2 py-1.5 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
    </div>
  );
}
