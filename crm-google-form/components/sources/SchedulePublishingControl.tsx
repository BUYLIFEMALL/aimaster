"use client";

import { useEffect, useState } from "react";
import { pauseScheduledPublishing, resumeScheduledPublishing } from "@/lib/actions/scheduler";
import type { MemberSchedulerState } from "@/lib/schedulerMember/memberScheduler";

// 구글폼 연결 화면의 「팔로우업 발송 상태」 줄(v1.10, 2026-10-20 — booking-reminder 사본). 규칙 켜기/끄기는 규칙마다 하고, 여기서는 전체 일시정지·재개만 한다.
// 실행 방식(Vercel 기본 / 내 cron-job.org)은 설정에서 고르고, cron-job.org 작업 켜기/끄기는 프로그램이 자동으로 한다. 지침: 루트 docs/SCHEDULER_POLICY.md
const STATE_TEXT: Record<MemberSchedulerState["state"], { label: string; tone: string; help: string }> = {
  platform: { label: "AIMaster 기본(Vercel) 실행 중", tone: "text-emerald-700", help: "보낼 팔로우업을 사이트의 Vercel 예약 호출이 매일 09시에 확인해 보냅니다." },
  running: { label: "내 cron-job.org 실행 중", tone: "text-emerald-700", help: "보낼 팔로우업을 내 cron-job.org가 매일 09시에 확인해 보냅니다." },
  idle: { label: "내 cron-job.org 대기", tone: "text-neutral-700", help: "켜진 규칙이 없어 쉬는 중입니다. 규칙을 켜면 자동으로 켜집니다." },
  paused: { label: "일시정지됨", tone: "text-amber-700", help: "켜진 규칙이 있어도 보내지 않습니다. 재개하면 다음 확인(매일 09시)부터 다시 보냅니다." },
  "platform-off": { label: "실행 방식 선택 필요", tone: "text-rose-700", help: "관리자가 사이트 예약 호출을 꺼 두었습니다. 「내 cron-job.org」를 선택해 주세요." },
  "no-key": { label: "cron-job.org 키 미등록", tone: "text-rose-700", help: "「내 cron-job.org」 방식은 본인 API 키가 필요합니다(또는 AIMaster 기본(Vercel)으로 바꾸기)." },
};

export function SchedulePublishingControl({ initial }: { initial: MemberSchedulerState }) {
  const [state, setState] = useState(initial.state);
  // 2026-10-20: 규칙·예약을 켜고 끄면 화면이 서버 값을 다시 받는다 — 실행 상태도 따라 바꾼다(예전엔 새로고침 전까지 「대기」로 남음).
  useEffect(() => { setState(initial.state); }, [initial.state]);
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
    else setState(initial.mode === "vercel" ? (initial.platformAvailable ? "platform" : "platform-off") : ("started" in result && result.started ? "running" : "idle"));
    setMessage(pause ? (("notice" in result && result.notice) || "팔로우업 발송을 일시정지했습니다.") : "팔로우업 발송을 재개했습니다.");
  }

  return <div className="mb-4 flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
    <div>
      <p className="font-semibold text-neutral-900">⏰ 팔로우업 발송: <span className={info.tone}>{info.label}</span> <span className="font-normal text-neutral-500">· 켜진 규칙 {initial.scheduled}개</span></p>
      <p className="mt-0.5 text-xs text-neutral-500">{info.help}{(state === "no-key" || state === "platform-off") && <> <a className="font-semibold underline" href="/settings">설정 → ⏰ 예약 발행</a></>}</p>
      {message && <p className="mt-1 text-xs text-neutral-700" role="status">{message}</p>}
    </div>
    {(state === "running" || state === "idle" || state === "platform") && <button type="button" disabled={busy} onClick={() => void toggle(true)} className="shrink-0 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 disabled:opacity-40">{busy ? "처리 중…" : "⏸ 팔로우업 발송 일시정지"}</button>}
    {state === "paused" && <button type="button" disabled={busy} onClick={() => void toggle(false)} className="shrink-0 rounded-lg bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-[#ffffff] hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-700">{busy ? "처리 중…" : "▶ 팔로우업 발송 재개"}</button>}
  </div>;
}
