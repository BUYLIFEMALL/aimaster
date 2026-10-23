"use client";

import { SCHEDULER_STATE_TEXT, useInstaSchedulerStatus, type SchedulerStateKey } from "@/lib/instagram/postsClient";

// 인스타 예약 게시 「실행 상태」 줄(v1.15 — 기준: cardnews-studio SchedulePublishingControl v1.24, 이 프로그램 색으로 맞춤).
// 예약은 게시 패널에서 하고, 여기서는 전체 일시정지·재개만 한다. 실행 방식(Vercel 기본 / 내 cron-job.org)은 「🔑 API키등록·플랫폼연동」 창에서 고른다. 지침: 루트 docs/SCHEDULER_POLICY.md

// 상태별 글자색(이 프로그램 화면 색). 이름·설명은 공용 SCHEDULER_STATE_TEXT
const STATE_TONE: Record<SchedulerStateKey, string> = {
  platform: "text-emerald-400",
  running: "text-emerald-400",
  idle: "text-if-text",
  paused: "text-amber-400",
  "platform-off": "text-rose-400",
  "no-key": "text-rose-400",
};

/** refreshKey가 바뀌면(예약·취소 뒤) 다시 불러온다 */
export function SchedulePublishingControl({ refreshKey = 0, onOpenSettings }: { refreshKey?: number; onOpenSettings?: () => void }) {
  const { info, busy, message, toggle } = useInstaSchedulerStatus("/api/instagram/scheduler", refreshKey);
  if (!info) return null;
  const text = { ...SCHEDULER_STATE_TEXT[info.state], tone: STATE_TONE[info.state] };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-if-border bg-if-surface p-2.5 text-[11px] sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-if-text">⏰ 예약 발행: <span className={text.tone}>{text.label}</span> <span className="font-normal text-if-muted">· 예약 대기 {info.scheduled}건</span></p>
        <p className="mt-0.5 text-if-muted">
          {text.help}{" "}
          {onOpenSettings && <button type="button" onClick={onOpenSettings} className="font-semibold text-pink-400 underline">실행 방식 바꾸기</button>}
        </p>
        {message && <p className="mt-1 text-if-text" role="status">{message}</p>}
      </div>
      {(info.state === "running" || info.state === "idle" || info.state === "platform") && (
        <button type="button" disabled={busy} onClick={() => void toggle(true)} className="shrink-0 rounded-lg border border-if-border bg-if-raised px-2.5 py-1 font-semibold text-if-text disabled:opacity-40">{busy ? "처리 중…" : "⏸ 일시정지"}</button>
      )}
      {info.state === "paused" && (
        <button type="button" disabled={busy} onClick={() => void toggle(false)} className="shrink-0 rounded-lg bg-pink-500 px-2.5 py-1 font-semibold text-white disabled:opacity-40">{busy ? "처리 중…" : "▶ 재개"}</button>
      )}
    </div>
  );
}
