"use client";

import { Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, X } from "lucide-react";
import { usePlayer } from "./PlayerProvider";
import { styleOf } from "@/lib/providerStyle";

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// v1.11 화면 아래 고정 미니 플레이어(곡을 재생하면 나타남). 사이드바 오른쪽 본문 폭에 맞춘다.
// v1.12 반복(끔→목록→한 곡)·무작위 버튼 — 켜지면 하늘색.
const REPEAT_LABEL = { off: "반복 끔", all: "목록 반복", one: "한 곡 반복" } as const;
export function MiniPlayer() {
  const p = usePlayer();
  if (!p?.current) return null;
  const st = styleOf(p.current.provider);
  const on = "text-cyan-300 bg-cyan-400/10";
  const off = "text-zinc-500 hover:bg-zinc-800 hover:text-white";
  return (
    <div role="region" aria-label="미니 플레이어" className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-800 bg-[#0c0c10]/95 backdrop-blur md:left-64">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 md:px-8">
        <span className={`hidden h-9 w-1 shrink-0 rounded-full bg-gradient-to-b sm:block ${st.strip}`} aria-hidden="true" />
        <div className="min-w-0 flex-1 sm:max-w-[16rem]">
          <p className="truncate text-sm font-bold text-white" title={p.current.title}>{p.current.title}</p>
          <p className={`truncate text-[11px] ${st.text}`}>{p.current.modelName}</p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <button type="button" onClick={p.toggleShuffle} aria-label={p.shuffle ? "무작위 재생 끄기" : "무작위 재생 켜기"} aria-pressed={p.shuffle} title={p.shuffle ? "무작위 재생 켜짐" : "무작위 재생 꺼짐"}
            className={`rounded-full p-2 ${p.shuffle ? on : off}`}><Shuffle className="h-4 w-4" aria-hidden="true" /></button>
          <button type="button" onClick={p.prev} aria-label="이전 곡" className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"><SkipBack className="h-4 w-4" aria-hidden="true" /></button>
          <button type="button" onClick={() => p.current && p.toggle(p.current)} aria-label={p.playing ? "일시정지" : "재생"}
            className="rounded-full bg-violet-500 p-2.5 text-white shadow-md shadow-violet-500/30 hover:bg-violet-400">
            {p.playing ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
          </button>
          <button type="button" onClick={p.next} aria-label="다음 곡" className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"><SkipForward className="h-4 w-4" aria-hidden="true" /></button>
          <button type="button" onClick={p.cycleRepeat} aria-label={`${REPEAT_LABEL[p.repeat]} — 눌러서 바꾸기`} title={REPEAT_LABEL[p.repeat]}
            className={`rounded-full p-2 ${p.repeat === "off" ? off : on}`}>
            {p.repeat === "one" ? <Repeat1 className="h-4 w-4" aria-hidden="true" /> : <Repeat className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
        <div className="hidden min-w-0 flex-1 items-center gap-2 sm:flex">
          <span className="w-10 text-right text-[11px] tabular-nums text-zinc-500">{mmss(p.time)}</span>
          <input type="range" min={0} max={p.duration || 0} step={0.5} value={Math.min(p.time, p.duration || 0)} onChange={(e) => p.seek(Number(e.target.value))}
            aria-label="재생 위치" className="h-6 min-w-0 flex-1 accent-cyan-400" />
          <span className="w-10 text-[11px] tabular-nums text-zinc-500">{mmss(p.duration)}</span>
        </div>
        <button type="button" onClick={p.close} aria-label="플레이어 닫기" className="shrink-0 rounded-full p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"><X className="h-4 w-4" aria-hidden="true" /></button>
      </div>
    </div>
  );
}
