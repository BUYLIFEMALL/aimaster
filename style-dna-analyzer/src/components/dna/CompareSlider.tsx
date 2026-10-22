"use client";

import { useEffect, useRef, useState } from "react";
import { colorDiffPercent, containPoint, percentAt, percentForKey, toHex } from "@/lib/dna/compare";

type Pixels = { data: Uint8ClampedArray; w: number; h: number; natW: number; natH: number };
type RGB = [number, number, number];

/** 색 집게용: 이미지를 최대 1024px로 줄여 픽셀을 한 번 읽어 둔다(원본 버킷·data URL 모두 crossOrigin으로 읽음) */
function usePixels(src: string): Pixels | null {
  const [px, setPx] = useState<{ src: string; px: Pixels } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
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
      try {
        setPx({ src, px: { data: ctx.getImageData(0, 0, w, h).data, w, h, natW: img.naturalWidth, natH: img.naturalHeight } });
      } catch {
        // 다른 도메인 이미지를 읽을 수 없으면 색 집게만 숨긴다
      }
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
      <span className="h-7 w-7 shrink-0 rounded-lg border border-slate-300 shadow-2xs" style={{ background: hex ?? "transparent", backgroundImage: hex ? undefined : "repeating-linear-gradient(45deg,#cbd5e1 0 4px,transparent 4px 8px)" }} />
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-500">{label}</p>
        <p className="font-mono text-xs font-black text-slate-900">{hex ?? "—"}</p>
      </div>
    </div>
  );
}

/**
 * F5(v1.27~): 원본과 생성 이미지를 같은 틀에 겹쳐 가운데 선을 끌어 비교한다(바나나 캔버스 Compare 참고).
 * 틀 비율은 원본을 따르고, 두 이미지 모두 잘리지 않게 틀 안에 맞춘다(object-contain).
 * v1.29: 동그라미 자리(선 위치·높이)의 원본·생성 색을 HEX와 차이(%)로 보여 주는 색 집게.
 */
export function CompareSlider({ before, after, maxHeight = 480 }: { before: string; after: string; maxHeight?: number }) {
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
    <div className="space-y-2">
      <div
        ref={box}
        className={`relative mx-auto w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 select-none touch-none ${dragging ? "cursor-grabbing" : "cursor-crosshair"}`}
        // 틀은 원본 비율 그대로, 최대 높이를 넘지 않게 폭을 줄인다(폭만 꽉 채우면 원본이 가운데에만 작게 보여 같은 자리 비교가 안 됨)
        style={size ? { aspectRatio: `${size.w} / ${size.h}`, maxWidth: `min(100%, ${Math.round((maxHeight * size.w) / size.h)}px)` } : { aspectRatio: "1 / 1", maxWidth: `min(100%, ${maxHeight}px)` }}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDragging(true); moveTo(e.clientX, e.clientY); }}
        onPointerMove={(e) => { if (dragging) moveTo(e.clientX, e.clientY); }}
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
          onKeyDown={(e) => {
            const n = percentForKey(pos, e.key, e.shiftKey);
            if (n !== null) { e.preventDefault(); setPos(n); return; }
            const y = percentForKey(posY, e.key === "ArrowUp" ? "ArrowLeft" : e.key === "ArrowDown" ? "ArrowRight" : "", e.shiftKey);
            if (y !== null) { e.preventDefault(); setPosY(y); }
          }}
          className="absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-violet-700 text-xs font-black text-white shadow-lg outline-none focus-visible:ring-4 focus-visible:ring-violet-300"
          style={{ left: `${pos}%`, top: `${posY}%` }}
        >
          ⇆
        </span>
      </div>
      {(beforePx || afterPx) && (
        <div className="mx-auto flex max-w-md flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2" aria-label="색 집게">
          <Swatch label="원본 색" rgb={a} />
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-500">색 차이</p>
            <p className="text-sm font-black text-slate-900">{a && b ? `${colorDiffPercent(a, b)}%` : "—"}</p>
          </div>
          <Swatch label="생성 색" rgb={b} />
        </div>
      )}
      <p className="text-[11px] text-slate-500">틀을 누르거나 끌면 선과 동그라미가 그 자리로 옵니다. 동그라미 자리의 원본·생성 색을 아래에서 비교하세요(키보드: ←/→ 선, ↑/↓ 높이). 「—」는 그 자리에 그림이 없는 여백입니다.</p>
    </div>
  );
}
