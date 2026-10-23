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
export function StudioPalette({ palette, isDark = false }: StudioPaletteProps) {
  const R = 12;
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

  return (
    <div className={`rounded-xl border p-4 transition-colors ${cardBg}`}>
      {/* 카드 헤더 */}
      <div className="flex items-center gap-1.5 mb-3 border-b pb-2.5 border-slate-100">
        <span className="text-sm">🎨</span>
        <h2 className={`text-xs font-bold tracking-wide uppercase ${titleColor}`}>미학적 팔레트</h2>
      </div>

      {/* 1. SVG 도넛 차트 (써클: 분석된 색상으로 빈틈없이 꽉 채움) */}
      <div className="relative flex justify-center py-1">
        <div className="relative h-36 w-36">
          <svg viewBox="0 0 32 32" className="h-full w-full -rotate-90" role="img" aria-label="색상 팔레트 도넛 차트">
            {/* 베이스 트랙 배경 링 */}
            <circle
              cx="16"
              cy="16"
              r={R}
              fill="none"
              stroke={isDark ? "#1e293b" : "#e2e8f0"}
              strokeWidth="4.8"
            />
            {/* 실제 분석된 색상별 원호 세그먼트 */}
            {segments.map((s, idx) => (
              <circle
                key={`${s.hex}-${idx}`}
                cx="16"
                cy="16"
                r={R}
                fill="none"
                stroke={s.hex}
                strokeWidth="4.8"
                strokeDasharray={`${s.len} ${C}`}
                strokeDashoffset={-s.offset}
                className="transition-all duration-700 ease-in-out"
              />
            ))}
          </svg>

          {/* 도넛 중앙 텍스트: 상단 '미학적' / 하단 '컬러' 고정 표기 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className={`text-[10px] font-mono font-bold tracking-widest opacity-60 uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              미학적
            </span>
            <span className={`text-[14px] font-black font-mono tracking-tight leading-tight ${isDark ? "text-slate-100" : "text-slate-900"}`}>
              컬러
            </span>
          </div>
        </div>
      </div>

      {/* 2. 상단 색상 바 (점선 빈 박스 없이 분석된 모든 색상으로 100% 꽉 채운 분할 바) */}
      <div
        className="mt-4 grid gap-1.5 h-6"
        style={{ gridTemplateColumns: `repeat(${Math.max(1, palette.length)}, minmax(0, 1fr))` }}
      >
        {palette.map((c, i) => (
          <div
            key={`bar-${c.hex}-${i}`}
            className="h-full rounded-md shadow-2xs border border-black/10 dark:border-white/10 transition-transform duration-200 hover:scale-105"
            style={{
              backgroundColor: c.hex,
              boxShadow: "0 1px 2px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(0,0,0,0.08)",
            }}
            title={`${c.hex} (${c.percent}%)`}
          />
        ))}
      </div>

      {/* 3. 하단 색상 목록: 왼쪽 실제 색상 원(Circle) + HEX + 점유율(%) */}
      <ul className="mt-4 space-y-2 divide-y divide-slate-100">
        {palette.map((c, i) => (
          <li key={`list-${c.hex}-${i}`} className="flex items-center justify-between pt-1.5 text-xs font-mono">
            <span className="flex items-center gap-2.5">
              {/* 왼쪽 원: 해당 색상이 꽉 채워진 원형 컬러 스와치 (흰색도 입체 링으로 확실히 채워짐) */}
              <span
                className="relative flex h-4 w-4 items-center justify-center rounded-full shrink-0 shadow-xs transition-transform duration-150 hover:scale-125"
                style={{
                  backgroundColor: c.hex,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.22), inset 0 0 0 1px rgba(0,0,0,0.14)",
                }}
                title={c.hex}
              >
                <span className="absolute inset-0 rounded-full border border-black/15 dark:border-white/20 pointer-events-none" />
              </span>
              <span className={`font-bold tracking-wider uppercase ${isDark ? "text-slate-300" : "text-slate-800"}`}>
                {c.hex.toUpperCase()}
              </span>
            </span>
            <span className={`font-black ${isDark ? "text-cyan-400" : "text-cyan-700"}`}>
              {c.percent}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
