// Updated at: 2026-07-23T13:32:02.019Z
"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Play, Star, Eye, Sparkles } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import Badge from "@/components/ui/Badge";
import GoldButton from "@/components/ui/GoldButton";
import LikeButton from "@/components/programs/LikeButton";
import QuickPreviewModal from "@/components/programs/QuickPreviewModal";
import { formatKRW } from "@/lib/utils/format";
import { getTemplateBadge } from "@/lib/templateBadge";
import type { Program } from "@/types/database.types";

interface ProgramCardProps {
  program: Program;
  hasAccess?: boolean;
  badge?: "new" | "best" | "sale" | "coming" | "free" | "recommended" | "premium";
  isAdmin?: boolean;
  liked?: boolean;
  loggedIn?: boolean;
}

export default function ProgramCard({ program, badge, hasAccess = false, isAdmin = false, liked = false, loggedIn = false }: ProgramCardProps) {
  const [isFav, setIsFav] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isQuickPreviewOpen, setIsQuickPreviewOpen] = useState(false);

  const resolvedBadges = badge ? [badge] : (program.badges ?? []);
  const subscriptionTarget = `/programs/${program.slug}#pricing`;
  const templateBadge = getTemplateBadge(program.slug, program.category?.slug);

  const isVideoDirect = Boolean(
    program.video_url &&
    (program.video_url.endsWith(".mp4") || program.video_url.endsWith(".webm"))
  );

  const microPreviewLabel = (() => {
    switch (templateBadge.type) {
      case "focus":
        return "초고해상도 AI 렌더링 엔진";
      case "neon":
        return "멀티채널 실시간 파이프라인";
      case "wizard":
        return "3단계 원클릭 콘텐츠 자동화";
      case "twocolumn":
        return "데이터 분석 & AI 자동 분류";
      case "minimal":
      default:
        return "원클릭 경량 자동화 솔루션";
    }
  })();

  const minPrice = program.pricing_plans
    ?.filter((p) => p.is_active)
    .sort((a, b) => a.price - b.price)[0];

  useEffect(() => {
    try {
      const raw = localStorage.getItem("aimaster_favorites");
      if (raw) {
        const list: string[] = JSON.parse(raw);
        setIsFav(list.includes(program.id));
      }
    } catch {
      // ignore
    }

    const handleFavChange = () => {
      try {
        const raw = localStorage.getItem("aimaster_favorites");
        if (raw) {
          const list: string[] = JSON.parse(raw);
          setIsFav(list.includes(program.id));
        } else {
          setIsFav(false);
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener("aimaster-favorites-changed", handleFavChange);
    return () => window.removeEventListener("aimaster-favorites-changed", handleFavChange);
  }, [program.id]);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const raw = localStorage.getItem("aimaster_favorites");
      const list: string[] = raw ? JSON.parse(raw) : [];
      let updated: string[];
      if (list.includes(program.id)) {
        updated = list.filter((id) => id !== program.id);
        setIsFav(false);
      } else {
        updated = [program.id, ...list.filter((id) => id !== program.id)];
        setIsFav(true);
      }
      localStorage.setItem("aimaster_favorites", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("aimaster-favorites-changed"));
    } catch {
      // ignore
    }
  };

  const recordRecent = () => {
    try {
      const raw = localStorage.getItem("aimaster_recent_programs");
      const list: string[] = raw ? JSON.parse(raw) : [];
      const updated = [program.id, ...list.filter((id) => id !== program.id)].slice(0, 12);
      localStorage.setItem("aimaster_recent_programs", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("aimaster-recent-changed"));
    } catch {
      // ignore
    }
  };

  return (
    <>
      <GlassCard
        hover
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="flex flex-col h-full p-0 overflow-hidden hover:border-gold/40 hover:shadow-lg hover:shadow-gold/10 transition-all duration-300 group"
      >
        {/* Thumbnail */}
        {(() => {
          const thumbnailUrl = program.thumbnail_url;

          return (
            <div className="relative aspect-video bg-white/5 overflow-hidden">
              {/* 비디오 직링크(mp4/webm)인 경우 호버 시 비디오 자동 재생 */}
              {isVideoDirect && isHovered ? (
                <video
                  src={program.video_url || undefined}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover z-[5]"
                />
              ) : thumbnailUrl ? (
                <Image
                  src={thumbnailUrl}
                  alt={program.name}
                  fill
                  className={`object-cover transition-transform duration-700 ease-out ${
                    isHovered ? "scale-110" : "scale-100"
                  }`}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center">
                    <Play size={28} className="text-gold ml-1" />
                  </div>
                </div>
              )}

              {/* 🎬 마이크로 동적 프리뷰 오버레이 (호버 시 부드러운 페이드인) — 위 여백 pt-12: 배지·좋아요·즐겨찾기·편집 줄(top-3, z-10)과 겹치지 않게(2026-10-20) */}
              <div
                className={`absolute inset-0 z-[6] bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-slate-950/20 backdrop-blur-[2px] flex flex-col justify-between px-3 pb-3 pt-12 transition-all duration-300 pointer-events-none ${
                  isHovered ? "opacity-100" : "opacity-0"
                }`}
              >
                {/* 중앙 퀵 프리뷰 액션 버튼 & 핵심 가동 기능 텍스트 */}
                <div className="flex flex-col items-center justify-center gap-1.5 my-auto pointer-events-auto">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsQuickPreviewOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-400/30 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer border-none"
                  >
                    <Eye size={13} className="text-slate-950" />
                    <span>퀵 프리뷰</span>
                  </button>
                  <span className="text-[11px] font-bold text-white/95 text-center px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm border border-white/10 drop-shadow-md">
                    {microPreviewLabel}
                  </span>
                </div>

                {/* 하단 스캔라인 모션 바 */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-amber-400/70 to-transparent animate-pulse" />
              </div>

              {resolvedBadges.length > 0 && (
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
                  {resolvedBadges.map((b) => (
                    <Badge key={b} variant={b} />
                  ))}
                </div>
              )}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
                <LikeButton programId={program.id} initialCount={program.like_count ?? 0} initialLiked={liked} loggedIn={loggedIn} />
              </div>

              {/* ⭐ 즐겨찾기 핀 토글 버튼 */}
              <button
                type="button"
                onClick={toggleFavorite}
                title={isFav ? "즐겨찾기 해제" : "내 작업대에 즐겨찾기 고정"}
                className={`absolute top-3 ${isAdmin ? "right-14" : "right-3"} z-10 p-1.5 rounded-lg backdrop-blur-md border transition-all cursor-pointer ${
                  isFav
                    ? "bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/30 scale-105"
                    : "bg-black/60 text-white/70 hover:text-white border-white/20 hover:border-gold/40 hover:bg-black/80"
                }`}
              >
                <Star size={13} className={isFav ? "fill-slate-950 text-slate-950" : ""} />
              </button>

              {isAdmin && (
                <Link
                  href={`/admin/programs/${program.id}/edit`}
                  title="관리자: 이 프로그램 편집"
                  className="absolute top-3 right-3 z-10 px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-sm border border-gold/50 text-gold text-xs font-bold hover:bg-gold hover:text-black transition-colors whitespace-nowrap"
                >
                  편집
                </Link>
              )}
              {program.video_url && (
                <div className="absolute bottom-3 right-3 z-10">
                  <span className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full text-xs text-white">
                    <Play size={10} />
                    미리보기
                  </span>
                </div>
              )}
            </div>
          );
        })()}


      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        {(program.category || program.version) && (
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs text-gold/80 font-medium truncate">{program.category?.name}</span>
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${templateBadge.tone}`}>
                <span>{templateBadge.icon}</span>
                <span>{templateBadge.label}</span>
              </span>
            </div>
            {program.version && (
              <span className="text-[11px] text-subtext shrink-0">{program.version}</span>
            )}
          </div>
        )}
        <h3 className="text-white font-semibold text-base mb-2 line-clamp-2 leading-snug">
          {program.slug.includes("tarot") || program.name.includes("타로")
            ? "AIMaster 타로점"
            : program.name}
        </h3>
        {program.short_desc && (
          <p className="text-subtext text-sm line-clamp-2 mb-4 flex-1">
            {program.short_desc}
          </p>
        )}


        {/* Price + CTA */}
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/10">
          <div>
            {resolvedBadges.includes("free") ? (
              <span className="text-emerald-400 font-bold text-base">무료 (회원 전용)</span>
            ) : minPrice ? (
              <>
                <span className="text-xs text-subtext">월 </span>
                <span className="text-gold font-bold text-lg">
                  {formatKRW(minPrice.price)}
                </span>
                <span className="text-xs text-subtext"> ~</span>
              </>
            ) : (
              <span className="text-subtext text-sm">가격 문의</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* 휴대폰(마우스 올림 없음)용 퀵 프리뷰 — 덮개 버튼과 같은 팝업(2026-10-20) */}
            <button
              type="button"
              onClick={() => setIsQuickPreviewOpen(true)}
              aria-label="퀵 프리뷰"
              title="퀵 프리뷰"
              className="md:hidden p-2 rounded-xl bg-black/40 border border-gold/40 text-gold hover:bg-gold hover:text-black transition-colors cursor-pointer"
            >
              <Eye size={14} />
            </button>
            {hasAccess && program.app_url ? (
              <a href={program.app_url} onClick={recordRecent} className="block">
                <button
                  type="button"
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-md transition-all hover:scale-105 active:scale-95 flex items-center gap-1 cursor-pointer border-none"
                >
                  <Play size={12} className="fill-slate-950 text-slate-950" />
                  <span>실행하기</span>
                </button>
              </a>
            ) : resolvedBadges.includes("free") ? (
              <a href={program.app_url || `/programs/${program.slug}`} onClick={recordRecent} className="block">
                <button
                  type="button"
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black text-xs shadow-md transition-all hover:scale-105 active:scale-95 flex items-center gap-1 cursor-pointer border-none"
                >
                  <Play size={12} className="fill-slate-950 text-slate-950" />
                  <span>무료 이용하기</span>
                </button>
              </a>
            ) : (
              <Link href={subscriptionTarget} onClick={recordRecent}>
                <button
                  type="button"
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-md transition-all hover:scale-105 active:scale-95 flex items-center gap-1 cursor-pointer border-none"
                >
                  <Play size={12} className="fill-slate-950 text-slate-950" />
                  <span>구독하기</span>
                </button>
              </Link>
            )}
            <Link href={"/programs/" + program.slug} onClick={recordRecent}>
              <GoldButton size="sm">자세히 보기</GoldButton>
            </Link>
          </div>
        </div>
      </div>
      </GlassCard>

      {/* 👁️ 마이크로 퀵 프리뷰 모달 팝업 */}
      <QuickPreviewModal
        program={program}
        isOpen={isQuickPreviewOpen}
        onClose={() => setIsQuickPreviewOpen(false)}
        hasAccess={hasAccess}
      />
    </>
  );
}
