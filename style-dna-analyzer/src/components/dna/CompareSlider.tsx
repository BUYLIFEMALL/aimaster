"use client";

import { useRef, useState } from "react";
import { percentAt, percentForKey } from "@/lib/dna/compare";

/**
 * F5(v1.27): 원본과 생성 이미지를 같은 틀에 겹쳐 가운데 선을 끌어 비교한다(바나나 캔버스 Compare 참고).
 * 틀 비율은 원본을 따르고, 두 이미지 모두 잘리지 않게 틀 안에 맞춘다(object-contain).
 */
export function CompareSlider({ before, after }: { before: string; after: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(50);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const moveTo = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (r) setPos(percentAt(clientX, r.left, r.width));
  };

  return (
    <div className="space-y-2">
      <div
        ref={box}
        className={`relative mx-auto w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 select-none touch-none ${dragging ? "cursor-grabbing" : "cursor-ew-resize"}`}
        // 틀은 원본 비율 그대로, 높이 480px를 넘지 않게 폭을 줄인다(폭만 꽉 채우면 원본이 가운데에만 작게 보여 같은 자리 비교가 안 됨)
        style={size ? { aspectRatio: `${size.w} / ${size.h}`, maxWidth: `min(100%, ${Math.round((480 * size.w) / size.h)}px)` } : { aspectRatio: "1 / 1", maxWidth: "min(100%, 480px)" }}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDragging(true); moveTo(e.clientX); }}
        onPointerMove={(e) => { if (dragging) moveTo(e.clientX); }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={after} alt="생성 이미지" draggable={false} className="absolute inset-0 h-full w-full object-contain" />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={before}
            alt="원본 이미지"
            draggable={false}
            className="absolute inset-0 h-full w-full object-contain"
            onLoad={(e) => { const i = e.currentTarget; if (i.naturalWidth && i.naturalHeight) setSize({ w: i.naturalWidth, h: i.naturalHeight }); }}
          />
        </div>
        <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-slate-900/70 px-2 py-0.5 text-[11px] font-bold text-white">원본</span>
        <span className="pointer-events-none absolute right-2 top-2 rounded-md bg-violet-700/80 px-2 py-0.5 text-[11px] font-bold text-white">생성</span>
        <span className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.35)]" style={{ left: `${pos}%` }} />
        <span
          role="slider"
          tabIndex={0}
          aria-label="원본과 생성 이미지 비교 위치"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pos}
          onKeyDown={(e) => { const n = percentForKey(pos, e.key, e.shiftKey); if (n !== null) { e.preventDefault(); setPos(n); } }}
          className="absolute top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-violet-700 text-xs font-black text-white shadow-lg outline-none focus-visible:ring-4 focus-visible:ring-violet-300"
          style={{ left: `${pos}%` }}
        >
          ⇆
        </span>
      </div>
      <p className="text-[11px] text-slate-500">가운데 선을 좌우로 끌거나, 동그라미를 누른 뒤 ←/→ 키로 움직여 같은 자리의 색감을 비교하세요.</p>
    </div>
  );
}
