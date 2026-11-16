"use client";

import { useMemo } from "react";
import type { FinderVideo } from "@/lib/youtube/boks/core";
import { formatNumber } from "@/lib/youtube/boks/core";

/**
 * 떡상 산점도 — x: 채널 평소 조회수, y: 이 영상 조회수(둘 다 로그 눈금), 1·3·10배 점선.
 * 원본 boks-youtube-finder(커밋 3aacecf, MIT) renderer.js drawScatter의 로직을 참고해 SVG로 다시 그림(2026-11-16).
 * 평소 조회수를 아는 영상(scoreBasis = baseline)만 찍는다. 점을 누르면 영상이 새 창으로 열린다.
 */
const W = 640;
const H = 360;
const PAD = { l: 52, r: 16, t: 14, b: 34 };

export function ScatterPlot({ videos }: { videos: FinderVideo[] }) {
  const pts = useMemo(() => videos.filter((v) => v.scoreBasis === "baseline" && v.channelBaseline && v.viewCount > 0), [videos]);
  if (pts.length < 3) {
    return <p className="py-10 text-center text-sm text-yt-muted">평소 조회수를 알 수 있는 영상이 3개 미만이라 산점도를 그리지 않습니다.</p>;
  }
  const xs = pts.map((v) => Math.log10(Math.max(1, v.channelBaseline as number)));
  const ys = pts.map((v) => Math.log10(Math.max(1, v.viewCount)));
  const lo = Math.floor(Math.min(...xs, ...ys));
  const hi = Math.ceil(Math.max(...xs, ...ys));
  const span = Math.max(1, hi - lo);
  const sx = (x: number) => PAD.l + ((x - lo) / span) * (W - PAD.l - PAD.r);
  const sy = (y: number) => H - PAD.b - ((y - lo) / span) * (H - PAD.t - PAD.b);
  const ticks = Array.from({ length: span + 1 }, (_, i) => lo + i);
  const guide = (mult: number) => {
    const d = Math.log10(mult);
    return { x1: sx(lo), y1: sy(lo + d), x2: sx(hi - d), y2: sy(hi) };
  };

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[320px]" role="img" aria-label="채널 평소 조회수 대비 영상 조회수 산점도">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={sx(t)} x2={sx(t)} y1={PAD.t} y2={H - PAD.b} stroke="currentColor" className="text-yt-border" strokeDasharray="2 4" />
            <line x1={PAD.l} x2={W - PAD.r} y1={sy(t)} y2={sy(t)} stroke="currentColor" className="text-yt-border" strokeDasharray="2 4" />
            <text x={sx(t)} y={H - PAD.b + 16} textAnchor="middle" className="fill-yt-muted text-[10px]">{formatNumber(10 ** t)}</text>
            <text x={PAD.l - 6} y={sy(t) + 3} textAnchor="end" className="fill-yt-muted text-[10px]">{formatNumber(10 ** t)}</text>
          </g>
        ))}
        {[1, 3, 10].map((m) => {
          const g = guide(m);
          return (
            <g key={m}>
              <line {...g} stroke={m === 1 ? "#94A3B8" : m === 3 ? "#F59E0B" : "#EF4444"} strokeDasharray="6 4" strokeWidth={1.2} />
              <text x={g.x2 - 4} y={g.y2 + 12} textAnchor="end" className="text-[10px]" fill={m === 1 ? "#94A3B8" : m === 3 ? "#F59E0B" : "#EF4444"}>{m}배</text>
            </g>
          );
        })}
        {pts.map((v, i) => {
          const hot = v.qualifies && (v.score as number) >= 3;
          return (
            <a key={v.id} href={v.url} target="_blank" rel="noopener noreferrer">
              <circle cx={sx(xs[i])} cy={sy(ys[i])} r={hot ? 5 : 3.5} fill={hot ? "#EF4444" : v.isShorts ? "#38BDF8" : "#A78BFA"} fillOpacity={0.85} stroke="#0B0F17" strokeWidth={0.8}>
                <title>{`${v.title}\n${v.channelTitle} · 조회수 ${v.viewCountFormatted} · 평소 ${v.channelBaselineFormatted} · ${v.scoreFormatted}`}</title>
              </circle>
            </a>
          );
        })}
        <text x={(W + PAD.l) / 2} y={H - 4} textAnchor="middle" className="fill-yt-muted text-[10px]">채널 평소 조회수(최근 같은 형식 영상 중앙값)</text>
      </svg>
      <p className="mt-1 text-[11px] text-yt-muted">빨간 점 = 떡상(조회수 1만↑ & 평소 대비 3배↑) · 파란 점 = 쇼츠 · 보라 점 = 롱폼 · 점선 위로 갈수록 평소보다 많이 터진 영상입니다.</p>
    </div>
  );
}
