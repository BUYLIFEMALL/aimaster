"use client";

import { useState } from "react";
import { setScheduledPublishingMode } from "@/lib/actions/scheduler";

// 예약 발행 실행 방식 선택(v1.25, 2026-10-19 주인님 지시 — 기준: threads-affiliate-poster SchedulerModePicker, 이 프로그램의 다크 테마 색으로).
// 두 방식 모두 선택 가능. 기본값: 운영 Vercel, 설치 키트(배포판) cron-job.org. 지침: 루트 docs/SCHEDULER_POLICY.md
type Mode = "vercel" | "cronjob";

export function SchedulerModePicker({ initialMode, defaultMode, platformAvailable, hasKey }: { initialMode: Mode; defaultMode: Mode; platformAvailable: boolean; hasKey: boolean }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const vercelName = defaultMode === "cronjob" ? "Vercel 예약 호출" : "AIMaster 기본 (Vercel)";

  async function choose(next: Mode) {
    if (next === mode || busy) return;
    setBusy(true);
    setMessage("");
    const result = await setScheduledPublishingMode(next);
    setBusy(false);
    if (!result.ok) { setMessage(result.error); return; }
    setMode(next);
    setMessage(next === "vercel" ? `${vercelName}로 바꿨습니다. 예약만 하면 자동으로 발행됩니다.` : "내 cron-job.org로 바꿨습니다. 예약하면 내 cron-job.org에 작업이 자동으로 켜집니다.");
  }

  const option = (value: Mode, title: string, desc: string, disabled: boolean) => {
    const selected = mode === value;
    return <button type="button" role="radio" aria-checked={selected} disabled={disabled || busy} onClick={() => void choose(value)}
      className={`w-full rounded-xl border-2 p-3 text-left transition ${selected ? "border-pink-500 bg-pink-500/10" : "border-[#262c3d] bg-[#0d0f17] hover:border-slate-500"} disabled:cursor-not-allowed disabled:opacity-50`}>
      <span className="flex items-center gap-2 text-sm font-bold text-slate-100"><span className={`inline-block h-3.5 w-3.5 rounded-full border-2 ${selected ? "border-pink-500 bg-pink-500" : "border-slate-500"}`} />{title}</span>
      <span className="mt-1 block text-xs text-slate-400">{desc}</span>
    </button>;
  };

  return <div className="mb-4">
    <p className="mb-2 text-xs font-semibold text-slate-200">실행 방식 선택</p>
    <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
      {option("vercel", `${vercelName}${defaultMode === "vercel" ? " · 기본값" : ""}`, platformAvailable ? "키 없이 예약만 하면 됩니다. 사이트의 Vercel 예약 호출이 주기적으로 확인해 발행합니다(예약 시각 후 5분 안)." : "Vercel 무료(Hobby)는 자동 실행이 하루 1번뿐이라 쓸 수 없습니다. Vercel 유료(Pro)라면 설치 키트의 KIT/enable-vercel-cron 을 실행한 뒤 선택하세요.", !platformAvailable && mode !== "vercel")}
      {option("cronjob", `내 cron-job.org (본인 계정)${defaultMode === "cronjob" ? " · 기본값" : ""}`, hasKey ? "본인 무료 cron-job.org가 1분마다 확인합니다. 예약하면 자동으로 켜지고, 예약이 없으면 자동으로 멈춥니다." : "아래에 본인 cron-job.org API 키를 먼저 저장하면 선택할 수 있습니다.", !hasKey && mode !== "cronjob")}
    </div>
    {message && <p className="mt-2 text-xs text-slate-300" role="status">{message}</p>}
  </div>;
}
