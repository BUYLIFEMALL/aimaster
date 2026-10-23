"use client";

import { useEffect, useState } from "react";
import { pauseScheduledPublishing, resumeScheduledPublishing } from "@/lib/actions/scheduler";
import type { MemberSchedulerState } from "@/lib/schedulerMember/memberScheduler";

// 관심 키워드 화면의 정기 작업 실행 상태 줄(v1.15, 2026-10-20 — youtube-auto-reply 사본, 색만 mx 토큰). 관심 목록·알림 켜기/끄기는 각 행에서, 여기서는 전체 일시정지·재개만 한다.
// 실행 방식(Vercel 기본 / 내 cron-job.org)은 설정에서 고르고, cron-job.org 작업 켜기/끄기는 프로그램이 자동으로 한다. 지침: 루트 docs/SCHEDULER_POLICY.md
const STATE_TEXT: Record<MemberSchedulerState["state"], { label: string; tone: string; help: string }> = {
  platform: { label: "AIMaster 기본(Vercel) 실행 중", tone: "text-mx-success", help: "사이트의 Vercel 예약 호출이 매일 09시 리포트를 만들고, 5분마다 알림 차례를 확인합니다." },
  running: { label: "내 cron-job.org 실행 중", tone: "text-mx-success", help: "내 cron-job.org가 5분마다 깨워 매일 리포트(09시 이후 1번)와 알림 차례를 확인합니다." },
  idle: { label: "내 cron-job.org 대기", tone: "text-mx-muted", help: "켜진 관심 목록·알림이 없어 쉬는 중입니다. 켜면 자동으로 켜집니다." },
  paused: { label: "일시정지됨", tone: "text-mx-accent", help: "켜진 관심 목록·알림이 있어도 리포트·알림을 보내지 않습니다. 재개하면 다음 확인부터 다시 합니다." },
  "platform-off": { label: "실행 방식 선택 필요", tone: "text-mx-danger", help: "관리자가 사이트 예약 호출을 꺼 두었습니다. 「내 cron-job.org」를 선택해 주세요." },
  "no-key": { label: "cron-job.org 키 미등록", tone: "text-mx-danger", help: "「내 cron-job.org」 방식은 본인 API 키가 필요합니다(또는 AIMaster 기본(Vercel)으로 바꾸기)." },
};

export function SchedulePublishingControl({ initial, breakdown }: { initial: MemberSchedulerState; breakdown?: { watchlists: number; alerts: number } }) {
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
    setMessage(pause ? (("notice" in result && result.notice) || "리포트·알림을 일시정지했습니다.") : "리포트·알림을 재개했습니다.");
  }

  return <div className="mb-4 flex flex-col gap-2 rounded-xl border border-mx-border bg-mx-raised p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
    <div>
      <p className="font-semibold text-mx-text">⏰ 실행 상태: <span className={info.tone}>{info.label}</span> <span className="font-normal text-mx-muted">{breakdown ? `· 관심 목록 ${breakdown.watchlists}개 · 상품 알림 ${breakdown.alerts}개` : `· 켜진 정기 작업 ${initial.scheduled}개`}</span></p>
      <p className="mt-0.5 text-xs text-mx-muted">{info.help}{(state === "no-key" || state === "platform-off") && <> <a className="font-semibold underline" href="/settings#scheduler-mode">설정 → ⏰ 예약 발행</a></>}</p>
      {message && <p className="mt-1 text-xs text-mx-muted" role="status">{message}</p>}
    </div>
    {(state === "running" || state === "idle" || state === "platform") && <button type="button" disabled={busy} onClick={() => void toggle(true)} className="shrink-0 rounded-lg border border-mx-border bg-mx-surface px-3 py-1.5 text-xs font-semibold text-mx-muted disabled:opacity-40">{busy ? "처리 중…" : "⏸ 리포트·알림 일시정지"}</button>}
    {state === "paused" && <button type="button" disabled={busy} onClick={() => void toggle(false)} className="shrink-0 rounded-lg bg-mx-primary px-3 py-1.5 text-xs font-semibold text-[#ffffff] hover:bg-mx-primary/80 disabled:cursor-not-allowed disabled:opacity-50">{busy ? "처리 중…" : "▶ 리포트·알림 재개"}</button>}
  </div>;
}
