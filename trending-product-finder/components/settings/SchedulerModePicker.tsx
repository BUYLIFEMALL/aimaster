"use client";

import { useState } from "react";
import { setScheduledPublishingMode } from "@/lib/actions/scheduler";

// 정기 자동 실행 방식 선택(v1.15, 2026-10-20 — youtube-auto-reply 사본, 색만 이 프로그램 mx 토큰). 운영 전용이라 기본값은 Vercel. 지침: 루트 docs/SCHEDULER_POLICY.md
type Mode = "vercel" | "cronjob";

export function SchedulerModePicker({ initialMode, platformAvailable, hasKey }: { initialMode: Mode; platformAvailable: boolean; hasKey: boolean }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function choose(next: Mode) {
    if (next === mode || busy) return;
    setBusy(true);
    setMessage("");
    const result = await setScheduledPublishingMode(next);
    setBusy(false);
    if (!result.ok) { setMessage(result.error); return; }
    setMode(next);
    setMessage(next === "vercel" ? "AIMaster 기본(Vercel)으로 바꿨습니다. 관심 목록·알림을 켜 두면 자동으로 돌아갑니다." : "내 cron-job.org로 바꿨습니다. 켜진 관심 목록·알림이 있으면 내 cron-job.org 작업이 자동으로 켜집니다.");
  }

  const option = (value: Mode, title: string, desc: string, disabled: boolean) => {
    const selected = mode === value;
    return <button type="button" role="radio" aria-checked={selected} disabled={disabled || busy} onClick={() => void choose(value)}
      className={`w-full rounded-xl border-2 p-3 text-left transition ${selected ? "border-mx-primary bg-mx-raised" : "border-mx-border bg-mx-surface hover:border-mx-muted"} disabled:cursor-not-allowed disabled:opacity-50`}>
      <span className="flex items-center gap-2 text-sm font-bold text-mx-text"><span className={`inline-block h-3.5 w-3.5 rounded-full border-2 ${selected ? "border-mx-primary bg-mx-raised0" : "border-mx-muted"}`} />{title}</span>
      <span className="mt-1 block text-xs text-mx-muted">{desc}</span>
    </button>;
  };

  return <div className="mb-4">
    <p className="mb-2 text-xs font-semibold text-mx-text">실행 방식 선택</p>
    <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
      {option("vercel", "AIMaster 기본 (Vercel) · 기본값", platformAvailable ? "키 없이 관심 목록·알림만 켜 두면 됩니다. 사이트의 Vercel 예약 호출이 매일 09시 리포트를 만들고 5분마다 알림 차례를 확인합니다." : "지금은 관리자가 사이트 예약 호출을 꺼 두었습니다. 「내 cron-job.org」를 선택해 주세요.", !platformAvailable && mode !== "vercel")}
      {option("cronjob", "내 cron-job.org (본인 계정)", hasKey ? "본인 무료 cron-job.org가 5분마다 깨웁니다. 관심 목록·알림을 켜면 자동으로 켜지고, 모두 끄면 자동으로 멈춥니다." : "아래에 본인 cron-job.org API 키를 먼저 저장하면 선택할 수 있습니다.", !hasKey && mode !== "cronjob")}
    </div>
    {message && <p className="mt-2 text-xs text-mx-muted" role="status">{message}</p>}
  </div>;
}
