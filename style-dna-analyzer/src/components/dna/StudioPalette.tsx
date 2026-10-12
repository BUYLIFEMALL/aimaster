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
 * - 상단 도넛 차트 (싸이클: 중앙에 "미학적" / "컬러" 2줄 라벨 및 실제 색상 stroke)
 * - 중간 5개 분할 독립 컬러 바 (실제 색상 채움)
 * - 하단 목록: 왼쪽 실제 색상 원(Circle) + HEX 코드 + 점유율(%)
 */
export function StudioPalette({ palette, dominantName = "미학적\n컬러", isDark = false }: StudioPaletteProps) {
  const R = 38;
  const C = 2 * Math.PI * R;

  // 전체 퍼센트 합계 정규화
  const totalPercent = palette.reduce((sum, c) => sum + (c.percent || 0), 0) || 100;

  const segments = palette.reduce<Array<PaletteColor & { len: number; offset: number }>>((acc, c) => {
    const prev = acc[acc.length - 1];
    const offset = prev ? prev.offset + prev.len : 0;
    const len = ((c.percent || 0) / totalPercent) * C;
    acc.push({ ...c, len, offset });
    return acc;
  }, []);

  const cardBg = isDark ? "bg-[#0b1329] border-slate-800 text-slate-100" : "bg-white border-slate-200/90 text-slate-900 shadow-xs";
  const titleColor = isDark ? "text-cyan-400" : "text-slate-900";

  const [dominantTop, dominantBottom] = dominantName.includes("\n")
    ? dominantName.split("\n")
    : ["미학적", dominantName || "컬러"];

  return (
    <div className={`rounded-xl border p-4 transition-colors ${cardBg}`}>
      {/* 카드 헤더 */}
      <div className="flex items-center gap-1.5 mb-3 border-b pb-2.5 border-slate-100">
        <span className="text-sm">🎨</span>
        <h2 className={`text-xs font-bold tracking-wide uppercase ${titleColor}`}>미학적 팔레트</h2>
      </div>

      {/* 1. SVG 도넛 차트 (싸이클) */}
      <div className="relative flex justify-center py-1">
        <svg viewBox="0 0 100 100" className="h-32 w-32 -rotate-90" role="img" aria-label="색상 팔레트 도넛 차트">
          {/* 베이스 배경 트랙 링 */}
          <circle cx="50" cy="50" r={R} fill="none" stroke={isDark ? "#1e293b" : "#f1f5f9"} strokeWidth="13" />
          {/* 실제 색상별 원호 세그먼트 (싸이클에 실제 색상 표현) */}
          {segments.map((s, idx) => (
            <circle
              key={`${s.hex}-${idx}`}
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke={s.hex}
              strokeWidth="13"
              strokeDasharray={`${s.len} ${C - s.len}`}
              strokeDashoffset={-s.offset}
              className="transition-all duration-700 ease-in-out"
            />
          ))}
        </svg>

        {/* 도넛 중앙 텍스트: "미학적" / "컬러" */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className={`text-[10px] font-mono font-bold tracking-wider opacity-60 uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {dominantTop}
          </span>
          <span className={`text-[13px] font-black font-mono tracking-tight leading-tight ${isDark ? "text-slate-100" : "text-slate-900"}`}>
            {dominantBottom}
          </span>
        </div>
      </div>

      {/* 2. 5개 분할 독립 컬러 바 (각 바에 실제 색상 표현) */}
      <div className="mt-4 grid grid-cols-5 gap-1.5 h-6">
        {palette.slice(0, 5).map((c, i) => (
          <div
            key={`bar-${c.hex}-${i}`}
            className="h-full rounded-md shadow-2xs border border-black/10 dark:border-white/10 transition-transform duration-200 hover:scale-105"
            style={{ backgroundColor: c.hex }}
            title={`${c.hex} (${c.percent}%)`}
          />
        ))}
        {/* 색상이 5개 미만일 경우 빈 자리 플레이스홀더 */}
        {Array.from({ length: Math.max(0, 5 - palette.length) }).map((_, i) => (
          <div
            key={`empty-bar-${i}`}
            className={`h-full rounded-md border border-dashed ${isDark ? "border-slate-800 bg-slate-900/30" : "border-slate-200 bg-slate-100/50"}`}
          />
        ))}
      </div>

      {/* 3. 하단 색상 목록: 왼쪽 실제 색상 원(Circle) + HEX + 점유율(%) */}
      <ul className="mt-4 space-y-2 divide-y divide-slate-100">
        {palette.map((c, i) => (
          <li key={`list-${c.hex}-${i}`} className="flex items-center justify-between pt-1.5 text-xs font-mono">
            <span className="flex items-center gap-2.5">
              {/* 왼쪽 원: 실제 색상 적용 */}
              <span
                className="h-3.5 w-3.5 rounded-full shadow-xs border border-black/15 shrink-0 transition-transform duration-150 hover:scale-125"
                style={{ backgroundColor: c.hex }}
              />
              <span className={`font-bold tracking-wider uppercase ${isDark ? "text-slate-300" : "text-slate-800"}`}>
                {c.hex.toUpperCase()}
              </span>
            </span>
            <span className={`font-black ${isDark ? "text-cyan-400" : "text-slate-900"}`}>
              {c.percent}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
