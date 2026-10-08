"use client";

import { useState } from "react";
import { AlertCircle, Calendar, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import { RETENTION_DAYS } from "@/lib/retention";

interface Props {
  compact?: boolean;
  className?: string;
}

export default function ContentRetentionNotice({ compact = false, className = "" }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (compact) {
    return (
      <div
        className={`rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 shadow-2xs flex items-center justify-between gap-3 ${className}`}
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-amber-700 shrink-0" />
          <p className="leading-relaxed">
            <span className="font-bold">🗓️ 생성 콘텐츠 보관 기간 안내:</span> 글감, 본문 원고, 생성 이미지는 생성일로부터{" "}
            <span className="font-extrabold underline">{RETENTION_DAYS}일 동안만 안전하게 보관</span>되며 이후 자동 삭제됩니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[11px] font-bold text-amber-800 hover:text-amber-950 flex items-center gap-0.5 shrink-0 underline cursor-pointer"
        >
          <span>{isExpanded ? "접기" : "세부 안내"}</span>
          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>
    );
  }

  return (
    <section className={`rounded-2xl border border-amber-200 bg-amber-50/90 p-4 sm:p-5 text-amber-900 shadow-2xs ${className}`}>
      <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-200 text-amber-900 text-xs font-bold">
            <Calendar size={13} />
          </span>
          <h3 className="text-xs sm:text-sm font-bold text-amber-950">
            생성 콘텐츠 보관 기간 안내 ({RETENTION_DAYS}일 자동 삭제 정책)
          </h3>
        </div>
        <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900">
          데이터 누적 방지 정책
        </span>
      </div>

      <div className="mt-3 space-y-2 text-xs leading-relaxed text-amber-900">
        <p className="flex items-start gap-1.5">
          <span className="text-amber-700 font-bold shrink-0">1.</span>
          <span>
            이 프로그램에서 생성된 모든 콘텐츠(<strong>수집된 떡상 글감, AI 생성 원고 본문, 첨부 및 생성된 AI 이미지</strong>)는 생성일로부터 <strong>30일 동안만 안전하게 보관</strong>되며, 보관 기간이 경과하면 시스템에서 자동으로 영구 삭제됩니다.
          </span>
        </p>
        <p className="flex items-start gap-1.5">
          <span className="text-amber-700 font-bold shrink-0">2.</span>
          <span>
            네이버 블로그에 아직 발행하지 않았거나 장기 보관이 필요한 중요 원고는 기간 내에 <strong>스마트에디터 ONE으로 발행 전송</strong>하거나 본문 클립보드 복사를 통해 별도 백업해 주시기 바랍니다.
          </span>
        </p>
        <p className="flex items-start gap-1.5">
          <span className="text-emerald-700 font-bold shrink-0">3.</span>
          <span className="flex items-center gap-1 flex-wrap">
            <ShieldCheck size={13} className="text-emerald-700 inline shrink-0" />
            <strong className="text-emerald-800">보관함 보호 기능:</strong> 떡상 글감 수집소에서 <strong>[초록색 책갈피(보관함)]</strong>에 담아둔 글감은 자동 삭제 대상에서 제외되어 <strong>영구적으로 안전하게 보호</strong>됩니다.
          </span>
        </p>
      </div>
    </section>
  );
}
