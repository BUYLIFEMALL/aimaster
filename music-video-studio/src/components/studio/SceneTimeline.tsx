"use client";

// v1.23 가로 타임라인 — 장면 흐름을 한 줄로 보고, 끌어서 놓기(PC)나 ◀ ▶ 버튼(휴대폰·키보드)으로 순서를 바꾼다.
// 만든 이미지·영상은 장면 id에 붙어 있어 순서를 바꿔도 그대로 따라간다. 서버·DB 호출 없음.
import { useState } from "react";
import { ChevronLeft, ChevronRight, Film, GripVertical, ImageIcon } from "lucide-react";
import { moveItem } from "@/lib/music/reorder";
import type { Scene, SceneMedia } from "@/lib/music/types";

const firstLine = (lyric: string) =>
  lyric.split(/\r?\n/).map((l) => l.replace(/\[[^\]]*\]/g, "").trim()).find(Boolean) ?? "";

export function SceneTimeline({ scenes, media, disabled, timedHint, onReorder }: {
  scenes: Scene[];
  media: Record<string, SceneMedia | undefined>;
  disabled: boolean;
  /** 곡에 시간 가사가 있을 때 안내 한 줄을 보인다 */
  timedHint: boolean;
  onReorder: (next: Scene[]) => void;
}) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const move = (from: number, to: number) => {
    const next = moveItem(scenes, from, to);
    if (next !== scenes) onReorder(next);
  };

  return (
    <section aria-label="장면 타임라인" className="space-y-2 rounded-2xl border border-slate-800 bg-[#080c14] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-slate-100">🎞️ 장면 타임라인 <span className="text-xs font-normal text-slate-400">{scenes.length}개 · 끌어서 놓거나 ◀ ▶로 순서를 바꿉니다</span></p>
      </div>
      <ol className="flex gap-2 overflow-x-auto pb-1">
        {scenes.map((s, i) => {
          const m = media[s.id];
          return (
            <li
              key={s.id}
              draggable={!disabled}
              onDragStart={(e) => { setDragFrom(i); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(i)); }}
              onDragOver={(e) => { if (dragFrom === null) return; e.preventDefault(); setOver(i); }}
              onDragLeave={() => setOver((v) => (v === i ? null : v))}
              onDrop={(e) => { e.preventDefault(); if (dragFrom !== null) move(dragFrom, i); setDragFrom(null); setOver(null); }}
              onDragEnd={() => { setDragFrom(null); setOver(null); }}
              className={`w-36 shrink-0 rounded-xl border bg-slate-900/60 p-1.5 transition-colors ${over === i && dragFrom !== i ? "border-cyan-400" : "border-slate-800"} ${dragFrom === i ? "opacity-50" : ""} ${disabled ? "" : "cursor-grab active:cursor-grabbing"}`}
            >
              <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
                {m?.videoUrl ? (
                  <video src={m.videoUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                ) : m?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] text-slate-600">이미지 없음</div>
                )}
                <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 text-[10px] font-bold text-white">{String(i + 1).padStart(2, "0")}</span>
                <span className="absolute right-1 top-1 rounded bg-black/70 p-0.5 text-white" aria-hidden="true">
                  {m?.videoUrl ? <Film className="h-3 w-3 text-pink-300" /> : m?.imageUrl ? <ImageIcon className="h-3 w-3 text-cyan-300" /> : null}
                </span>
              </div>
              <p className="mt-1 truncate text-[11px] text-slate-300" title={s.lyric}>{firstLine(s.lyric) || "(가사 없음)"}</p>
              <div className="mt-1 flex items-center justify-between">
                <button type="button" aria-label={`장면 ${i + 1}을 앞으로`} disabled={disabled || i === 0} onClick={() => move(i, i - 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-30">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <GripVertical className="h-4 w-4 text-slate-600" aria-hidden="true" />
                <button type="button" aria-label={`장면 ${i + 1}을 뒤로`} disabled={disabled || i === scenes.length - 1} onClick={() => move(i, i + 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-30">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      {timedHint && (
        <p className="text-[11px] leading-relaxed text-amber-300/90">곡에 시간 가사가 있어 장면이 가사 순서대로 바뀝니다. 순서를 가사와 다르게 바꾸면 최종 뮤직비디오는 「고르게 나눔」으로 만들어집니다.</p>
      )}
      {disabled && <p className="text-[11px] text-slate-500">이미지·영상을 만드는 동안에는 순서를 바꿀 수 없습니다.</p>}
    </section>
  );
}
