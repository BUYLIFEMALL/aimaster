"use client";

import { useEffect, useRef, useState } from "react";
import { colorDiffPercent, containPoint, percentAt, percentForKey, toHex } from "@/lib/imageTools/compare";

type RGB = [number, number, number];
type Pixels = { data: Uint8ClampedArray; w: number; h: number; natW: number; natH: number };
export type BeforeAfterLabels = { before: string; after: string; diff: string; hint: string; position: string };

/** 비교용 픽셀을 한 번 읽어 둔다(최대 1024px, 브라우저 안 blob 주소라 서버 전송 없음) */
function usePixels(src: string): Pixels | null {
  const [px, setPx] = useState<{ src: string; px: Pixels } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled || !img.naturalWidth || !img.naturalHeight) return;
      const scale = Math.min(1, 1024 / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, w, h);
      setPx({ src, px: { data: ctx.getImageData(0, 0, w, h).data, w, h, natW: img.naturalWidth, natH: img.naturalHeight } });
    };
    img.src = src;
    return () => { cancelled = true; };
  }, [src]);
  return px?.src === src ? px.px : null;
}

/** 틀 안 위치의 색(주변 5×5 평균). 그림 밖 여백이면 null */
function pick(px: Pixels | null, frameW: number, frameH: number, xPct: number, yPct: number): RGB | null {
  if (!px) return null;
  const p = containPoint(frameW, frameH, px.natW, px.natH, xPct, yPct);
  if (!p) return null;
  const cx = Math.floor((p.x * px.w) / px.natW);
  const cy = Math.floor((p.y * px.h) / px.natH);
  let r = 0, g = 0, b = 0, n = 0;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= px.w || y >= px.h) continue;
      const i = (y * px.w + x) * 4;
      r += px.data[i]; g += px.data[i + 1]; b += px.data[i + 2]; n++;
    }
  }
  return n ? [r / n, g / n, b / n] : null;
}

function Swatch({ label, rgb }: { label: string; rgb: RGB | null }) {
  const hex = rgb ? toHex(...rgb) : null;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="h-7 w-7 shrink-0 rounded-lg border border-[#334155]" style={{ background: hex ?? "transparent", backgroundImage: hex ? undefined : "repeating-linear-gradient(45deg,#334155 0 4px,transparent 4px 8px)" }} />
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-400">{label}</p>
        <p className="font-mono text-xs font-black text-slate-100">{hex ?? "—"}</p>
      </div>
    </div>
  );
}

/**
 * v1.16: 변환 전(원본)과 후(결과)를 같은 틀에 겹쳐 선을 끌어 비교하고, 선·동그라미 자리의 두 색과 차이를 보여 준다.
 * 위치 계산은 공용 기준 코드 compare-slider 사본(이미지 스타일 분석기 기준). 틀 비율은 원본을 따르고 두 그림 모두 잘리지 않게 맞춘다.
 */
export function BeforeAfter({ before, after, labels, maxHeight = 520 }: { before: string; after: string; labels: BeforeAfterLabels; maxHeight?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(50);
  const [posY, setPosY] = useState(50);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [frame, setFrame] = useState<{ w: number; h: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const beforePx = usePixels(before);
  const afterPx = usePixels(after);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setFrame({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const moveTo = (clientX: number, clientY: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    setPos(percentAt(clientX, r.left, r.width));
    setPosY(percentAt(clientY, r.top, r.height));
  };

  const a = frame ? pick(beforePx, frame.w, frame.h, pos, posY) : null;
  const b = frame ? pick(afterPx, frame.w, frame.h, pos, posY) : null;

  return (
    <div className="space-y-3">
      <div
        ref={box}
        className={`relative mx-auto w-full overflow-hidden rounded-xl border border-[#2a3852] bg-[#080b12] select-none touch-none ${dragging ? "cursor-grabbing" : "cursor-crosshair"}`}
        style={size ? { aspectRatio: `${size.w} / ${size.h}`, maxWidth: `min(100%, ${Math.round((maxHeight * size.w) / size.h)}px)` } : { aspectRatio: "1 / 1", maxWidth: `min(100%, ${maxHeight}px)` }}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDragging(true); moveTo(e.clientX, e.clientY); }}
        onPointerMove={(e) => { if (dragging) moveTo(e.clientX, e.clientY); }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={after} alt={labels.after} draggable={false} className="absolute inset-0 h-full w-full object-contain" />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={before}
            alt={labels.before}
            draggable={false}
            className="absolute inset-0 h-full w-full object-contain"
            onLoad={(e) => { const i = e.currentTarget; if (i.naturalWidth && i.naturalHeight) setSize({ w: i.naturalWidth, h: i.naturalHeight }); }}
          />
        </div>
        <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-bold text-white">{labels.before}</span>
        <span className="pointer-events-none absolute right-2 top-2 rounded-md bg-violet-700/85 px-2 py-0.5 text-[11px] font-bold text-white">{labels.after}</span>
        <span className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]" style={{ left: `${pos}%` }} />
        <span
          role="slider"
          tabIndex={0}
          aria-label={labels.position}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pos}
          onKeyDown={(e) => {
            const n = percentForKey(pos, e.key, e.shiftKey);
            if (n !== null) { e.preventDefault(); setPos(n); return; }
            const y = percentForKey(posY, e.key === "ArrowUp" ? "ArrowLeft" : e.key === "ArrowDown" ? "ArrowRight" : "", e.shiftKey);
            if (y !== null) { e.preventDefault(); setPosY(y); }
          }}
          className="absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-violet-600 text-xs font-black text-white shadow-lg outline-none focus-visible:ring-4 focus-visible:ring-violet-400"
          style={{ left: `${pos}%`, top: `${posY}%` }}
        >
          ⇆
        </span>
      </div>
      {(beforePx || afterPx) && (
        <div className="mx-auto flex max-w-md flex-wrap items-center justify-between gap-3 rounded-xl border border-[#2a3852] bg-[#0d121f] px-3 py-2" data-picker>
          <Swatch label={labels.before} rgb={a} />
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-400">{labels.diff}</p>
            <p className="text-sm font-black text-slate-100">{a && b ? `${colorDiffPercent(a, b)}%` : "—"}</p>
          </div>
          <Swatch label={labels.after} rgb={b} />
        </div>
      )}
      <p className="text-center text-[11px] text-slate-400">{labels.hint}</p>
    </div>
  );
}
