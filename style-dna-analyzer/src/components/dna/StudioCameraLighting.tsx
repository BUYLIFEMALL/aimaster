"use client";

import React from "react";
import type { AnalysisRecord } from "@/lib/dna/types";

interface StudioCameraLightingProps {
  camera?: AnalysisRecord["result"]["camera"];
  lighting?: AnalysisRecord["result"]["lighting"];
  isDark?: boolean;
  isAnalyzing?: boolean;
}

/**
 * 원본 스크린샷 1:1 매칭:
 * - 카메라 & 렌즈 정보 카드 (앵글, 샷 타입, 렌즈, 초점거리, 피사계심도)
 * - 조명 시퀀싱 정보 카드 (시간대-골드, 조명방향, 고도, 대비, 그림자)
 * - 분석 전/중일 때는 스크린샷과 동일하게 "---" 표시
 */
export function StudioCameraLighting({ camera, lighting, isDark = false, isAnalyzing = false }: StudioCameraLightingProps) {
  const showEmpty = isAnalyzing || !camera;
  const cam = showEmpty
    ? { angle: "---", shotType: "---", lens: "---", focusDistance: "---", depthOfField: "---" }
    : camera;
  const light = isAnalyzing || !lighting
    ? { timeOfDay: "---", direction: "---", altitude: "---", contrast: "---", shadows: "---" }
    : lighting;

  const cardBg = isDark ? "bg-[#0b1329] border-slate-800 text-slate-100" : "bg-white border-slate-200/90 text-slate-900 shadow-xs";
  const titleColor = isDark ? "text-cyan-400" : "text-slate-900";
  const labelColor = isDark ? "text-slate-400" : "text-slate-500";
  const valueColor = isDark ? "text-slate-100" : "text-slate-900";
  const rowBorder = isDark ? "border-slate-800/60" : "border-slate-100";

  return (
    <div className="space-y-4">
      {/* 1. 카메라 & 렌즈 */}
      <div className={`rounded-xl border p-4 transition-colors ${cardBg}`}>
        <div className="flex items-center gap-1.5 mb-3 border-b pb-2.5 border-slate-100">
          <span className="text-sm">📷</span>
          <h2 className={`text-xs font-bold tracking-wide uppercase ${titleColor}`}>카메라 & 렌즈</h2>
        </div>
        <dl className={`divide-y ${rowBorder} text-xs`}>
          <div className="py-1.5 flex items-center justify-between gap-2">
            <dt className={`text-[11px] font-medium shrink-0 ${labelColor}`}>앵글</dt>
            <dd className={`font-semibold font-mono text-right truncate ${valueColor}`}>{cam.angle || "—"}</dd>
          </div>
          <div className="py-1.5 flex items-center justify-between gap-2">
            <dt className={`text-[11px] font-medium shrink-0 ${labelColor}`}>샷 타입</dt>
            <dd className={`font-semibold font-mono text-right truncate ${valueColor}`}>{cam.shotType || "—"}</dd>
          </div>
          <div className="py-1.5 flex items-center justify-between gap-2">
            <dt className={`text-[11px] font-medium shrink-0 ${labelColor}`}>렌즈</dt>
            <dd className={`font-semibold font-mono text-right truncate ${valueColor}`}>{cam.lens || "—"}</dd>
          </div>
          <div className="py-1.5 flex items-center justify-between gap-2">
            <dt className={`text-[11px] font-medium shrink-0 ${labelColor}`}>초점 거리</dt>
            <dd className={`font-semibold font-mono text-right truncate ${valueColor}`}>{cam.focusDistance || "—"}</dd>
          </div>
          <div className="py-1.5 flex items-center justify-between gap-2">
            <dt className={`text-[11px] font-medium shrink-0 ${labelColor}`}>피사계 심도</dt>
            <dd className={`font-semibold font-mono text-right truncate ${valueColor}`}>{cam.depthOfField || "—"}</dd>
          </div>
        </dl>
      </div>

      {/* 2. 조명 시퀀싱 */}
      <div className={`rounded-xl border p-4 transition-colors ${cardBg}`}>
        <div className="flex items-center gap-1.5 mb-3 border-b pb-2.5 border-slate-100">
          <span className="text-sm">🔆</span>
          <h2 className={`text-xs font-bold tracking-wide uppercase ${titleColor}`}>조명 환경 분석</h2>
        </div>
        <dl className={`divide-y ${rowBorder} text-xs`}>
          <div className="py-1.5 flex items-center justify-between gap-2">
            <dt className={`text-[11px] font-medium shrink-0 ${labelColor}`}>시간대</dt>
            <dd className="font-semibold font-mono text-right truncate text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              {light.timeOfDay || "—"}
            </dd>
          </div>
          <div className="py-1.5 flex items-center justify-between gap-2">
            <dt className={`text-[11px] font-medium shrink-0 ${labelColor}`}>조명 방향</dt>
            <dd className={`font-semibold font-mono text-right truncate ${valueColor}`}>{light.direction || "—"}</dd>
          </div>
          <div className="py-1.5 flex items-center justify-between gap-2">
            <dt className={`text-[11px] font-medium shrink-0 ${labelColor}`}>고도</dt>
            <dd className={`font-semibold font-mono text-right truncate ${valueColor}`}>{light.altitude || "—"}</dd>
          </div>
          <div className="py-1.5 flex items-center justify-between gap-2">
            <dt className={`text-[11px] font-medium shrink-0 ${labelColor}`}>대비</dt>
            <dd className={`font-semibold font-mono text-right truncate ${valueColor}`}>{light.contrast || "—"}</dd>
          </div>
          <div className="py-1.5 flex items-center justify-between gap-2">
            <dt className={`text-[11px] font-medium shrink-0 ${labelColor}`}>그림자</dt>
            <dd className={`font-semibold font-mono text-right truncate ${valueColor}`}>{light.shadows || "—"}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
