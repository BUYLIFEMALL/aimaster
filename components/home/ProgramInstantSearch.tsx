"use client";

import { useState, useMemo } from "react";
import { Search, X, Sparkles, Gift, Flame, Filter, SlidersHorizontal } from "lucide-react";
import ProgramCard from "@/components/programs/ProgramCard";
import { getTemplateBadge } from "@/lib/templateBadge";

interface Program {
  id: string;
  name: string;
  slug: string;
  short_desc?: string | null;
  category_id?: string;
  category?: { id: string; name: string; slug: string } | null;
  pricing_plans?: Array<{ id: string; name: string; price: number; is_active: boolean }>;
  badges?: string[];
  is_recommended?: boolean;
  is_free?: boolean;
  version?: string | null;
  view_count?: number;
  like_count?: number;
  icon_url?: string | null;
  thumbnail_url?: string | null;
  url?: string;
  status?: string;
}

interface ProgramInstantSearchProps {
  programs: Program[];
  accessByProgramId: Record<string, boolean>;
  likedSet: string[];
  isAdmin: boolean;
  loggedIn: boolean;
}

type FilterTag = "all" | "recommended" | "free" | "focus" | "neon" | "wizard";

const FILTER_TABS: Array<{ id: FilterTag; label: string; icon: React.ReactNode }> = [
  { id: "all", label: "전체", icon: null },
  { id: "recommended", label: "🔥 추천", icon: null },
  { id: "free", label: "🎁 무료", icon: null },
  { id: "focus", label: "🎯 포커스형", icon: null },
  { id: "neon", label: "⚡ 네온콘솔형", icon: null },
  { id: "wizard", label: "🧙 위저드형", icon: null },
];

export default function ProgramInstantSearch({
  programs,
  accessByProgramId,
  likedSet,
  isAdmin,
  loggedIn,
}: ProgramInstantSearchProps) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTag>("all");

  // 검색어 및 필터 조건에 따른 실시간 인메모리 필터링
  const filteredPrograms = useMemo(() => {
    const q = query.trim().toLowerCase();

    return programs.filter((p) => {
      // 1. 키워드 검색 매칭
      if (q) {
        const nameMatch = p.name?.toLowerCase().includes(q);
        const slugMatch = p.slug?.toLowerCase().includes(q);
        const descMatch = p.short_desc?.toLowerCase().includes(q);
        const catMatch = p.category?.name?.toLowerCase().includes(q);

        if (!nameMatch && !slugMatch && !descMatch && !catMatch) {
          return false;
        }
      }

      // 2. 다차원 퀵 필터 매칭
      if (activeFilter === "recommended") {
        return (
          (p.badges ?? []).includes("recommended") ||
          (p.like_count ?? 0) > 0 ||
          (p.badges ?? []).includes("popular")
        );
      }
      if (activeFilter === "free") {
        return (
          (p.badges ?? []).includes("free") ||
          p.pricing_plans?.some((plan) => plan.is_active && plan.price === 0)
        );
      }
      if (activeFilter === "focus" || activeFilter === "neon" || activeFilter === "wizard") {
        const badge = getTemplateBadge(p.slug, p.category?.slug);
        if (activeFilter === "focus") return badge.type === "focus";
        if (activeFilter === "neon") return badge.type === "neon";
        if (activeFilter === "wizard") return badge.type === "wizard";
      }

      return true;
    });
  }, [programs, query, activeFilter]);

  const isFiltering = query.trim().length > 0 || activeFilter !== "all";
  const likedSetObj = useMemo(() => new Set(likedSet), [likedSet]);
  const accessMap = useMemo(() => new Map(Object.entries(accessByProgramId)), [accessByProgramId]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 mb-8">
      {/* 검색 바 & 필터 칩 래퍼 */}
      <div className="rounded-2xl border border-white/10 bg-surface/40 backdrop-blur-xl p-4 sm:p-5 shadow-xl space-y-4">
        {/* 상단: 인스턴트 검색 인풋 */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-subtext" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="84개 자동화 솔루션 검색 (예: 쓰레드, 쇼츠, 블로그, 스마트스토어, 크롤링...)"
              className="w-full pl-11 pr-10 py-3 rounded-xl bg-black/50 border border-white/15 text-white placeholder-white/40 text-sm sm:text-base focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/40 transition-all"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                title="검색어 지우기"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* 활성화 상태일 때 초기화 버튼 */}
          {isFiltering && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setActiveFilter("all");
              }}
              className="w-full sm:w-auto px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer border border-white/10"
            >
              <X size={14} />
              <span>전체보기로 복원</span>
            </button>
          )}
        </div>

        {/* 하단: 스마트 다차원 퀵 필터 칩셋 */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none">
          <div className="flex items-center gap-1.5 text-xs text-subtext mr-1 shrink-0 font-medium hidden sm:flex">
            <Filter size={13} className="text-gold" />
            <span>스마트 필터:</span>
          </div>

          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 flex items-center gap-1 cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-bold shadow-md shadow-gold/20 scale-105"
                    : "bg-white/[0.05] hover:bg-white/10 text-white/80 hover:text-white border border-white/10"
                }`}
              >
                <span>{tab.label}</span>
                {tab.id === "all" && (
                  <span className="text-[10px] opacity-75">({programs.length})</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 검색 또는 필터링 활성화 시 즉시 노출되는 실시간 결과 섹션 */}
      {isFiltering && (
        <div className="mt-8 animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-gold animate-pulse" />
              <h3 className="text-xl font-bold text-white">
                검색 및 필터링 결과
                <span className="ml-2 text-gold font-mono text-base font-black">
                  {filteredPrograms.length}개 발견
                </span>
              </h3>
            </div>
            {query && (
              <span className="text-xs text-subtext hidden sm:inline">
                &ldquo;{query}&rdquo; 일치 결과
              </span>
            )}
          </div>

          {filteredPrograms.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPrograms.map((program) => (
                <ProgramCard
                  key={program.id}
                  program={program as any}
                  hasAccess={accessMap.get(program.id)}
                  isAdmin={isAdmin}
                  liked={likedSetObj.has(program.id)}
                  loggedIn={loggedIn}
                />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl border border-white/10 bg-white/[0.02]">
              <Search size={36} className="mx-auto text-white/30 mb-3" />
              <h4 className="text-lg font-bold text-white mb-1">일치하는 솔루션이 없습니다</h4>
              <p className="text-xs text-subtext mb-5">
                검색어를 변경하거나 다른 필터 칩을 선택해 보세요.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setActiveFilter("all");
                }}
                className="px-4 py-2 rounded-xl bg-gold/20 hover:bg-gold/30 text-gold text-xs font-bold border border-gold/40 transition-colors"
              >
                전체 솔루션 목록 보기
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
