"use client";

import React from "react";
import type { AnalysisRecord, Fact } from "@/lib/dna/types";
import { CopyButton } from "./ui";

interface StudioReportViewProps {
  record: AnalysisRecord;
  isDark?: boolean;
}

function SectionContent({ html, fallback }: { html?: string; fallback: Fact[] }) {
  if (html) {
    return (
      <div
        className="text-xs leading-relaxed space-y-1.5 [&_ul]:space-y-1 [&_li]:flex [&_li]:items-start [&_li]:gap-1.5 [&_strong]:font-bold [&_b]:font-bold"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return (
    <ul className="space-y-1 text-xs">
      {fallback.map((f, i) => (
        <li key={i} className="flex items-start gap-1.5">
          <span className="text-cyan-400 select-none">•</span>
          <div>
            {f.label && <strong className="font-bold mr-1">{f.label}:</strong>}
            <span>{f.text}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * 원본 스크린샷 1:1 매칭:
 * - EN/KR 볼드 이탤릭 타이틀
 * - 구조적 청사진 (↗)
 * - 스타일 분석 (ⓘ)
 * - 프로의 활용 팁 (⚡)
 * - 마스터 프롬프트 (EN) & (KO)
 */
export function StudioReportView({ record, isDark = false }: StudioReportViewProps) {
  const r = record.result;

  const cardBg = isDark ? "bg-[#0b1329] border-slate-800 text-slate-100" : "bg-white border-slate-200/90 text-slate-900 shadow-xs";
  const innerBoxBg = isDark ? "bg-[#080d1e]/80 border-slate-800/60" : "bg-slate-50/70 border-slate-200/90";
  const promptBoxBg = "bg-slate-950 border-slate-800 text-slate-100";

  return (
    <div className={`rounded-xl border p-5 transition-colors space-y-5 ${cardBg}`}>
      {/* 1. 볼드 타이틀 영역 */}
      <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
        <span className="text-2xl mt-0.5 text-cyan-600">📄</span>
        <div className="min-w-0 flex-1">
          <h1
            className={`text-lg sm:text-xl font-black italic tracking-wide uppercase ${
              isDark ? "text-cyan-400" : "text-cyan-700"
            }`}
          >
            EN: {r.symbolicTitle || r.titleEn || record.title}
          </h1>
          <h2 className={`text-base sm:text-lg font-bold italic tracking-normal mt-0.5 ${isDark ? "text-slate-200" : "text-slate-900"}`}>
            KR: {r.titleKo || record.title}
          </h2>
        </div>
      </div>

      {/* 2. 구조적 청사진 */}
      <div className={`rounded-xl border p-4 space-y-2 ${innerBoxBg}`}>
        <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-700 uppercase tracking-wide">
          <span>↗</span>
          <span>구조적 청사진</span>
        </div>
        <div className={isDark ? "text-slate-200" : "text-slate-800"}>
          <SectionContent html={r.structuralBlueprintHtml} fallback={r.structure} />
        </div>
      </div>

      {/* 3. 스타일 분석 */}
      <div className={`rounded-xl border p-4 space-y-2 ${innerBoxBg}`}>
        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 uppercase tracking-wide">
          <span>ⓘ</span>
          <span>스타일 분석</span>
        </div>
        <div className={isDark ? "text-slate-200" : "text-slate-800"}>
          <SectionContent html={r.styleAnalysisHtml} fallback={r.style} />
        </div>
      </div>

      {/* 4. 프로의 활용 팁 */}
      <div className={`rounded-xl border p-4 space-y-2 ${isDark ? innerBoxBg : "bg-amber-50/40 border-amber-200/70"}`}>
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 uppercase tracking-wide">
          <span>⚡</span>
          <span>프로의 활용 팁</span>
        </div>
        <div className={isDark ? "text-slate-200" : "text-slate-800"}>
          <SectionContent html={r.usageTipsHtml} fallback={r.tips} />
        </div>
      </div>

      {/* 5. 마스터 프롬프트 (EN) */}
      <div className={`rounded-xl border overflow-hidden shadow-xs ${promptBoxBg}`}>
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800 bg-black/40">
          <span className="text-xs font-mono font-bold tracking-wider text-cyan-400 uppercase">
            마스터 프롬프트 (EN)
          </span>
          <CopyButton text={r.masterPromptEn} />
        </div>
        <p className="p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap select-all text-slate-200">
          {r.masterPromptEn}
        </p>
      </div>

      {/* 6. 마스터 프롬프트 (KO) */}
      <div className={`rounded-xl border overflow-hidden shadow-xs ${promptBoxBg}`}>
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800 bg-black/40">
          <span className="text-xs font-mono font-bold tracking-wider text-cyan-400 uppercase">
            마스터 프롬프트 (KO)
          </span>
          <CopyButton text={r.masterPromptKo} />
        </div>
        <p className="p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap select-all text-slate-200">
          {r.masterPromptKo}
        </p>
      </div>
    </div>
  );
}
