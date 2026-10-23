"use client";

import { SCHEDULER_STATE_TEXT, useInstaSchedulerStatus, type SchedulerStateKey } from "@/lib/instagram/postsClient";

// 인스타 예약 게시 「실행 상태」 줄(v1.18 — 웹툰 v1.16 사본을 4컷 밝은 테마로). 예약은 게시 칸에서, 여기서는 전체 일시정지·재개만.
// 실행 방식(Vercel 기본 / 내 cron-job.org)은 「API키등록·플랫폼연동」 화면에서 고른다. 지침: 루트 docs/SCHEDULER_POLICY.md

// 상태별 글자색(이 프로그램 화면 색). 이름·설명은 공용 SCHEDULER_STATE_TEXT
const STATE_COLOR: Record<SchedulerStateKey, string> = {
  platform: "#059669",
  running: "#059669",
  idle: "#475569",
  paused: "#d97706",
  "platform-off": "#dc2626",
  "no-key": "#dc2626",
};

/** refreshKey가 바뀌면(예약·취소 뒤) 다시 불러온다 */
export function SchedulePublishingControl({ refreshKey = 0 }: { refreshKey?: number }) {
  const { info, busy, message, toggle } = useInstaSchedulerStatus("/api/instagram/scheduler", refreshKey);
  if (!info) return null;
  const text = { ...SCHEDULER_STATE_TEXT[info.state], color: STATE_COLOR[info.state] };

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
