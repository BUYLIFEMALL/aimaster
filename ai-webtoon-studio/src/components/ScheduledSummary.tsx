"use client";

import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { formatKst } from "@/lib/instagram/schedule";

// v1.17 대시보드 메인(STEP 1) 맨 위 「⏰ 인스타 예약 n건 대기 · 다음 게시」 — 지금 원고에 컷이 없어도 지난 예약을 알아볼 수 있게.
// 기록은 /api/instagram/posts(본인 최근 30일). 대기 예약이 없거나 불러오지 못하면 아무것도 보이지 않는다.
type Row = { status: string; scheduled_at: string | null };

export function ScheduledSummary({ onOpen }: { onOpen: () => void }) {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/instagram/posts", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && d && setRows(d.posts ?? []))
      .catch(() => undefined);
    return () => { alive = false; };
  }, []);

  const pending = (rows ?? []).filter((r) => r.status === "scheduled" && r.scheduled_at).sort((a, b) => Date.parse(a.scheduled_at!) - Date.parse(b.scheduled_at!));
  if (pending.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-xs text-sky-100" role="status">
      <CalendarClock className="h-4 w-4 text-sky-300" />
      <span className="font-bold">⏰ 인스타 예약 {pending.length}건 대기</span>
      <span className="text-sky-200/80">· 다음 게시 {formatKst(pending[0].scheduled_at)}</span>
      <button type="button" onClick={onOpen} className="ml-auto rounded-lg border border-sky-400/40 px-3 py-1 font-bold text-sky-100 hover:bg-sky-500/20">
        게시 기록·예약 보기 →
      </button>
    </div>
  );
}
