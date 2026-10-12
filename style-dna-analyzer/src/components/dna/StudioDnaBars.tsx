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
export function StudioDnaBars({ dnaBars, reproducibility, keywords, isDark = false }: StudioDnaBarsProps) {
  const cardBg = isDark ? "bg-[#0b1329] border-slate-800 text-slate-100" : "bg-white border-slate-200/90 text-slate-900 shadow-xs";
  const titleColor = isDark ? "text-cyan-400" : "text-slate-900";

  return (
    <div className="space-y-4">
      {/* 1. 스타일 DNA 카드 */}
      <div className={`rounded-xl border p-4 transition-colors ${cardBg}`}>
        <div className="flex items-center gap-1.5 mb-3 border-b pb-2.5 border-slate-100">
          <span className="text-sm">🧬</span>
          <h2 className={`text-xs font-bold tracking-wide uppercase ${titleColor}`}>스타일 핵심 요소</h2>
        </div>
        <div className="space-y-3">
          {dnaBars.map((b) => (
            <div key={b.label} className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className={`font-bold tracking-wider uppercase ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  {b.label} /
                </span>
                <span className={`font-extrabold ${isDark ? "text-cyan-400" : "text-cyan-700"}`}>{b.percent}%</span>
              </div>
              <div className={`h-2 w-full overflow-hidden rounded-full ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
                <div
                  className="h-full rounded-full bg-cyan-600 transition-all duration-500 shadow-2xs"
                  style={{ width: `${Math.min(100, Math.max(0, b.percent))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. 스타일 일치율 (대형 스코어 카드) */}
      <div className={`rounded-xl border p-5 text-center transition-colors ${cardBg}`}>
        <p className={`text-xs font-bold tracking-wider uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          스타일 일치율
        </p>
        <div className="my-2.5 flex items-center justify-center">
          <span
            className={`font-mono text-4xl sm:text-5xl font-black tracking-tight ${
              isDark ? "text-white drop-shadow-[0_0_12px_rgba(0,240,255,0.4)]" : "text-slate-900"
            }`}
          >
            {reproducibility.toFixed(1)}%
          </span>
        </div>
        <p className={`text-[11px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>
          * AI 시각적 특징 및 스타일 추출 정밀도
        </p>
      </div>

      {/* 3. 추출된 키워드 카드 */}
      {keywords.length > 0 && (
        <div className={`rounded-xl border p-4 transition-colors ${cardBg}`}>
          <div className="flex items-center gap-1.5 mb-3 border-b pb-2.5 border-slate-100">
            <span className="text-sm">#</span>
            <h2 className={`text-xs font-bold tracking-wide uppercase ${titleColor}`}>추출된 키워드</h2>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {keywords.map((kw) => (
              <span
                key={kw}
                className={`rounded-md px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wide border transition ${
                  isDark
                    ? "bg-slate-900 text-slate-300 border-slate-700 hover:border-cyan-500 hover:text-cyan-300"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:border-cyan-500 hover:bg-cyan-50 hover:text-cyan-800"
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
