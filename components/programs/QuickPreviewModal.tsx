"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Play, ExternalLink, Sparkles, CheckCircle2, ShieldCheck } from "lucide-react";
import { formatKRW } from "@/lib/utils/format";
import { getTemplateBadge } from "@/lib/templateBadge";
import Badge from "@/components/ui/Badge";
import GoldButton from "@/components/ui/GoldButton";
import type { Program } from "@/types/database.types";

interface QuickPreviewModalProps {
  program: Program;
  isOpen: boolean;
  onClose: () => void;
  hasAccess?: boolean;
}

export default function QuickPreviewModal({
  program,
  isOpen,
  onClose,
  hasAccess = false,
}: QuickPreviewModalProps) {
  const templateBadge = getTemplateBadge(program.slug, program.category?.slug);
  const resolvedBadges = program.badges ?? [];
  const minPrice = program.pricing_plans
    ?.filter((p) => p.is_active)
    .sort((a, b) => a.price - b.price)[0];
  const isFree = resolvedBadges.includes("free");

  // ESC 키로 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-preview-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-950/95 border border-white/15 shadow-2xl shadow-black/80 p-0 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 버튼 */}
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/60 hover:bg-white/20 text-white/80 hover:text-white border border-white/10 backdrop-blur-md transition-all cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* 대형 썸네일 & 마이크로 모션 헤더 */}
        <div className="relative aspect-video w-full bg-white/5 overflow-hidden border-b border-white/10">
          {program.thumbnail_url ? (
            <Image
              src={program.thumbnail_url}
              alt={program.name}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 to-black">
              <Sparkles size={48} className="text-amber-400/40 animate-pulse" />
            </div>
          )}

          {/* 그라데이션 오버레이 */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

          {/* 상단 뱃지 그룹 */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10">
            {resolvedBadges.map((b) => (
              <Badge key={b} variant={b as any} />
            ))}
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border backdrop-blur-md ${templateBadge.tone}`}>
              <span>{templateBadge.icon}</span>
              <span>{templateBadge.label}</span>
            </span>
          </div>

          {/* 썸네일 하단 오버레이 정보 */}
          <div className="absolute bottom-4 left-5 right-5 z-10">
            <span className="text-xs font-semibold text-amber-400/90 tracking-wider uppercase mb-1 block">
              {program.category?.name || "AI 마케팅 자동화"}
            </span>
            <h2 id="quick-preview-title" className="text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-md">
              {program.name}
            </h2>
          </div>
        </div>

        {/* 본문 상세 정보 */}
        <div className="p-6 space-y-6">
          {/* 한 줄 요약 및 상세 설명 */}
          {program.short_desc && (
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-white/90 text-sm leading-relaxed">
              <p className="font-medium">{program.short_desc}</p>
            </div>
          )}

          {/* 핵심 특징 3대 포인트 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-white">원클릭 자동화</div>
                <div className="text-[11px] text-white/60">복잡한 설정 없이 즉시 실행</div>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-start gap-2.5">
              <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-white">회원 보안 격리</div>
                <div className="text-[11px] text-white/60">개인 API 키 100% 안전 보관</div>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-start gap-2.5">
              <Sparkles size={16} className="text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-white">지속 업데이트</div>
                <div className="text-[11px] text-white/60">{program.version || "최신 v1.0"} 엔진 탑재</div>
              </div>
            </div>
          </div>

          {/* 가격 & 액션 버튼 */}
          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-xs text-white/50 mb-0.5">이용 요금 안내</div>
              {isFree ? (
                <span className="text-emerald-400 font-black text-lg">무료 (정회원 즉시 이용 가능)</span>
              ) : minPrice ? (
                <div className="flex items-baseline gap-1">
                  <span className="text-xs text-white/60">월</span>
                  <span className="text-amber-400 font-black text-2xl">{formatKRW(minPrice.price)}</span>
                  <span className="text-xs text-white/60">~</span>
                </div>
              ) : (
                <span className="text-white/80 font-bold text-base">가격 문의</span>
              )}
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <Link
                href={`/programs/${program.slug}`}
                onClick={onClose}
                className="flex-1 sm:flex-initial"
              >
                <button
                  type="button"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/15 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>상세 가이드 보기</span>
                  <ExternalLink size={13} />
                </button>
              </Link>

              {hasAccess && program.app_url ? (
                <a
                  href={program.app_url}
                  className="flex-1 sm:flex-initial"
                >
                  <GoldButton size="md" className="w-full flex items-center justify-center gap-1.5">
                    <Play size={13} className="fill-slate-950" />
                    <span>솔루션 실행하기</span>
                  </GoldButton>
                </a>
              ) : isFree ? (
                <a
                  href={program.app_url || `/programs/${program.slug}`}
                  className="flex-1 sm:flex-initial"
                >
                  <button
                    type="button"
                    className="w-full px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none"
                  >
                    <Play size={13} className="fill-slate-950" />
                    <span>무료 시작하기</span>
                  </button>
                </a>
              ) : (
                <Link
                  href={`/programs/${program.slug}#pricing`}
                  onClick={onClose}
                  className="flex-1 sm:flex-initial"
                >
                  <GoldButton size="md" className="w-full flex items-center justify-center gap-1.5">
                    <Play size={13} className="fill-slate-950" />
                    <span>구독하고 시작하기</span>
                  </GoldButton>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
