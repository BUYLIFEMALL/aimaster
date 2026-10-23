"use client";

import { useRef } from "react";

const COLORS = { primary: "#6E00FF", secondary: "#22D3EE" } as const;

/** 세로 이퀄라이저 슬라이더: 마우스·터치 드래그와 키보드(↑↓ PageUp/Down Home/End)를 지원한다. */
export function EqSlider({
  label,
  value,
  color,
  onChange,
}: {
  label: string;
  value: number;
  color: keyof typeof COLORS;
  onChange: (v: number) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const c = COLORS[color];

  const setFromY = (clientY: number) => {
    const el = track.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const pct = ((r.bottom - clientY) / r.height) * 100;
    onChange(Math.round(Math.min(100, Math.max(0, pct))));
  };

  return (
    <div className="flex h-full w-14 select-none flex-col items-center gap-2">
      <div className="h-5 w-full text-center text-sm font-bold tabular-nums text-violet-700">{value}</div>
      <div
        ref={track}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-orientation="vertical"
        className="relative flex w-8 flex-1 cursor-pointer touch-none justify-center py-1 outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          setFromY(e.clientY);
        }}
        onPointerMove={(e) => dragging.current && setFromY(e.clientY)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 10 : 1;
          if (e.key === "ArrowUp" || e.key === "ArrowRight") onChange(Math.min(100, value + step));
          else if (e.key === "ArrowDown" || e.key === "ArrowLeft") onChange(Math.max(0, value - step));
          else if (e.key === "PageUp") onChange(Math.min(100, value + 10));
          else if (e.key === "PageDown") onChange(Math.max(0, value - 10));
          else if (e.key === "Home") onChange(0);
          else if (e.key === "End") onChange(100);
          else return;
          e.preventDefault();
        }}
      >
        <div className="h-full w-[2px] rounded-full bg-slate-200" />
        <div
          className="pointer-events-none absolute bottom-1 w-[2px] rounded-full transition-all duration-75"
          style={{ height: `calc(${value}% - 4px)`, backgroundColor: c }}
        />
        <div
          className="pointer-events-none absolute left-1/2 size-4 -translate-x-1/2 rounded-full border-2 border-white shadow-sm transition-all duration-75"
          style={{ bottom: `calc(${value}% - 10px)`, backgroundColor: c }}
        />
      </div>
      <div className="flex h-12 w-full items-start justify-center pt-2">
        <span className="w-full break-words px-1 text-center text-[11px] font-bold uppercase leading-tight tracking-wider text-slate-500">{label}</span>
      </div>
    </div>
  );
}
