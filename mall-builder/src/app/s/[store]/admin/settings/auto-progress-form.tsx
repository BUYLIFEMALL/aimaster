"use client";

import { useActionState } from "react";
import { noResetSubmit } from "@/lib/no-reset-submit";
import { saveAutoProgressAction, type AutoProgressState } from "./auto-progress-actions";

export type AutoProgressStatus = {
  deliverDays: number | null;
  confirmDays: number | null;
  hasCronKey: boolean;
  linked: boolean;
  paused: boolean;
  lastRunAt: string | null;
  lastProgressed: number;
  totalProgressed: number;
};

// 자동 배송 완료·구매 확정(D12) — 몰 자동 작업(입금 기한 자동 취소와 같은 cron-job.org 작업)이 함께 처리한다
export default function AutoProgressForm({ slug, status }: { slug: string; status: AutoProgressStatus }) {
  const initial: AutoProgressState = {
    error: null,
    message: null,
    deliver: status.deliverDays === null ? "" : String(status.deliverDays),
    confirm: status.confirmDays === null ? "" : String(status.confirmDays),
  };
  const [state, formAction, pending] = useActionState(saveAutoProgressAction.bind(null, slug), initial);
  const on = status.deliverDays !== null || status.confirmDays !== null;
  const running = on && status.linked && status.hasCronKey;
  const label = !on ? "꺼짐" : !running ? "cron-job.org 키 필요" : status.paused ? "일시정지" : "켜짐";

  return (
    <fieldset className="rounded-lg border p-4" data-auto-progress>
      <legend className="px-1 text-sm font-semibold">자동 배송 완료·구매 확정</legend>
      <p className="text-sm text-gray-600">
        발송한 뒤 정한 날이 지나면 자동으로 「배송 완료」로, 배송 완료 뒤 정한 날이 지나면 자동으로 「구매 확정」으로 바꿉니다. 반품·취소 요청 중인 주문은 건드리지 않습니다. 확인은 위 입금 기한 자동 취소와 같은 cron-job.org 작업이 합니다.
      </p>
      <p className="mt-2 text-sm" data-auto-progress-status>
        상태 <b>{label}</b>
        {running && status.lastRunAt && ` · 마지막 확인 ${new Date(status.lastRunAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} (이번 ${status.lastProgressed}건)`}
        {running && ` · 지금까지 자동 처리 ${status.totalProgressed}건`}
      </p>
      <form onSubmit={noResetSubmit(formAction)} className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm">발송 뒤 자동 배송 완료(일) — 비우면 끔</span>
          <input name="deliver_days" defaultValue={state.deliver} inputMode="numeric" maxLength={2} placeholder="예: 7" className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm">배송 완료 뒤 자동 구매 확정(일) — 비우면 끔</span>
          <input name="confirm_days" defaultValue={state.confirm} inputMode="numeric" maxLength={2} placeholder="예: 7" className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <div className="sm:col-span-2">
          <button disabled={pending} className="min-h-11 rounded bg-gray-900 px-5 py-2 text-white disabled:opacity-50">
            {pending ? "저장 중…" : "자동 진행 저장"}
          </button>
        </div>
      </form>
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      {state.message && <p className="mt-2 text-sm text-green-700">{state.message}</p>}
      <p className="mt-3 text-xs text-gray-500">
        일시정지는 위 「입금 기한 자동 취소」 칸의 버튼으로 함께 멈춥니다. 일수는 그 상태로 바뀐 시각부터 셉니다(반품을 거절해 배송 완료로 돌아오면 그때부터 다시 셉니다).
      </p>
    </fieldset>
  );
}
