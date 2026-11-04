"use client";

import { useActionState, useState, useTransition } from "react";
import { noResetSubmit } from "@/lib/no-reset-submit";
import { pauseDepositAction, saveDepositAction, type DepositState } from "./deposit-actions";

export type DepositStatus = {
  hours: number | null;
  hasKey: boolean;
  linked: boolean;
  paused: boolean;
  lastRunAt: string | null;
  lastCancelled: number;
  totalCancelled: number;
};

export default function DepositForm({ slug, status }: { slug: string; status: DepositStatus }) {
  const initial: DepositState = { error: null, message: null, hours: status.hours === null ? "" : String(status.hours) };
  const [state, formAction, pending] = useActionState(saveDepositAction.bind(null, slug), initial);
  const [pauseError, setPauseError] = useState<string | null>(null);
  const [pausing, startPause] = useTransition();

  const running = status.linked && status.hours !== null;
  const label = !running ? "꺼짐" : status.paused ? "일시정지" : "켜짐";

  function togglePause() {
    setPauseError(null);
    startPause(async () => {
      const r = await pauseDepositAction(slug, !status.paused);
      setPauseError(r.error);
    });
  }

  return (
    <fieldset className="rounded-lg border p-4" data-deposit-auto-cancel>
      <legend className="px-1 text-sm font-semibold">입금 기한 자동 취소</legend>
      <p className="text-sm text-gray-600">
        무통장 주문이 정한 시간 안에 입금되지 않으면 자동으로 취소하고 재고를 되돌립니다. 확인은 운영자님 본인 cron-job.org 무료 계정이 10분마다 합니다.
      </p>
      <p className="mt-2 text-sm" data-deposit-status>
        상태 <b>{label}</b>
        {running && status.lastRunAt && ` · 마지막 확인 ${new Date(status.lastRunAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} (이번 ${status.lastCancelled}건)`}
        {running && ` · 지금까지 자동 취소 ${status.totalCancelled}건`}
      </p>

      <form onSubmit={noResetSubmit(formAction)} className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm">입금 기한(시간) — 비우면 끔</span>
          <input name="hours" defaultValue={state.hours} inputMode="numeric" maxLength={3} placeholder="예: 24" className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm">cron-job.org API 키 {status.hasKey && <span className="text-green-700">(등록됨 — 바꿀 때만 입력)</span>}</span>
          <input name="api_key" type="password" autoComplete="off" maxLength={200} placeholder={status.hasKey ? "••••••••" : "cron-job.org 콘솔 Settings → API"} className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        {status.hasKey && (
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="remove_key" /> 등록한 키 지우기(자동 취소도 멈춥니다)
          </label>
        )}
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
          <button disabled={pending} className="min-h-11 rounded bg-gray-900 px-5 py-2 text-white disabled:opacity-50">
            {pending ? "저장 중…" : "자동 취소 저장"}
          </button>
          {running && (
            <button type="button" onClick={togglePause} disabled={pausing} className="min-h-11 rounded border px-5 py-2 disabled:opacity-50">
              {pausing ? "바꾸는 중…" : status.paused ? "다시 켜기" : "일시정지"}
            </button>
          )}
        </div>
      </form>
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      {pauseError && <p className="mt-2 text-sm text-red-600">{pauseError}</p>}
      {state.message && <p className="mt-2 text-sm text-green-700">{state.message}</p>}
      <p className="mt-3 text-xs text-gray-500">
        키는 cron-job.org(무료)에 가입한 뒤 Settings → API에서 만들 수 있습니다. 키에 IP 제한을 걸면 동작하지 않습니다. 이미 들어와 있던 주문에는 기한이 붙지 않고, 켠 뒤에 들어온 주문부터 적용됩니다. 일시정지 중에 들어온 주문도 기한이 붙지 않습니다.
      </p>
    </fieldset>
  );
}
