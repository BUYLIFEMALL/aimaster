import { useEffect, useState } from "react";
import { formatKst } from "./schedule";

// 인스타 예약 게시 화면 동작 — 공용 기준 코드 `insta-posts-client`(2026-10-20, 기준 cardnews-studio, 사본 인플루언서·웹툰·4컷).
// 화면 모양(색·테마·배치)은 프로그램마다 다르게 두고, 같은 동작(상태 불러오기·일시정지/재개·상태 문구, 게시 기록 시각 문구, 예약 취소)만 여기서 맞춘다.
// 사본은 직접 고치지 않는다 — 기준만 고치고 `node scripts/check-shared-modules.mjs --sync`. 주소는 호출하는 화면이 넘긴다(카드뉴스는 /api/cardnews/…).
// 브라우저 화면(클라이언트 컴포넌트)에서만 불러온다. 지침: 루트 docs/SCHEDULER_POLICY.md

export type SchedulerStateKey = "platform" | "platform-off" | "no-key" | "paused" | "running" | "idle";
export type SchedulerInfo = { mode: "vercel" | "cronjob"; platformAvailable: boolean; state: SchedulerStateKey; scheduled: number };

/** 상태별 이름·설명 — 색은 각 화면이 정한다 */
export const SCHEDULER_STATE_TEXT: Record<SchedulerStateKey, { label: string; help: string }> = {
  platform: { label: "AIMaster 기본(Vercel) 실행 중", help: "예약 시각이 되면 사이트의 Vercel 예약 호출이 5분 안에 자동으로 게시합니다." },
  running: { label: "내 cron-job.org 실행 중", help: "예약 시각이 되면 내 cron-job.org가 1분 안에 자동으로 게시합니다." },
  idle: { label: "내 cron-job.org 대기", help: "남은 예약이 없어 쉬는 중입니다. 예약하면 자동으로 켜집니다." },
  paused: { label: "일시정지됨", help: "예약이 있어도 게시하지 않습니다. 재개하면 다시 게시합니다(24시간 넘게 지난 예약은 올리지 않음)." },
  "platform-off": { label: "실행 방식 선택 필요", help: "관리자가 사이트 예약 호출을 꺼 두었습니다. 「내 cron-job.org」를 선택해 주세요." },
  "no-key": { label: "cron-job.org 키 미등록", help: "「내 cron-job.org」 방식은 본인 API 키가 필요합니다(또는 AIMaster 기본(Vercel)으로 바꾸기)." },
};

/** 「⏰ 예약 발행」 상태 줄 동작. refreshKey가 바뀌면(예약·취소 뒤) 다시 불러온다. endpoint 예: "/api/instagram/scheduler" */
export function useInstaSchedulerStatus(endpoint: string, refreshKey = 0) {
  const [info, setInfo] = useState<SchedulerInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;
    fetch(endpoint, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && d && setInfo(d))
      .catch(() => undefined);
    return () => { alive = false; };
  }, [endpoint, refreshKey]);

  async function toggle(pause: boolean) {
    if (!info) return;
    setBusy(true);
    setMessage("");
    const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: pause ? "pause" : "resume" }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMessage(data.error || "처리하지 못했습니다."); return; }
    const next: SchedulerStateKey = pause ? "paused" : info.mode === "vercel" ? (info.platformAvailable ? "platform" : "platform-off") : data.started ? "running" : "idle";
    setInfo({ ...info, state: next });
    setMessage(pause ? (data.notice || "예약 게시를 일시정지했습니다.") : "예약 게시를 재개했습니다.");
  }

  return { info, busy, message, toggle, text: info ? SCHEDULER_STATE_TEXT[info.state] : null };
}

export type InstaPostStatus = "scheduled" | "publishing" | "published" | "failed" | "canceled";
type TimedPost = { status: InstaPostStatus; scheduled_at: string | null; published_at: string | null; created_at: string; error_message: string | null };

/** 게시 기록 한 줄의 시각 문구 — 예약·취소는 예약 시각, 게시는 게시 시각 기준 */
export function postTimeLabel(p: TimedPost): string {
  if (p.status === "scheduled") return `${formatKst(p.scheduled_at)} ${p.error_message ? "다시 시도 예정" : "예약"}`;
  if (p.status === "canceled" && p.scheduled_at) return `${formatKst(p.scheduled_at)} 예약 → 취소`;
  if (p.published_at) return `${formatKst(p.published_at)} 게시`;
  return `${formatKst(p.created_at)} 등록`;
}

/** 목록에서 한 건을 바로 「취소」로 바꾼다(다시 불러오기 전 화면 반영) */
export function markCanceled<T extends { id: string; status: InstaPostStatus }>(list: T[], id: string): T[] {
  return list.map((p) => (p.id === id ? { ...p, status: "canceled" } : p));
}

/**
 * 예약 취소 — 취소 중에는 다른 취소 버튼을 막고, 성공하면 다시 불러오기 전에 바로 「취소」로 바꾼다
 * (목록 갱신이 늦어 같은 버튼을 한 번 더 누르면 「이미 끝난 예약」 오류가 나던 문제, 2026-10-20 4컷 v1.19 검수 중 발견).
 * endpoint 예: "/api/instagram/posts" — 요청은 `${endpoint}?id=` DELETE.
 */
export function useScheduledPostCancel(endpoint: string, handlers: { onCanceled: (id: string) => void; onError: (message: string) => void; onSettled: () => void }) {
  const [canceling, setCanceling] = useState<string | null>(null);
  async function cancel(id: string) {
    if (canceling) return;
    handlers.onError("");
    setCanceling(id);
    try {
      const r = await fetch(`${endpoint}?id=${id}`, { method: "DELETE" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) handlers.onError(d.error || "예약을 취소하지 못했습니다.");
      else handlers.onCanceled(id);
    } finally {
      setCanceling(null);
      handlers.onSettled();
    }
  }
  return { canceling, cancel };
}
