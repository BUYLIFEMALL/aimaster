"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, ChevronDown, ChevronUp, X } from "lucide-react";
import { markCanceled, postTimeLabel, useScheduledPostCancel, type InstaPostStatus } from "@/lib/instagram/postsClient";

// v1.19 결과 화면 맨 위 「⏰ 인스타 예약 n건 대기 · 다음 게시」 — 지금 만든 사진이 없어도(새로 들어왔거나 다른 사진을 보는 중) 지난 예약을 알아보고 취소할 수 있게.
// 참고: ai-webtoon-studio ScheduledSummary(v1.17). 기록은 /api/instagram/posts(본인 최근 30일). 대기 예약이 없거나 불러오지 못하면 아무것도 보이지 않는다.
/** 게시 패널이 기록을 다시 불러올 때 보내는 신호(예약·취소 뒤 이 줄도 갱신) */
export const INSTA_POSTS_CHANGED = "aif-insta-posts-changed";

type Row = { id: string; title: string | null; status: InstaPostStatus; scheduled_at: string | null; published_at: string | null; created_at: string; error_message: string | null };

export function ScheduledSummary({ refreshKey = 0 }: { refreshKey?: number }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/instagram/posts", { cache: "no-store" });
      const d = r.ok ? await r.json() : null;
      if (d) setRows(d.posts ?? []);
    } catch { /* 기록을 못 불러와도 다른 기능은 쓸 수 있다 */ }
  }, []);
  useEffect(() => { void load(); }, [load, refreshKey]);
  useEffect(() => {
    const onChange = () => void load();
    window.addEventListener(INSTA_POSTS_CHANGED, onChange);
    return () => window.removeEventListener(INSTA_POSTS_CHANGED, onChange);
  }, [load]);

  const { canceling, cancel } = useScheduledPostCancel("/api/instagram/posts", { onCanceled: (id) => setRows((cur) => markCanceled(cur, id)), onError: setError, onSettled: () => void load() });

  const pending = rows.filter((r) => r.status === "scheduled" && r.scheduled_at).sort((a, b) => Date.parse(a.scheduled_at!) - Date.parse(b.scheduled_at!));
  if (pending.length === 0) return null;
  return (
    <div className="w-full max-w-2xl mb-4 rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-xs text-sky-100" role="status">
      <div className="flex flex-wrap items-center gap-2">
        <CalendarClock className="h-4 w-4 text-sky-300" />
        <span className="font-bold">⏰ 인스타 예약 {pending.length}건 대기</span>
        <span className="text-sky-200/80">· 다음 게시 {postTimeLabel(pending[0])}</span>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
          className="ml-auto inline-flex items-center gap-1 rounded-lg border border-sky-400/40 px-3 py-1 font-bold text-sky-100 hover:bg-sky-500/20">
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />} {open ? "접기" : "대기 목록 보기"}
        </button>
      </div>
      {open && (
        <ul className="mt-2 space-y-1" aria-label="예약 대기 목록">
          {pending.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-if-surface/70 px-2.5 py-1.5">
              <span className="text-if-text">{postTimeLabel(p)}</span>
              {p.title && <span className="truncate text-if-muted">· {p.title}</span>}
              <button type="button" disabled={!!canceling} onClick={() => void cancel(p.id)}
                className="ml-auto inline-flex items-center gap-0.5 rounded-md border border-if-border px-1.5 py-0.5 text-if-muted hover:text-if-text disabled:opacity-50">
                <X className="h-3 w-3" /> {canceling === p.id ? "취소하는 중..." : "예약 취소"}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-1 text-red-300" role="alert">{error}</p>}
    </div>
  );
}
