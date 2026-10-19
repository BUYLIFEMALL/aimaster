"use client";

import { useState } from "react";
import { pauseScheduledPublishing, resumeScheduledPublishing } from "@/lib/actions/scheduler";
import type { MemberSchedulerState } from "@/lib/posts/memberScheduler";

// 게시글 목록 위 「예약 발행 상태」 줄(v1.63, 2026-10-19 — 기준: threads-content-ops SchedulePublishingControl). 예약은 글마다 하고, 여기서는 전체 일시정지·재개만 한다.
// 실행 방식(Vercel 기본 / 내 cron-job.org)은 설정에서 고르고, cron-job.org 작업 켜기/끄기는 프로그램이 자동으로 한다(v2.08). 지침: 루트 docs/SCHEDULER_POLICY.md
const STATE_TEXT: Record<MemberSchedulerState["state"], { label: string; tone: string; help: string }> = {
  platform: { label: "AIMaster 기본(Vercel) 실행 중", tone: "text-emerald-700", help: "예약 시각이 되면 사이트의 Vercel 예약 호출이 자동으로 발행합니다." },
  running: { label: "내 cron-job.org 실행 중", tone: "text-emerald-700", help: "예약 시각이 되면 내 cron-job.org가 자동으로 발행합니다." },
  idle: { label: "내 cron-job.org 대기", tone: "text-neutral-700", help: "남은 예약이 없어 쉬는 중입니다. 글을 예약하면 자동으로 켜집니다." },
  paused: { label: "일시정지됨", tone: "text-amber-700", help: "예약한 글이 있어도 발행하지 않습니다. 재개하면 다시 발행합니다(24시간 넘게 지난 예약은 올리지 않음)." },
  "platform-off": { label: "실행 방식 선택 필요", tone: "text-rose-700", help: "이 사이트는 Vercel 예약 호출이 꺼져 있습니다. 「내 cron-job.org」를 선택해 주세요." },
  "no-key": { label: "cron-job.org 키 미등록", tone: "text-rose-700", help: "「내 cron-job.org」 방식은 본인 API 키가 필요합니다(또는 AIMaster 기본(Vercel)으로 바꾸기)." },
};

export function SchedulePublishingControl({ initial }: { initial: MemberSchedulerState }) {
  const [state, setState] = useState(initial.state);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const base = STATE_TEXT[state];
  // 설치 키트(기본 cron-job.org)에서는 「AIMaster」 대신 「Vercel 예약 호출」로 표시
  const info = initial.defaultMode === "cronjob" ? { ...base, label: base.label.replace("AIMaster 기본(Vercel)", "Vercel 예약 호출"), help: base.help.replace(" 또는 AIMaster 기본(Vercel)으로 바꾸기", " 또는 Vercel 예약 호출(Pro)로 바꾸기") } : base;

  async function toggle(pause: boolean) {
    setBusy(true);
    setMessage("");
    const result = pause ? await pauseScheduledPublishing() : await resumeScheduledPublishing();
    setBusy(false);
    if (!result.ok) { setMessage(result.error); return; }
    if (pause) setState("paused");
    else setState(initial.mode === "vercel" ? (initial.platformAvailable ? "platform" : "platform-off") : ("started" in result && result.started ? "running" : "idle"));
    setMessage(pause ? "예약 발행을 일시정지했습니다." : "예약 발행을 재개했습니다.");
  }

  return <div className="mb-4 flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
    <div>
      <p className="font-semibold text-neutral-900">⏰ 예약 발행: <span className={info.tone}>{info.label}</span> <span className="font-normal text-neutral-500">· 예약 대기 {initial.scheduled}건</span></p>
      <p className="mt-0.5 text-xs text-neutral-500">{info.help}{(state === "no-key" || state === "platform-off") && <> <a className="font-semibold underline" href="/settings">설정 → ⏰ 예약 발행</a></>}</p>
      {message && <p className="mt-1 text-xs text-neutral-700" role="status">{message}</p>}
    </div>
    {(state === "running" || state === "idle" || state === "platform") && <button type="button" disabled={busy} onClick={() => void toggle(true)} className="shrink-0 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 disabled:opacity-40">{busy ? "처리 중…" : "⏸ 예약 발행 일시정지"}</button>}
    {state === "paused" && <button type="button" disabled={busy} onClick={() => void toggle(false)} className="shrink-0 rounded-lg bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-[#ffffff] hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-700">{busy ? "처리 중…" : "▶ 예약 발행 재개"}</button>}
  </div>;
}
