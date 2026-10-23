"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MAX_INSTA_CAPTION } from "@/lib/instagram/feedImage";
import { formatKst, kstLocalToIso, validateScheduleTime } from "@/lib/instagram/schedule";
import { defaultTimeFor, latestRoutineCuts, tomorrowKst } from "@/lib/routineSchedule";
import { toFeedJpeg } from "./InstagramPublishPanel";
import { INSTA_POSTS_CHANGED } from "./ScheduledSummary";
import type { HistoryItem } from "@/types/influencer";

// v1.21 「🗓 하루 일과 자동 예약」 — 가장 최근 일과 플래닝의 장면 컷(작업 히스토리)을 날짜 하나 + 장면별 시각으로 한 번에 인스타 예약.
// 그림은 새로 만들지 않는다. 예약 경로는 게시 패널과 같다(사진 올리기 → /api/instagram/posts). 켜고 끄기: src/lib/routineSchedule.ts
type Result = { label: string; ok: boolean; text: string };

export function RoutineSchedulePanel({ history }: { history: HistoryItem[] }) {
  const cuts = latestRoutineCuts(history);
  const [date, setDate] = useState(tomorrowKst);
  const [times, setTimes] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/instagram", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setUsername(d?.connected && !d?.expired ? d.username : null))
      .catch(() => setUsername(null));
  }, []);

  // 예약하는 동안 창을 닫으면 남은 컷이 예약되지 않는다 — 브라우저 「나가시겠습니까?」 확인
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  if (cuts.length === 0) return null;

  const timeOf = (h: HistoryItem) => times[h.id] ?? defaultTimeFor(h.config.routine!.order);
  const isoOf = (h: HistoryItem) => kstLocalToIso(`${date}T${timeOf(h)}`);
  const captionOf = (h: HistoryItem) => (h.captions?.[0] || h.summary || h.config.routine!.label).slice(0, MAX_INSTA_CAPTION);
  // 사진을 올리기 전에 서버와 같은 시각 규칙(지난 시각·너무 가까움·60일 넘음 등)으로 먼저 검사 — 거절될 사진을 올려 두지 않게
  const timeProblem = cuts
    .map((h) => { const iso = isoOf(h); const v = iso ? validateScheduleTime(iso) : { ok: false as const, error: "날짜와 시각을 확인해 주세요." }; return v.ok ? null : { label: h.config.routine!.label, error: v.error }; })
    .find(Boolean) ?? null;

  async function scheduleAll() {
    const out: Result[] = [];
    setResults([]);
    const supabase = createClient();
    for (let i = 0; i < cuts.length; i++) {
      const h = cuts[i];
      const label = `${i + 1}/${cuts.length} 「${h.config.routine!.label}」`;
      try {
        setBusy(`${label} — 사진 준비 중...`);
        const blob = await toFeedJpeg(h.imageUrl);
        setBusy(`${label} — 사진 올리는 중...`);
        const up = await fetch("/api/instagram/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ count: 1 }) });
        const upData = await up.json().catch(() => ({}));
        if (!up.ok) throw new Error(upData.error || "사진을 올릴 준비를 하지 못했습니다.");
        const u = (upData.uploads as { path: string; token: string }[])[0];
        const { error: e } = await supabase.storage.from("insta-post-images").uploadToSignedUrl(u.path, u.token, blob, { contentType: "image/jpeg" });
        if (e) throw new Error("사진을 올리지 못했습니다.");
        setBusy(`${label} — 예약을 저장하는 중...`);
        const res = await fetch("/api/instagram/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paths: [u.path], caption: captionOf(h), scheduledAt: isoOf(h) }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "예약하지 못했습니다.");
        out.push({ label: h.config.routine!.label, ok: true, text: `${formatKst(data.scheduledAt)} 예약` });
      } catch (err) {
        out.push({ label: h.config.routine!.label, ok: false, text: err instanceof Error ? err.message : "예약하지 못했습니다." });
      }
      setResults([...out]);
    }
    setBusy("");
    setConfirmed(false);
    window.dispatchEvent(new Event(INSTA_POSTS_CHANGED));
  }

  return (
    <div className="w-full max-w-2xl mb-4 rounded-2xl border border-if-border bg-if-surface p-4 space-y-3 text-xs text-if-text" aria-label="하루 일과 자동 예약">
      <div className="flex items-center gap-2 font-bold text-sm">
        <CalendarClock className="h-4 w-4 text-pink-400" /> 🗓 하루 일과 자동 예약
        <span className="ml-auto text-[11px] font-normal text-if-muted">최근 일과 장면 컷 {cuts.length}개</span>
      </div>
      <p className="text-if-muted break-keep">일과 플래닝으로 만든 장면마다 그림을 만든 뒤, 날짜와 시각만 정하면 한 번에 인스타그램 예약을 걸어 둡니다. 그림을 새로 만들지는 않습니다.</p>
      <label className="flex items-center gap-2">
        <span className="font-bold">게시 날짜</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={!!busy} className="rounded-lg border border-if-border bg-if-raised px-2 py-1 text-if-text" />
      </label>
      <ul className="space-y-1.5">
        {cuts.map((h) => (
          <li key={h.id} className="flex items-center gap-2 rounded-lg bg-if-raised px-2 py-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={h.imageUrl} alt="" className="h-10 w-8 rounded object-cover" />
            <span className="font-bold">{h.config.routine!.order}. {h.config.routine!.label}</span>
            <input type="time" value={timeOf(h)} onChange={(e) => setTimes((cur) => ({ ...cur, [h.id]: e.target.value }))} disabled={!!busy} aria-label={`${h.config.routine!.label} 게시 시각`}
              className="ml-auto rounded-lg border border-if-border bg-if-surface px-2 py-0.5 text-if-text" />
          </li>
        ))}
      </ul>
      {!username ? (
        <p className="text-amber-300">인스타그램 연결이 필요합니다. INSTA 포스팅 자동화에서 한 번 연결하면 여기서 바로 예약할 수 있어요.</p>
      ) : (
        <>
          {timeProblem && <p className="text-amber-300" role="alert">「{timeProblem.label}」: {timeProblem.error}</p>}
          <label className="flex items-start gap-1.5">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} disabled={!!busy} className="mt-0.5" />
            <span>@{username} 계정에 위 {cuts.length}개 컷이 각 시각에 공개 게시되는 것을 확인했어요.</span>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void scheduleAll()} disabled={!confirmed || !!busy || !!timeProblem}
              className="inline-flex items-center gap-1.5 rounded-xl bg-pink-500 px-4 py-2 font-bold text-white disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />} {cuts.length}개 컷 일과대로 예약
            </button>
            {busy && <span className="text-if-muted">{busy}</span>}
          </div>
          {busy && <p className="font-bold text-amber-300">⚠️ 예약이 끝날 때까지 이 창을 닫지 마세요.</p>}
        </>
      )}
      {results.length > 0 && (
        <ul className="space-y-0.5" role="status">
          {results.map((r, i) => <li key={i} className={r.ok ? "text-emerald-300" : "text-red-300"}>{r.ok ? "✓" : "✗"} {r.label} — {r.text}</li>)}
        </ul>
      )}
    </div>
  );
}
