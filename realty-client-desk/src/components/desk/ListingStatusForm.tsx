"use client";

// 2026-11-20: 매물 상태 바꾸기 — 결과(성공·실패)를 그 줄 옆에 보여 준다. 예전에는 실패해도 문구가 없었다(C-1 E12).
// 응답이 분명하지 않으면(연결 끊김) 자동으로 다시 보내지 않고 새로고침을 안내한다.
import { useActionState } from "react";
import { updateListingStatusAction, type ListingState } from "@/lib/actions/listings";
import { LISTING_STATUSES } from "@/lib/desk/adRules";

export function ListingStatusForm({ id, status }: { id: string; status: string }) {
  const [state, action, pending] = useActionState<ListingState, FormData>(async (prev, fd) => {
    try {
      return await updateListingStatusAction(prev, fd);
    } catch {
      return { error: "바뀌었는지 확인하지 못했어요. 새로고침해서 상태를 확인해 주세요." };
    }
  }, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-1">
      <input type="hidden" name="id" value={id} />
      <select name="status" defaultValue={status} aria-label="상태" className="mx-input min-h-[40px] w-auto py-1">
        {LISTING_STATUSES.map((s) => <option key={s}>{s}</option>)}
      </select>
      <button type="submit" disabled={pending} className="mx-btn-ghost min-h-[40px] px-3 text-xs disabled:opacity-60">{pending ? "저장 중…" : "상태 저장"}</button>
      {state.error && <span role="alert" className="text-xs text-mx-danger">{state.error}</span>}
      {state.success && <span role="status" className="text-xs text-mx-success">{state.success}</span>}
    </form>
  );
}
