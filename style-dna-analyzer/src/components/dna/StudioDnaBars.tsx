"use client";

import React from "react";

interface StudioDnaBarsProps {
  dnaBars: { label: string; percent: number }[];
  reproducibility: number;
  keywords: string[];
  isDark?: boolean;
}

/**
 * 원본 스크린샷 1:1 매칭:
 * - 스타일 DNA (지표별 대문자 라벨 & 우측 퍼센트 & 사이언 네온 프로그레스 바)
 * - 아이덴티티 일치 확률 (대형 볼드 스코어 디스플레이)
 * - 추출된 키워드 (캡슐형 태그 칩)
 */
export function StudioDnaBars({ dnaBars, reproducibility, keywords, isDark = true }: StudioDnaBarsProps) {
  const cardBg = isDark ? "bg-[#0b1329]/95 border-slate-800/80 text-slate-100" : "bg-white border-slate-200 text-slate-900";
  const titleColor = isDark ? "text-cyan-400" : "text-slate-900";

  return (
    <div className="space-y-4">
      {/* 1. 스타일 DNA 카드 */}
      <div className={`rounded-xl border p-4 shadow-sm backdrop-blur-xs transition-colors ${cardBg}`}>
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-sm">🧬</span>
          <h2 className={`text-xs font-bold tracking-wide uppercase ${titleColor}`}>스타일 DNA</h2>
        </div>
        <div className="space-y-3">
          {dnaBars.map((b) => (
            <div key={b.label} className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className={`font-bold tracking-wider uppercase ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  {b.label} /
                </span>
                <span className={`font-extrabold ${isDark ? "text-cyan-400" : "text-cyan-600"}`}>{b.percent}%</span>
              </div>
              <div className={`h-1.5 w-full overflow-hidden rounded-full ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
                <div
                  className="h-full rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff] transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, b.percent))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. 아이덴티티 일치 확률 (거대 스코어 카드) */}
      <div className={`rounded-xl border p-5 text-center shadow-sm backdrop-blur-xs transition-colors ${cardBg}`}>
        <p className={`text-[11px] font-bold tracking-wider uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          아이덴티티 일치 확률
        </p>
        <div className="my-2 flex items-center justify-center">
          <span
            className={`font-mono text-4xl sm:text-5xl font-black tracking-tight ${
              isDark ? "text-white drop-shadow-[0_0_12px_rgba(0,240,255,0.4)]" : "text-slate-900"
            }`}
          >
            {reproducibility.toFixed(1)}%
          </span>
        </div>
        <p className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
          * AI 시각적 특징점 및 구조적 DNA 추출 신뢰도
        </p>
      </div>

      {/* 3. 추출된 키워드 카드 */}
      {keywords.length > 0 && (
        <div className={`rounded-xl border p-4 shadow-sm backdrop-blur-xs transition-colors ${cardBg}`}>
          <div className="flex items-center gap-1.5 mb-2.5">
            <span className="text-sm">#</span>
            <h2 className={`text-xs font-bold tracking-wide uppercase ${titleColor}`}>추출된 키워드</h2>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {keywords.map((kw) => (
              <span
                key={kw}
                className={`rounded-md px-2 py-1 text-[10.5px] font-mono font-semibold uppercase tracking-wide border transition ${
                  isDark
                    ? "bg-slate-900/90 text-slate-300 border-slate-700/70 hover:border-cyan-500/50 hover:text-cyan-300"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:border-cyan-400 hover:text-cyan-700"
                }`}
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
