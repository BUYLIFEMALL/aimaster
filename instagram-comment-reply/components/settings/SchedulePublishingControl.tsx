"use client";

import { useEffect, useState } from "react";
import { pauseScheduledPublishing, resumeScheduledPublishing } from "@/lib/actions/scheduler";
import type { MemberSchedulerState } from "@/lib/schedulerMember/memberScheduler";

// 설정 「⏱ 예약 모니터링」의 실행 상태 줄(v1.36, 2026-10-23 — youtube-auto-reply v1.12에서 가져옴, 색만 인스타 ig-* 토큰). 모니터링 시작/중지는 아래 폼, 여기서는 일시정지·재개만 한다.
// 실행 방식(Vercel 기본 / 내 cron-job.org)은 설정에서 고르고, cron-job.org 작업 켜기/끄기는 프로그램이 자동으로 한다. 지침: 루트 docs/SCHEDULER_POLICY.md
const STATE_TEXT: Record<MemberSchedulerState["state"], { label: string; tone: string; help: string }> = {
  platform: { label: "AIMaster 기본(Vercel) 실행 중", tone: "text-ig-success", help: "사이트의 Vercel 예약 호출이 5분마다 깨워, 고른 주기에 맞춰 새 댓글을 확인합니다." },
  running: { label: "내 cron-job.org 실행 중", tone: "text-ig-success", help: "내 cron-job.org가 5분마다 깨워, 고른 주기에 맞춰 새 댓글을 확인합니다." },
  idle: { label: "내 cron-job.org 대기", tone: "text-ig-muted", help: "모니터링이 꺼져 있어 쉬는 중입니다. 모니터링을 시작하면 자동으로 켜집니다." },
  paused: { label: "일시정지됨", tone: "text-ig-warn", help: "모니터링이 켜져 있어도 확인하지 않습니다. 재개하면 다음 확인부터 다시 합니다." },
  "platform-off": { label: "실행 방식 선택 필요", tone: "text-ig-danger", help: "관리자가 사이트 예약 호출을 꺼 두었습니다. 「내 cron-job.org」를 선택해 주세요." },
  "no-key": { label: "cron-job.org 키 미등록", tone: "text-ig-danger", help: "「내 cron-job.org」 방식은 본인 API 키가 필요합니다(또는 AIMaster 기본(Vercel)으로 바꾸기)." },
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
    setMessage(pause ? (("notice" in result && result.notice) || "댓글 모니터링을 일시정지했습니다.") : "댓글 모니터링을 재개했습니다.");
  }

  return <div className="mb-4 flex flex-col gap-2 rounded-xl border border-ig-border bg-ig-raised p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
    <div>
      <p className="font-semibold text-ig-text">⏰ 실행 상태: <span className={info.tone}>{info.label}</span> <span className="font-normal text-ig-muted">· 모니터링 {initial.scheduled > 0 ? "켜짐" : "꺼짐"}</span></p>
      <p className="mt-0.5 text-xs text-ig-muted">{info.help}{/* 2026-10-23: 실행 방식 바로가기는 늘 보인다 */} <a className="font-semibold underline" href="#scheduler-mode">{state === "no-key" || state === "platform-off" ? "아래 ⏰ 예약 실행 방식에서 설정 ↓" : "실행 방식 바꾸기 ↓"}</a></p>
      {message && <p className="mt-1 text-xs text-ig-muted" role="status">{message}</p>}
    </div>
    {(state === "running" || state === "idle" || state === "platform") && <button type="button" disabled={busy} onClick={() => void toggle(true)} className="shrink-0 rounded-lg border border-ig-border bg-ig-surface px-3 py-1.5 text-xs font-semibold text-ig-muted disabled:opacity-40">{busy ? "처리 중…" : "⏸ 댓글 모니터링 일시정지"}</button>}
    {state === "paused" && <button type="button" disabled={busy} onClick={() => void toggle(false)} className="shrink-0 rounded-full bg-ig-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-ig-primary-hover disabled:cursor-not-allowed disabled:opacity-50">{busy ? "처리 중…" : "▶ 댓글 모니터링 재개"}</button>}
  </div>;
}
