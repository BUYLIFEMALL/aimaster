"use client";

// v1.09 자르기 막대 — 색칠된 부분이 남는 구간. 양 끝 손잡이를 끌거나(마우스·손가락) ←→ 키로 0.1초씩 앞·뒤 자르기를 바꾼다.
import { useRef } from "react";
import { nudgeTrim, trimFromRatio, type TrimEdge } from "@/lib/edit/trim";

type Props = {
  duration: number;
  trimStart: number;
  trimEnd: number;
  disabled?: boolean;
  onChange: (next: { trimStart: number; trimEnd: number }) => void;
};

export function TrimBar({ duration, trimStart, trimEnd, disabled, onChange }: Props) {
  const bar = useRef<HTMLDivElement>(null);
  const d = duration > 0 ? duration : 0;
  const left = d ? (Math.min(trimStart, d) / d) * 100 : 0;
  const right = d ? (Math.min(trimEnd, d) / d) * 100 : 0;
  const keep = Math.max(0, Math.round((d - trimStart - trimEnd) * 10) / 10);

  const ratioAt = (clientX: number) => {
    const r = bar.current?.getBoundingClientRect();
    return r && r.width > 0 ? (clientX - r.left) / r.width : 0;
  };

  const onPointerDown = (edge: TrimEdge) => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || !d) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    onChange(trimFromRatio(d, trimStart, trimEnd, edge, ratioAt(e.clientX)));
  };
  const onPointerMove = (edge: TrimEdge) => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || !d || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    onChange(trimFromRatio(d, trimStart, trimEnd, edge, ratioAt(e.clientX)));
  };
  const onKeyDown = (edge: TrimEdge) => (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || !d || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    e.preventDefault();
    onChange(nudgeTrim(d, trimStart, trimEnd, edge, e.key === "ArrowRight" ? 1 : -1));
  };

  const handle = (edge: TrimEdge, pos: number) => (
    <button
      type="button"
      disabled={disabled || !d}
      aria-label={edge === "start" ? `앞 자르기 ${trimStart}초 — 끌거나 ←→ 키로 조절` : `뒤 자르기 ${trimEnd}초 — 끌거나 ←→ 키로 조절`}
      onPointerDown={onPointerDown(edge)}
      onPointerMove={onPointerMove(edge)}
      onKeyDown={onKeyDown(edge)}
      className="absolute top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 disabled:cursor-default disabled:opacity-40"
      style={{ left: `${pos}%` }}
    >
      <span className="h-5 w-2 rounded-full border border-sky-200 bg-sky-400 shadow" />
    </button>
  );

  return (
    <div className="px-3" title={`남는 구간 ${keep}초 — 양 끝 손잡이를 끌어서 자르기`}>
      <div ref={bar} className="relative h-6">
        <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-zinc-800">
          <div className="absolute inset-y-0 bg-sky-500/70" style={{ left: `${left}%`, right: `${right}%` }} />
        </div>
        {handle("start", left)}
        {handle("end", 100 - right)}
      </div>
    </div>
  );
}
