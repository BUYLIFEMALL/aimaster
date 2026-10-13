"use client";
import { useEffect, useRef } from "react";
import type { VisualizerMode } from "@/lib/player/types";

interface Props { analyser: AnalyserNode | null; mode: VisualizerMode; active: boolean }

/** 5가지 시각화. wave/line은 시간축 파형·스펙트럼 곡선으로 구분해 그린다 */
export function Visualizer({ analyser, mode, active }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const freq = new Uint8Array(analyser ? analyser.frequencyBinCount : 1024);
    const time = new Uint8Array(analyser ? analyser.fftSize : 2048);

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.floor(parent.clientWidth * dpr));
      canvas.height = Math.max(1, Math.floor(parent.clientHeight * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      if (analyser && active) {
        analyser.getByteFrequencyData(freq);
        analyser.getByteTimeDomainData(time);
      } else {
        freq.fill(0);
        time.fill(128);
      }
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, "#fde047");
      grad.addColorStop(0.25, "#f97316");
      grad.addColorStop(0.5, "#ec4899");
      grad.addColorStop(0.75, "#8b5cf6");
      grad.addColorStop(1, "#22d3ee");
      ctx.fillStyle = grad;
      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.max(2, h / 150);
      const usable = Math.floor(freq.length * 0.75); // 높은 대역은 대부분 비어 있어 잘라낸다

      if (mode === "bars") {
        const bars = 64;
        const bw = w / bars;
        for (let i = 0; i < bars; i += 1) {
          const v = freq[Math.floor((i / bars) * usable)] / 255;
          const bh = Math.max(2, v * h * 0.95);
          ctx.fillRect(i * bw + bw * 0.12, h - bh, bw * 0.76, bh);
        }
      } else if (mode === "circle") {
        const cx = w / 2, cy = h / 2;
        const r = Math.min(w, h) * 0.22;
        const n = 120;
        for (let i = 0; i < n; i += 1) {
          const a = (i / n) * Math.PI * 2 - Math.PI / 2;
          const v = freq[Math.floor((i / n) * usable)] / 255;
          const len = r * 0.15 + v * r * 1.1;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
          ctx.lineTo(cx + Math.cos(a) * (r + len), cy + Math.sin(a) * (r + len));
          ctx.stroke();
        }
      } else if (mode === "dots") {
        const cols = 32, rows = 14;
        const sx = w / cols, sy = h / rows;
        for (let i = 0; i < cols; i += 1) {
          const v = freq[Math.floor((i / cols) * usable)] / 255;
          const lit = Math.round(v * rows);
          for (let j = 0; j < rows; j += 1) {
            const on = j < lit;
            ctx.globalAlpha = on ? 1 : 0.12;
            ctx.beginPath();
            ctx.arc(i * sx + sx / 2, h - (j * sy + sy / 2), Math.min(sx, sy) * 0.32, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      } else if (mode === "wave") {
        // 시간축 파형(오실로스코프)
        ctx.beginPath();
        for (let i = 0; i < time.length; i += 1) {
          const x = (i / (time.length - 1)) * w;
          const y = (time[i] / 255) * h;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else {
        // line: 스펙트럼 곡선(아래를 채움)
        const n = 128;
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let i = 0; i < n; i += 1) {
          const v = freq[Math.floor((i / n) * usable)] / 255;
          ctx.lineTo((i / (n - 1)) * w, h - v * h * 0.9);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.globalAlpha = 0.35;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        for (let i = 0; i < n; i += 1) {
          const v = freq[Math.floor((i / n) * usable)] / 255;
          const x = (i / (n - 1)) * w;
          const y = h - v * h * 0.9;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    };
    draw();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [analyser, mode, active]);

  return <canvas ref={ref} className="mp-canvas" aria-label="오디오 시각화" role="img" />;
}
