"use client";

import React from "react";
import type { AnalysisRecord } from "@/lib/dna/types";

interface StudioCameraLightingProps {
  camera?: AnalysisRecord["result"]["camera"];
  lighting?: AnalysisRecord["result"]["lighting"];
  isDark?: boolean;
}

const DEFAULT_CAMERA = {
  angle: "3/4 Quarter View",
  shotType: "Product Close-up",
  lens: "Standard/Telephoto",
  focusDistance: "85mm",
  depthOfField: "Deep (f/8 - f/11)",
};

const DEFAULT_LIGHTING = {
  timeOfDay: "Studio Setting",
  direction: "Front-Left (Key) and Right (Fill)",
  altitude: "Eye Level",
  contrast: "Medium-Low",
  shadows: "Soft and Minimal",
};

/**
 * 원본 스크린샷 1:1 매칭:
 * - 카메라 & 렌즈 정보 카드 (앵글, 샷 타입, 렌즈, 초점거리, 피사계심도)
 * - 조명 시퀀싱 정보 카드 (시간대-골드, 조명방향, 고도, 대비, 그림자)
 */
export function StudioCameraLighting({ camera, lighting, isDark = true }: StudioCameraLightingProps) {
  const cam = camera || DEFAULT_CAMERA;
  const light = lighting || DEFAULT_LIGHTING;

  const cardBg = isDark ? "bg-[#0b1329]/95 border-slate-800/80 text-slate-100" : "bg-white border-slate-200 text-slate-900";
  const titleColor = isDark ? "text-cyan-400" : "text-slate-900";
  const labelColor = isDark ? "text-slate-400" : "text-slate-500";
  const valueColor = isDark ? "text-slate-100" : "text-slate-900";

  return (
    <div className="space-y-4">
      {/* 1. 카메라 & 렌즈 */}
      <div className={`rounded-xl border p-4 shadow-sm backdrop-blur-xs transition-colors ${cardBg}`}>
        <div className="flex items-center gap-1.5 mb-2.5">
          <span className="text-sm">📷</span>
          <h2 className={`text-xs font-bold tracking-wide uppercase ${titleColor}`}>카메라 & 렌즈</h2>
        </div>
        <dl className="space-y-2 text-xs">
          <div>
            <dt className={`text-[10.5px] font-medium ${labelColor}`}>앵글</dt>
            <dd className={`font-semibold font-mono ${valueColor}`}>{cam.angle || "—"}</dd>
          </div>
          <div>
            <dt className={`text-[10.5px] font-medium ${labelColor}`}>샷 타입</dt>
            <dd className={`font-semibold font-mono ${valueColor}`}>{cam.shotType || "—"}</dd>
          </div>
          <div>
            <dt className={`text-[10.5px] font-medium ${labelColor}`}>렌즈</dt>
            <dd className={`font-semibold font-mono ${valueColor}`}>{cam.lens || "—"}</dd>
          </div>
          <div>
            <dt className={`text-[10.5px] font-medium ${labelColor}`}>초점 거리</dt>
            <dd className={`font-semibold font-mono ${valueColor}`}>{cam.focusDistance || "—"}</dd>
          </div>
          <div>
            <dt className={`text-[10.5px] font-medium ${labelColor}`}>피사계 심도</dt>
            <dd className={`font-semibold font-mono ${valueColor}`}>{cam.depthOfField || "—"}</dd>
          </div>
        </dl>
      </div>

      {/* 2. 조명 시퀀싱 */}
      <div className={`rounded-xl border p-4 shadow-sm backdrop-blur-xs transition-colors ${cardBg}`}>
        <div className="flex items-center gap-1.5 mb-2.5">
          <span className="text-sm">🔆</span>
          <h2 className={`text-xs font-bold tracking-wide uppercase ${titleColor}`}>조명 시퀀싱</h2>
        </div>
        <dl className="space-y-2 text-xs">
          <div>
            <dt className={`text-[10.5px] font-medium ${labelColor}`}>시간대</dt>
            <dd className={`font-semibold font-mono ${isDark ? "text-amber-400" : "text-amber-600"}`}>
              {light.timeOfDay || "—"}
            </dd>
          </div>
          <div>
            <dt className={`text-[10.5px] font-medium ${labelColor}`}>조명 방향</dt>
            <dd className={`font-semibold font-mono ${valueColor}`}>{light.direction || "—"}</dd>
          </div>
          <div>
            <dt className={`text-[10.5px] font-medium ${labelColor}`}>고도</dt>
            <dd className={`font-semibold font-mono ${valueColor}`}>{light.altitude || "—"}</dd>
          </div>
          <div>
            <dt className={`text-[10.5px] font-medium ${labelColor}`}>대비</dt>
            <dd className={`font-semibold font-mono ${valueColor}`}>{light.contrast || "—"}</dd>
          </div>
          <div>
            <dt className={`text-[10.5px] font-medium ${labelColor}`}>그림자</dt>
            <dd className={`font-semibold font-mono ${valueColor}`}>{light.shadows || "—"}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
