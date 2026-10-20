"use client";

import { useEffect, useState } from "react";

// 인스타 예약 게시 실행 방식 선택(v1.24, 2026-10-20 — 기준: threads SchedulerModePicker, 다크 테마). 운영 전용이라 기본값은 Vercel. 지침: 루트 docs/SCHEDULER_POLICY.md
type Mode = "vercel" | "cronjob";
type State = { mode: Mode; platformAvailable: boolean };

export function SchedulerModePicker({ hasKey }: { hasKey: boolean }) {
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/cardnews/scheduler", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setState({ mode: d.mode, platformAvailable: d.platformAvailable }))
      .catch(() => setMessage("실행 방식을 불러오지 못했습니다."));
  }, []);

  async function choose(next: Mode) {
    if (!state || next === state.mode || busy) return;
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/cardnews/scheduler", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "mode", mode: next }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMessage(data.error || "실행 방식을 바꾸지 못했습니다."); return; }
    setState({ ...state, mode: next });
    setMessage(next === "vercel" ? "AIMaster 기본(Vercel)으로 바꿨습니다. 예약만 하면 자동으로 게시됩니다." : "내 cron-job.org로 바꿨습니다. 예약하면 내 cron-job.org에 작업이 자동으로 켜집니다.");
  }

  const option = (value: Mode, title: string, desc: string, disabled: boolean) => {
    const selected = state?.mode === value;
    return <button type="button" role="radio" aria-checked={selected} disabled={!state || disabled || busy} onClick={() => void choose(value)}
      className={`w-full rounded-xl border-2 p-3 text-left transition ${selected ? "border-rose-500 bg-rose-500/10" : "border-[#262c3d] bg-[#0d0f17] hover:border-slate-500"} disabled:cursor-not-allowed disabled:opacity-50`}>
      <span className="flex items-center gap-2 text-sm font-bold text-slate-100"><span className={`inline-block h-3.5 w-3.5 rounded-full border-2 ${selected ? "border-rose-500 bg-rose-500" : "border-slate-500"}`} />{title}</span>
      <span className="mt-1 block text-xs text-slate-400">{desc}</span>
    </button>;
  };

  return <div>
    <p className="mb-2 text-xs font-semibold text-slate-300">실행 방식 선택</p>
    <div role="radiogroup" aria-label="실행 방식 선택" className="grid gap-2 sm:grid-cols-2">
      {option("vercel", "AIMaster 기본 (Vercel) · 기본값", state?.platformAvailable === false ? "지금은 관리자가 사이트 예약 호출을 꺼 두었습니다. 「내 cron-job.org」를 선택해 주세요." : "키 없이 예약만 하면 됩니다. 사이트의 Vercel 예약 호출이 5분마다 확인해 게시합니다.", state?.platformAvailable === false && state.mode !== "vercel")}
      {option("cronjob", "내 cron-job.org (본인 계정)", hasKey ? "본인 무료 cron-job.org가 1분마다 확인합니다. 예약하면 자동으로 켜지고, 예약이 없으면 자동으로 멈춥니다." : "아래에 본인 cron-job.org API 키를 먼저 저장하면 선택할 수 있습니다.", !hasKey && state?.mode !== "cronjob")}
    </div>
    {message && <p className="mt-2 text-xs text-slate-300" role="status">{message}</p>}
  </div>;
}
