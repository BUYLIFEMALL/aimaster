"use client";

import { SCHEDULER_STATE_TEXT, useInstaSchedulerStatus, type SchedulerStateKey } from "@/lib/instagram/postsClient";

// 인스타 예약 게시 「실행 상태」 줄(v1.24, 2026-10-20 — 기준: threads SchedulePublishingControl, 다크 테마). 예약은 카드뉴스마다 하고, 여기서는 전체 일시정지·재개만 한다.
// 실행 방식(Vercel 기본 / 내 cron-job.org)은 설정에서 고르고, cron-job.org 작업 켜기/끄기는 프로그램이 자동으로 한다. 지침: 루트 docs/SCHEDULER_POLICY.md

// 상태별 글자색(이 프로그램 화면 색). 이름·설명은 공용 SCHEDULER_STATE_TEXT
const STATE_TONE: Record<SchedulerStateKey, string> = {
  platform: "text-emerald-300",
  running: "text-emerald-300",
  idle: "text-slate-300",
  paused: "text-amber-300",
  "platform-off": "text-rose-300",
  "no-key": "text-rose-300",
};

/** refreshKey가 바뀌면(예약·취소 뒤) 다시 불러온다 */
export function SchedulePublishingControl({ refreshKey = 0 }: { refreshKey?: number }) {
  const { info, busy, message, toggle } = useInstaSchedulerStatus("/api/cardnews/scheduler", refreshKey);
  if (!info) return null;
  const text = { ...SCHEDULER_STATE_TEXT[info.state], tone: STATE_TONE[info.state] };

  return <div className="flex flex-col gap-2 rounded-xl border border-[#262c3d] bg-[#0d0f17] p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
    <div>
      <p className="font-semibold text-slate-100">⏰ 예약 발행: <span className={text.tone}>{text.label}</span> <span className="font-normal text-slate-400">· 예약 대기 {info.scheduled}건</span></p>
      <p className="mt-0.5 text-xs text-slate-400">{text.help}{(info.state === "no-key" || info.state === "platform-off") && <> <a className="font-semibold text-rose-300 underline" href="/settings">설정 → ⏰ 예약 발행</a></>}</p>
      {message && <p className="mt-1 text-xs text-slate-300" role="status">{message}</p>}
    </div>
    {(info.state === "running" || info.state === "idle" || info.state === "platform") && <button type="button" disabled={busy} onClick={() => void toggle(true)} className="shrink-0 rounded-lg border border-[#262c3d] bg-[#161922] px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-[#1f2433] disabled:opacity-40">{busy ? "처리 중…" : "⏸ 예약 발행 일시정지"}</button>}
    {info.state === "paused" && <button type="button" disabled={busy} onClick={() => void toggle(false)} className="shrink-0 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-[#ffffff] hover:bg-rose-600 disabled:opacity-40">{busy ? "처리 중…" : "▶ 예약 발행 재개"}</button>}
  </div>;
}
