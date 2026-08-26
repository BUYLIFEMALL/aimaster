"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startMonitoringAction, stopMonitoringAction } from "@/lib/actions/monitoring";
import { MONITORING_INTERVAL_OPTIONS } from "@/lib/schedule";
import { formatDateTimeKo } from "@/lib/formatDate";

function toDatetimeLocalValue(iso: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MonitoringSettingsForm({
  enabled,
  intervalMinutes,
  startedAt,
  lastRunAt,
}: {
  enabled: boolean;
  intervalMinutes: number;
  startedAt: string | null;
  lastRunAt: string | null;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const result = await startMonitoringAction(new FormData(e.currentTarget));
      if (result.error) setError(result.error);
      else router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  async function handleStop() {
    setIsPending(true);
    try {
      await stopMonitoringAction();
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  if (enabled) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-green-600">
          ✅ 예약 모니터링 실행 중 — {MONITORING_INTERVAL_OPTIONS.find((o) => o.value === intervalMinutes)?.label ?? `${intervalMinutes}분`}마다 자동 확인
        </p>
        <dl className="space-y-1 rounded-lg bg-gray-50 px-3 py-2 text-xs">
          {startedAt && (
            <div className="flex flex-wrap items-baseline gap-x-1.5">
              <dt className="shrink-0 text-gray-400">이 시점 이후 댓글만 처리</dt>
              <dd className="font-semibold text-gray-700">{formatDateTimeKo(startedAt)}</dd>
            </div>
          )}
          {lastRunAt && (
            <div className="flex flex-wrap items-baseline gap-x-1.5">
              <dt className="shrink-0 text-gray-400">마지막 확인</dt>
              <dd className="font-semibold text-gray-700">{formatDateTimeKo(lastRunAt)}</dd>
            </div>
          )}
        </dl>
        <p className="text-xs text-gray-400">
          자동으로는 답글 초안까지만 만들고, 실제 게시는 "댓글 검토/게시" 화면에서 직접 눌러야 합니다.
        </p>
        <button
          type="button"
          onClick={handleStop}
          disabled={isPending}
          className="rounded-lg bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-60"
        >
          {isPending ? "중지 중..." : "⏸ 모니터링 중지"}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleStart} className="space-y-3">
      <p className="text-sm text-gray-500">
        모니터링을 켜두면 설정한 주기마다 자동으로 새 댓글을 확인해 답글 초안을 만들어둡니다
        (게시는 항상 사람이 직접 승인).
      </p>
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">확인 주기</label>
        <select name="intervalMinutes" defaultValue={intervalMinutes} className="input-sm w-40">
          {MONITORING_INTERVAL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">이 시점 이후 댓글만 처리</label>
        <input
          name="startFrom"
          type="datetime-local"
          defaultValue={toDatetimeLocalValue(startedAt)}
          className="input-sm w-56"
        />
        <p className="mt-1 text-xs text-gray-400">비워두면 지금 시각부터 적용됩니다.</p>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-60"
      >
        {isPending ? "시작 중..." : "▶ 모니터링 시작"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
