"use client";

import { useEffect, useState } from "react";

// 인스타 예약 게시 「실행 상태」 줄(v1.18 — 웹툰 v1.16 사본을 4컷 밝은 테마로). 예약은 게시 칸에서, 여기서는 전체 일시정지·재개만.
// 실행 방식(Vercel 기본 / 내 cron-job.org)은 「API키등록·플랫폼연동」 화면에서 고른다. 지침: 루트 docs/SCHEDULER_POLICY.md
type StateKey = "platform" | "platform-off" | "no-key" | "paused" | "running" | "idle";
type Info = { mode: "vercel" | "cronjob"; platformAvailable: boolean; state: StateKey; scheduled: number };

const STATE_TEXT: Record<StateKey, { label: string; color: string; help: string }> = {
  platform: { label: "AIMaster 기본(Vercel) 실행 중", color: "#059669", help: "예약 시각이 되면 사이트의 Vercel 예약 호출이 5분 안에 자동으로 게시합니다." },
  running: { label: "내 cron-job.org 실행 중", color: "#059669", help: "예약 시각이 되면 내 cron-job.org가 1분 안에 자동으로 게시합니다." },
  idle: { label: "내 cron-job.org 대기", color: "#475569", help: "남은 예약이 없어 쉬는 중입니다. 예약하면 자동으로 켜집니다." },
  paused: { label: "일시정지됨", color: "#d97706", help: "예약이 있어도 게시하지 않습니다. 재개하면 다시 게시합니다(24시간 넘게 지난 예약은 올리지 않음)." },
  "platform-off": { label: "실행 방식 선택 필요", color: "#dc2626", help: "관리자가 사이트 예약 호출을 꺼 두었습니다. 「내 cron-job.org」를 선택해 주세요." },
  "no-key": { label: "cron-job.org 키 미등록", color: "#dc2626", help: "「내 cron-job.org」 방식은 본인 API 키가 필요합니다(또는 AIMaster 기본(Vercel)으로 바꾸기)." },
};

/** refreshKey가 바뀌면(예약·취소 뒤) 다시 불러온다 */
export function SchedulePublishingControl({ refreshKey = 0 }: { refreshKey?: number }) {
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
    setMessage(pause ? "예약 게시를 일시정지했습니다." : "예약 게시를 재개했습니다.");
  }

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10, background: "#fff", fontSize: 12 }}>
      <b>⏰ 예약 발행: <span style={{ color: text.color }}>{text.label}</span></b> <span className="muted">· 예약 대기 {info.scheduled}건</span>
      <small className="muted" style={{ display: "block", marginTop: 3 }}>{text.help} <a href="/settings">실행 방식 바꾸기</a></small>
      {message && <small role="status" style={{ display: "block" }}>{message}</small>}
      <div className="actions" style={{ marginTop: 6 }}>
        {(info.state === "running" || info.state === "idle" || info.state === "platform") && <button type="button" disabled={busy} onClick={() => void toggle(true)}>{busy ? "처리 중…" : "⏸ 일시정지"}</button>}
        {info.state === "paused" && <button type="button" className="primary" disabled={busy} onClick={() => void toggle(false)}>{busy ? "처리 중…" : "▶ 재개"}</button>}
      </div>
    </div>
  );
}
