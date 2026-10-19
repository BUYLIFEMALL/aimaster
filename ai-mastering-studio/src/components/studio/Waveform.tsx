"use client";

import { useCallback, useEffect, useRef } from "react";

/** 오디오 버퍼의 파형(최대·최소 엔벨로프)을 캔버스에 그린다 */
export function Waveform({ buffer, color }: { buffer: AudioBuffer | null; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = ref.current;
    if (!canvas || !buffer) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const data = buffer.getChannelData(0);
    const step = Math.max(1, Math.floor(data.length / w));
    const mid = h / 2;
    ctx.fillStyle = color;
    for (let x = 0; x < w; x++) {
      let min = 1;
      let max = -1;
      const start = x * step;
      const end = Math.min(start + step, data.length);
      for (let i = start; i < end; i++) {
        const v = data[i];
        if (v < min) min = v;
        if (v > max) max = v;
      }
      if (min > max) { min = 0; max = 0; }
      const top = mid - max * mid;
      const bottom = mid - min * mid;
      ctx.fillRect(x, top, 1, Math.max(1, bottom - top));
    }
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(0, mid, w, 1);
  }, [buffer, color]);

  useEffect(() => {
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [draw]);

  return <canvas ref={ref} className="block h-28 w-full rounded-lg bg-[#070b13] border border-[#1e293b]" aria-label="파형" />;
}
