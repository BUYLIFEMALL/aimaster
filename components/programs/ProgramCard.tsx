// Updated at: 2026-07-23T13:32:02.019Z
"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Play, Star } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import Badge from "@/components/ui/Badge";
import GoldButton from "@/components/ui/GoldButton";
import LikeButton from "@/components/programs/LikeButton";
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
  const resolvedBadges = badge ? [badge] : (program.badges ?? []);
  const subscriptionTarget = `/programs/${program.slug}#pricing`;
  const templateBadge = getTemplateBadge(program.slug, program.category?.slug);

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
    <GlassCard hover className="flex flex-col h-full p-0 overflow-hidden hover:border-gold/40 hover:shadow-lg hover:shadow-gold/10 transition-all duration-300">
      {/* Thumbnail */}
      {(() => {
        const thumbnailUrl = program.thumbnail_url;

        return (
          <div className="relative aspect-video bg-white/5 overflow-hidden">
            {thumbnailUrl ? (
              <Image
                src={thumbnailUrl}
                alt={program.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center">
                  <Play size={28} className="text-gold ml-1" />
                </div>
              </div>
            )}
            {resolvedBadges.length > 0 && (
              <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
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
              <div className="absolute bottom-3 right-3">
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
  );
}
