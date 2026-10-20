"use client";

import { useEffect, useState } from "react";

// 인스타 예약 게시 「실행 상태」 줄(v1.15 — 기준: cardnews-studio SchedulePublishingControl v1.24, 이 프로그램 색으로 맞춤).
// 예약은 게시 패널에서 하고, 여기서는 전체 일시정지·재개만 한다. 실행 방식(Vercel 기본 / 내 cron-job.org)은 「🔑 API키등록·플랫폼연동」 창에서 고른다. 지침: 루트 docs/SCHEDULER_POLICY.md
type StateKey = "platform" | "platform-off" | "no-key" | "paused" | "running" | "idle";
type Info = { mode: "vercel" | "cronjob"; platformAvailable: boolean; state: StateKey; scheduled: number };

const STATE_TEXT: Record<StateKey, { label: string; tone: string; help: string }> = {
  platform: { label: "AIMaster 기본(Vercel) 실행 중", tone: "text-emerald-400", help: "예약 시각이 되면 사이트의 Vercel 예약 호출이 5분 안에 자동으로 게시합니다." },
  running: { label: "내 cron-job.org 실행 중", tone: "text-emerald-400", help: "예약 시각이 되면 내 cron-job.org가 1분 안에 자동으로 게시합니다." },
  idle: { label: "내 cron-job.org 대기", tone: "text-if-text", help: "남은 예약이 없어 쉬는 중입니다. 예약하면 자동으로 켜집니다." },
  paused: { label: "일시정지됨", tone: "text-amber-400", help: "예약이 있어도 게시하지 않습니다. 재개하면 다시 게시합니다(24시간 넘게 지난 예약은 올리지 않음)." },
  "platform-off": { label: "실행 방식 선택 필요", tone: "text-rose-400", help: "관리자가 사이트 예약 호출을 꺼 두었습니다. 「내 cron-job.org」를 선택해 주세요." },
  "no-key": { label: "cron-job.org 키 미등록", tone: "text-rose-400", help: "「내 cron-job.org」 방식은 본인 API 키가 필요합니다(또는 AIMaster 기본(Vercel)으로 바꾸기)." },
};

/** refreshKey가 바뀌면(예약·취소 뒤) 다시 불러온다 */
export function SchedulePublishingControl({ refreshKey = 0, onOpenSettings }: { refreshKey?: number; onOpenSettings?: () => void }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/instagram/scheduler", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && d && setInfo(d))
      .catch(() => undefined);
    return () => { alive = false; };
  }, [refreshKey]);

  if (!info) return null;
  const text = STATE_TEXT[info.state];

  async function toggle(pause: boolean) {
    if (!info) return;
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/instagram/scheduler", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: pause ? "pause" : "resume" }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMessage(data.error || "처리하지 못했습니다."); return; }
    const next: StateKey = pause ? "paused" : info.mode === "vercel" ? (info.platformAvailable ? "platform" : "platform-off") : data.started ? "running" : "idle";
    setInfo({ ...info, state: next });
    setMessage(pause ? (data.notice || "예약 게시를 일시정지했습니다.") : "예약 게시를 재개했습니다.");
  }

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
