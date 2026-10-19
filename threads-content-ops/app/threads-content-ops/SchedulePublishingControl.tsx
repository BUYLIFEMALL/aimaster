"use client";

import { useState } from "react";
import { pauseScheduledPublishing, resumeScheduledPublishing } from "./web-actions";
import type { MemberSchedulerState } from "@/threads-content-ops/lib/memberScheduler";

// 콘텐츠 보관함 위 「예약 발행 상태」 줄(v2.07, 2026-10-19). 예약은 글마다 하고, 여기서는 전체 일시정지·재개만 한다.
// 실행 작업 켜기/끄기는 프로그램이 자동으로 한다(예약하면 켜짐, 남은 예약이 없으면 꺼짐). 지침: 루트 docs/SCHEDULER_POLICY.md
const STATE_TEXT: Record<MemberSchedulerState["state"], { label: string; tone: string; help: string }> = {
  running: { label: "실행 중", tone: "text-emerald-700", help: "예약 시각이 되면 내 cron-job.org가 자동으로 발행합니다." },
  idle: { label: "대기", tone: "text-neutral-700", help: "남은 예약이 없어 쉬는 중입니다. 글을 예약하면 자동으로 켜집니다." },
  paused: { label: "일시정지됨", tone: "text-amber-700", help: "예약한 글이 있어도 발행하지 않습니다. 재개하면 다시 발행합니다(24시간 넘게 지난 예약은 올리지 않음)." },
  platform: { label: "AIMaster 제공 실행", tone: "text-sky-700", help: "관리자 지정으로 AIMaster가 예약 발행을 대신 실행합니다." },
  "no-key": { label: "키 미등록", tone: "text-rose-700", help: "예약 발행에는 본인 cron-job.org API 키가 필요합니다." },
};

export default function SchedulePublishingControl({ initial }: { initial: MemberSchedulerState }) {
  const [state, setState] = useState(initial.state);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const info = STATE_TEXT[state];

  async function toggle(pause: boolean) {
    setBusy(true);
    setMessage("");
    const result = pause ? await pauseScheduledPublishing() : await resumeScheduledPublishing();
    setBusy(false);
    if (!result.ok) { setMessage(result.error); return; }
    if (pause) setState("paused");
    else setState("started" in result && result.started ? "running" : "idle");
    setMessage(pause ? "예약 발행을 일시정지했습니다." : "예약 발행을 재개했습니다.");
  }

  return <div className="mb-4 flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
    <div>
      <p className="font-semibold text-neutral-900">⏰ 예약 발행: <span className={info.tone}>{info.label}</span> <span className="font-normal text-neutral-500">· 예약 대기 {initial.scheduled}건</span></p>
      <p className="mt-0.5 text-xs text-neutral-500">{info.help}{state === "no-key" && <> <a className="font-semibold underline" href="/threads-content-ops?tab=settings">API키등록·플랫폼연동에서 등록하기</a></>}</p>
      {message && <p className="mt-1 text-xs text-neutral-700" role="status">{message}</p>}
    </div>
    {(state === "running" || state === "idle") && <button type="button" disabled={busy} onClick={() => void toggle(true)} className="shrink-0 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 disabled:opacity-40">{busy ? "처리 중…" : "⏸ 예약 발행 일시정지"}</button>}
    {state === "paused" && <button type="button" disabled={busy} onClick={() => void toggle(false)} className="shrink-0 rounded-lg bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-[#ffffff] hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-700">{busy ? "처리 중…" : "▶ 예약 발행 재개"}</button>}
  </div>;
}
