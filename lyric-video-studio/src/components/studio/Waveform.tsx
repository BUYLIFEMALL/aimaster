"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStudio } from "./StudioContext";
import { usePlayhead } from "./parts";
import { formatTime, isSynced, moveStart } from "@/lib/lyrics";

// 가사 싱크 화면의 파형 — 줄 구간(강조색)과 시작 표시를 겹쳐 그린다.
// 시작 표시를 끌면 그 줄 시작이 옮겨지고(앞뒤 줄을 넘지 않음), 빈 곳을 누르면 그 위치로 이동한다.
const BUCKETS = 4000, HEIGHT = 96, GRAB = 8, ZOOM_SPAN = 20;

export function Waveform() {
  const s = useStudio();
  const { t, playing } = usePlayhead();
  const wrap = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(800), [zoom, setZoom] = useState(false), [drag, setDrag] = useState<number | null>(null);
  const viewStart = useRef(0);
  const dur = s.audio?.buffer.duration ?? 0;

  const peaks = useMemo(() => { // 곡을 BUCKETS 구간으로 나눠 구간마다 가장 큰 소리
    const mono = s.audio?.source.mono; if (!mono) return null;
    const out = new Float32Array(BUCKETS), step = mono.length / BUCKETS;
    for (let b = 0; b < BUCKETS; b++) { let m = 0; const end = Math.min(mono.length, Math.floor((b + 1) * step)); for (let i = Math.floor(b * step); i < end; i += 4) { const v = Math.abs(mono[i]); if (v > m) m = v; } out[b] = m; }
    return out;
  }, [s.audio]);

  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(200, Math.floor(e.contentRect.width))));
    ro.observe(el); return () => ro.disconnect();
  }, []);

  // 보이는 범위: 전체 또는 재생 위치 주변 20초(끄는 동안에는 고정)
  const span = zoom ? Math.min(ZOOM_SPAN, dur || ZOOM_SPAN) : dur || 1;
  if (drag === null) viewStart.current = zoom ? Math.max(0, Math.min(dur - span, t - span * 0.25)) : 0;
  const v0 = viewStart.current;
  const toX = (sec: number) => ((sec - v0) / span) * width;
  const toT = (x: number) => Math.max(0, Math.min(dur, v0 + (x / width) * span));

  useEffect(() => {
    const c = canvas.current; if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = width * dpr; c.height = HEIGHT * dpr;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const css = getComputedStyle(c);
    const fg = css.getPropertyValue("--muted").trim() || "#94a3b8", brand = css.getPropertyValue("--brand").trim() || "#a78bfa";
    ctx.clearRect(0, 0, width, HEIGHT);
    // 줄 구간
    s.lines.forEach((l, i) => {
      if (!isSynced(l)) return;
      const x0 = toX(l.start), x1 = toX(l.end > l.start ? l.end : l.start + 0.5);
      if (x1 < 0 || x0 > width) return;
      ctx.fillStyle = brand; ctx.globalAlpha = i % 2 ? 0.16 : 0.26; ctx.fillRect(x0, 0, Math.max(2, x1 - x0), HEIGHT);
    });
    ctx.globalAlpha = 1;
    // 파형
    if (peaks && dur > 0) {
      ctx.fillStyle = fg;
      for (let x = 0; x < width; x++) {
        const b0 = Math.floor((toT(x) / dur) * BUCKETS), b1 = Math.max(b0 + 1, Math.floor((toT(x + 1) / dur) * BUCKETS));
        let m = 0; for (let b = b0; b < b1 && b < BUCKETS; b++) if (peaks[b] > m) m = peaks[b];
        const h = Math.max(1, m * (HEIGHT - 20));
        ctx.fillRect(x, (HEIGHT - h) / 2, 1, h);
      }
    }
    // 줄 시작 표시 + 번호
    ctx.font = "700 10px sans-serif"; ctx.textBaseline = "top";
    s.lines.forEach((l, i) => {
      if (!isSynced(l)) return;
      const x = toX(l.start); if (x < -20 || x > width + 20) return;
      ctx.fillStyle = drag === i ? "#facc15" : brand; ctx.fillRect(x - 1, 0, 2, HEIGHT);
      ctx.fillRect(x - 1, 0, 16, 13); ctx.fillStyle = "#fff"; ctx.fillText(String(i + 1), x + 2, 2);
    });
    // 재생 위치
    const px = toX(t); ctx.fillStyle = "#f43f5e"; ctx.fillRect(px - 1, 0, 2, HEIGHT);
  });

  if (!s.audio) return null;

  function nearest(x: number): number | null {
    let best: number | null = null, bd = GRAB;
    s.lines.forEach((l, i) => { if (!isSynced(l)) return; const d = Math.abs(toX(l.start) - x); if (d <= bd) { bd = d; best = i; } });
    return best;
  }
  const xOf = (e: React.PointerEvent) => e.clientX - (e.currentTarget as HTMLElement).getBoundingClientRect().left;

  return (
    <div className="waveform">
      <div className="row" style={{ justifyContent: "space-between", fontSize: 11 }}>
        <span className="muted">파형 — 번호 표시를 끌면 그 줄의 시작이 옮겨집니다. 빈 곳을 누르면 그 위치로 갑니다.</span>
        <span className="chips">
          <button type="button" className={`chip ${!zoom ? "on" : ""}`} onClick={() => setZoom(false)}>곡 전체</button>
          <button type="button" className={`chip ${zoom ? "on" : ""}`} onClick={() => setZoom(true)}>{ZOOM_SPAN}초 확대</button>
        </span>
      </div>
      <div ref={wrap} className="waveform-box">
        <canvas
          ref={canvas} style={{ width: "100%", height: HEIGHT, cursor: drag !== null ? "grabbing" : "pointer", touchAction: "none" }}
          role="slider" aria-label="파형에서 재생 위치·줄 시작 조정" aria-valuemin={0} aria-valuemax={Math.round(dur)} aria-valuenow={Math.round(t)} aria-valuetext={formatTime(t)}
          onPointerDown={(e) => {
            const x = xOf(e), i = nearest(x);
            if (i !== null) { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); setDrag(i); if (playing) s.player?.pause(); return; }
            if (s.player) s.player.currentTime = toT(x);
          }}
          onPointerMove={(e) => { if (drag !== null) { const nt = toT(xOf(e)); s.setLines((prev) => moveStart(prev, drag, nt)); } }}
          onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)}
          onMouseMove={(e) => { if (drag === null) (e.currentTarget as HTMLElement).style.cursor = nearest(e.nativeEvent.offsetX) !== null ? "ew-resize" : "pointer"; }}
        />
      </div>
    </div>
  );
}
