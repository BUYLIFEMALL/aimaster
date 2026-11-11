"use client";

import { useActionState } from "react";
import { reinviteSupplierAction, type ReinviteState } from "@/lib/supplier-actions";
import { InviteLink } from "./invite-form";

// D34 수락 대기 공급사 — 링크를 잃어버렸거나 기간이 지났을 때 새로 만들기(옛 링크는 못 씀)
export default function ReinviteButton({ slug, supplierId }: { slug: string; supplierId: string }) {
  const [state, action, pending] = useActionState(reinviteSupplierAction.bind(null, slug, supplierId), { error: null, link: null } as ReinviteState);
  return (
    <div>
      <form action={action}>
        <button disabled={pending} className="rounded border px-2 py-1 text-xs disabled:opacity-50" data-supplier-reinvite>{pending ? "만드는 중…" : "초대 링크 새로 만들기"}</button>
      </form>
      {state.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
      {state.link && <InviteLink link={state.link} />}
    </div>
  );
}
