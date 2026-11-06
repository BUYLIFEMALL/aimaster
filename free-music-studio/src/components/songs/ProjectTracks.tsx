"use client";

// 곡 만들기 오른쪽 — 고른 프로젝트의 곡 카드(원본 boks-music `src/App.tsx` 곡 만들기 2단 오른쪽, MIT, 2026-11-06).
// 표지·제목·길이·종류와 바로 듣기. 대기열이 곡을 기록하면 1분마다 새로 읽는다.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Palette, Pause, Play } from "lucide-react";
import { useEngine } from "@/components/engine/useEngine";
import { usePlayer } from "@/components/player/PlayerProvider";
import { CoverThumb } from "@/components/library/CoverThumb";
import { hasCover, hasLibrary, listLibraryFormats } from "@/lib/engine";
import { libraryHref } from "@/lib/collections";
import { isInstrumental } from "@/lib/trackFilters";
import { KIND_LABEL, type Track } from "@/lib/tracks";

const SHOW = 12;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function ProjectTracks({ projectId, view, label, onCover }: { projectId: string | null; view: string; label: string; onCover?: (t: Track) => void }) {
  const engine = useEngine();
  const player = usePlayer();
  const libOk = engine.paired && hasLibrary(engine.status);
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [onPc, setOnPc] = useState<Set<string> | null>(null);
  const [arts, setArts] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    fetch("/api/tracks")
      .then((r) => (r.ok ? r.json() : { tracks: [] }))
      .then((d) => setTracks(d.tracks ?? []))
      .catch(() => setTracks([]));
  }, []);
  useEffect(() => {
    load();
    const t = window.setInterval(load, 60_000);
    return () => window.clearInterval(t);
  }, [load]);
  useEffect(() => {
    if (!libOk) return;
    listLibraryFormats()
      .then((r) => (setOnPc(r.ids), setArts(r.arts)))
      .catch(() => setOnPc(null));
  }, [libOk, tracks?.length]);

  const list = (tracks ?? []).filter((t) => (view === "all" ? true : view === "none" ? !t.project_id : t.project_id === projectId)).slice(0, SHOW);
  const playable = list.filter((t) => onPc?.has(t.id));
  const toPlayer = (t: Track) => ({ key: t.id, title: t.title, subtitle: mmss(t.duration_sec) });

  return (
    <section className="space-y-2 rounded-2xl border border-slate-800 bg-[#0a0f1d] p-4">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-xs font-bold text-slate-200">🎧 {label}</p>
        <Link href={projectId ? libraryHref("project", projectId) : "/library"} className="shrink-0 text-[11px] text-emerald-300 underline underline-offset-2">
          전체 보기
        </Link>
      </div>
      {tracks === null ? (
        <p className="text-[11px] text-slate-500">불러오는 중…</p>
      ) : list.length === 0 ? (
        <p className="text-[11px] leading-relaxed text-slate-500">아직 만든 곡이 없습니다. 왼쪽에서 곡을 저장하고 「노래 만들기」를 누르면 여기에 쌓입니다.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-1">
          {list.map((t) => {
            const now = player?.current?.key === t.id;
            const here = !!onPc?.has(t.id);
            return (
              <li key={t.id} className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-950/50 p-2">
                {libOk && hasCover(engine.status) && <CoverThumb trackId={t.id} has={arts.has(t.id)} title={t.title} />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-100">{t.title}</p>
                  <p className="truncate text-[10px] text-slate-500">
                    {mmss(t.duration_sec)} · {KIND_LABEL[t.kind] || (isInstrumental(t) ? "연주곡" : "보컬곡")}
                    {t.license === "noncommercial" ? " · 비상업용" : ""}
                  </p>
                </div>
                {onCover && (
                  // 이 곡으로 바로 커버(C-3) — 조건은 「모든 음악」의 「이 곡으로 커버 만들기」와 같음
                  <button
                    type="button"
                    disabled={!here || t.license === "noncommercial"}
                    onClick={() => onCover(t)}
                    aria-label={`${t.title}으로 커버 만들기`}
                    title={!here ? "이 PC에 음원이 있어야 합니다" : t.license === "noncommercial" ? "개인용 엔진 곡은 커버를 만들 수 없습니다" : "이 곡으로 커버 만들기"}
                    className="shrink-0 rounded-full border border-fuchsia-500/40 p-2 text-fuchsia-200 hover:bg-fuchsia-950/40 disabled:opacity-30"
                  >
                    <Palette className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  disabled={!here}
                  onClick={() => player?.playList(playable.map(toPlayer), t.id)}
                  aria-label={now && player?.playing ? "멈춤" : "듣기"}
                  title={here ? "" : "이 PC에 음원이 없습니다"}
                  className="shrink-0 rounded-full bg-emerald-600 p-2 text-white hover:bg-emerald-500 disabled:opacity-30"
                >
                  {now && player?.playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
