"use client";

import React from "react";
import type { PaletteColor } from "@/lib/dna/types";

interface StudioPaletteProps {
  palette: PaletteColor[];
  dominantName?: string;
  isDark?: boolean;
}

/**
 * 원본 스크린샷 1:1 매칭: 미학적 팔레트 카드
 * - 상단 도넛 차트 (중앙에 "미학적 팔레트" 또는 대표 톤 라벨)
 * - 중간 5색 수평 컬러 바
 * - 하단 각 색상 HEX 및 점유율 (%)
 */
export function StudioPalette({ palette, dominantName = "미학적\n톤", isDark = true }: StudioPaletteProps) {
  const R = 38;
  const C = 2 * Math.PI * R;

  const segments = palette.reduce<Array<PaletteColor & { len: number; offset: number }>>((acc, c) => {
    const prev = acc[acc.length - 1];
    const offset = prev ? prev.offset + prev.len : 0;
    const len = (c.percent / 100) * C;
    acc.push({ ...c, len, offset });
    return acc;
  }, []);

  const cardBg = isDark ? "bg-[#0b1329]/95 border-slate-800/80 text-slate-100" : "bg-white border-slate-200 text-slate-900";
  const titleColor = isDark ? "text-cyan-400" : "text-slate-900";

  return (
    <div className={`rounded-xl border p-4 shadow-sm backdrop-blur-xs transition-colors ${cardBg}`}>
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-sm">🎨</span>
        <h2 className={`text-xs font-bold tracking-wide uppercase ${titleColor}`}>미학적 팔레트</h2>
      </div>

      {/* SVG 도넛 차트 */}
      <div className="relative flex justify-center py-1">
        <svg viewBox="0 0 100 100" className="h-32 w-32 -rotate-90" role="img" aria-label="색상 팔레트 도넛 차트">
          <circle cx="50" cy="50" r={R} fill="none" stroke={isDark ? "#1e293b" : "#f1f5f9"} strokeWidth="14" />
          {segments.map((s) => (
            <circle
              key={s.hex}
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke={s.hex}
              strokeWidth="14"
              strokeDasharray={`${s.len} ${C - s.len}`}
              strokeDashoffset={-s.offset}
            />
          ))}
        </svg>
        {/* 도넛 중앙 라벨 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className={`text-[10px] font-bold leading-tight ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            {dominantName}
          </span>
        </div>
      </div>

      {/* 5색 수평 컬러 바 */}
      <div className="mt-2.5 flex h-4 overflow-hidden rounded-md border border-slate-700/40 shadow-2xs">
        {palette.map((c) => (
          <div key={c.hex} style={{ background: c.hex, width: `${c.percent}%` }} title={`${c.hex} (${c.percent}%)`} />
        ))}
      </div>

      {/* 각 색상 HEX 및 점유율 (%) */}
      <ul className="mt-3 divide-y divide-slate-800/40">
        {palette.map((c) => (
          <li key={c.hex} className="flex items-center justify-between py-1.5 text-[11.5px]">
            <span className="flex items-center gap-2 font-mono">
              <span className="h-3 w-3 rounded-full border border-slate-600/60 shrink-0" style={{ background: c.hex }} />
              <span className={isDark ? "text-slate-300" : "text-slate-700"}>{c.hex.toUpperCase()}</span>
            </span>
            <span className={`font-bold font-mono ${isDark ? "text-cyan-300" : "text-slate-900"}`}>{c.percent}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
