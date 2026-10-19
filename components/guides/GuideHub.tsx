"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  KeyRound,
  Rocket,
  Search,
  X,
  ExternalLink,
  ArrowRight,
  Play,
  Clock,
  Sparkles,
  BookOpen,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { getGuideMeta } from "@/lib/guideMeta";
import { getTemplateBadge } from "@/lib/templateBadge";
import type { Program } from "@/types/database.types";

export interface GuideRow {
  id: string;
  category: string;
  title: string;
  sort_order: number;
}

interface GuideHubProps {
  guides: GuideRow[];
  programs: Program[];
  categories: { name: string; sort_order: number }[];
}

export default function GuideHub({ guides, programs, categories }: GuideHubProps) {
  const [activeTab, setActiveTab] = useState<"api" | "programs">("api");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // 1. API 가이드 필터링
  const filteredGuides = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return guides.filter((g) => {
      if (q) {
        return (
          g.title.toLowerCase().includes(q) ||
          g.category.toLowerCase().includes(q)
        );
      }

      return (
        selectedCategory === "all" ||
        g.category.toLowerCase().includes(selectedCategory.toLowerCase()) ||
        (selectedCategory === "llm" && g.category.includes("LLM")) ||
        (selectedCategory === "sns" && g.category.includes("SNS")) ||
        (selectedCategory === "naver" && g.category.includes("네이버")) ||
        (selectedCategory === "ecommerce" && g.category.includes("이커머스")) ||
        (selectedCategory === "media" && (g.category.includes("이미지") || g.category.includes("음악"))) ||
        (selectedCategory === "messenger" && g.category.includes("메신저"))
      );
    });
  }, [guides, selectedCategory, searchQuery]);

  // 2. 프로그램 매뉴얼 필터링
  const filteredPrograms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return programs.filter((p) => {
      const catName = p.category?.name || "";
      if (q) {
        return (
          p.name.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          (p.short_desc && p.short_desc.toLowerCase().includes(q)) ||
          catName.toLowerCase().includes(q)
        );
      }

      return (
        selectedCategory === "all" ||
        catName.toLowerCase().includes(selectedCategory.toLowerCase()) ||
        (selectedCategory === "sns" && (p.slug.includes("threads") || p.slug.includes("insta"))) ||
        (selectedCategory === "naver" && (p.slug.includes("naver") || p.slug.includes("blog"))) ||
        (selectedCategory === "ecommerce" && (catName.includes("이커머스") || p.slug.includes("coupang"))) ||
        (selectedCategory === "media" && (catName.includes("이미지") || catName.includes("음악") || catName.includes("멀티미디어")))
      );
    });
  }, [programs, selectedCategory, searchQuery]);

  return (
    <div className="space-y-8">
      {/* 1. 상단 듀얼 트랙 탭 스위처 */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-md">
        <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab("api")}
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === "api"
                ? "bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 shadow-lg shadow-amber-400/20"
                : "text-white/70 hover:text-white hover:bg-white/5"
            }`}
          >
            <KeyRound size={16} className={activeTab === "api" ? "text-slate-950" : "text-amber-400"} />
            <span>API · 플랫폼 연동 가이드</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[11px] font-mono ${
                activeTab === "api" ? "bg-black/20 text-slate-950" : "bg-white/10 text-white/60"
              }`}
            >
              {guides.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("programs")}
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === "programs"
                ? "bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 shadow-lg shadow-amber-400/20"
                : "text-white/70 hover:text-white hover:bg-white/5"
            }`}
          >
            <Rocket size={16} className={activeTab === "programs" ? "text-slate-950" : "text-amber-400"} />
            <span>서브프로그램 실전 매뉴얼</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[11px] font-mono ${
                activeTab === "programs" ? "bg-black/20 text-slate-950" : "bg-white/10 text-white/60"
              }`}
            >
              {programs.length}
            </span>
          </button>
        </div>

        {/* 2. 실시간 라이브 검색창 */}
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === "api" ? "API, 플랫폼 검색..." : "프로그램명, 기능 검색..."}
            className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-amber-400/60 focus:bg-white/[0.09] transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-white/50 hover:text-white"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* 3. 카테고리 퀵 칩셋 바 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs">
        <button
          type="button"
          onClick={() => setSelectedCategory("all")}
          className={`px-3.5 py-1.5 rounded-full font-medium transition-all shrink-0 cursor-pointer ${
            selectedCategory === "all"
              ? "bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20"
              : "bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/10"
          }`}
        >
          전체
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategory("llm")}
          className={`px-3.5 py-1.5 rounded-full font-medium transition-all shrink-0 cursor-pointer ${
            selectedCategory === "llm"
              ? "bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20"
              : "bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/10"
          }`}
        >
          🤖 LLM AI
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategory("sns")}
          className={`px-3.5 py-1.5 rounded-full font-medium transition-all shrink-0 cursor-pointer ${
            selectedCategory === "sns"
              ? "bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20"
              : "bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/10"
          }`}
        >
          📸 SNS · 쓰레드 · 인스타
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategory("naver")}
          className={`px-3.5 py-1.5 rounded-full font-medium transition-all shrink-0 cursor-pointer ${
            selectedCategory === "naver"
              ? "bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20"
              : "bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/10"
          }`}
        >
          🟢 네이버
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategory("ecommerce")}
          className={`px-3.5 py-1.5 rounded-full font-medium transition-all shrink-0 cursor-pointer ${
            selectedCategory === "ecommerce"
              ? "bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20"
              : "bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/10"
          }`}
        >
          🛍️ 이커머스 · 쿠팡
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategory("media")}
          className={`px-3.5 py-1.5 rounded-full font-medium transition-all shrink-0 cursor-pointer ${
            selectedCategory === "media"
              ? "bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20"
              : "bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/10"
          }`}
        >
          🎨 이미지 · 영상 · 음원
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategory("messenger")}
          className={`px-3.5 py-1.5 rounded-full font-medium transition-all shrink-0 cursor-pointer ${
            selectedCategory === "messenger"
              ? "bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20"
              : "bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/10"
          }`}
        >
          💬 메신저 · 알림
        </button>
      </div>

      {/* 4. 본문 컨텐츠 그리드 */}
      {activeTab === "api" ? (
        /* 트랙 1: API 가이드 그리드 */
        filteredGuides.length === 0 ? (
          <GlassCard className="text-center py-16">
            <p className="text-subtext text-sm">일치하는 API 연동 가이드가 없습니다.</p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGuides.map((guide) => {
              const meta = getGuideMeta(guide.title, guide.category);
              return (
                <Link key={guide.id} href={`/guides/${guide.id}`} className="group block h-full">
                  <GlassCard hover className="h-full p-5 flex flex-col justify-between transition-all duration-300 group-hover:border-gold/40 group-hover:shadow-lg group-hover:shadow-gold/10">
                    <div>
                      {/* 카드 상단 이모티콘 & 뱃지 */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{meta.icon}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${meta.badgeTone}`}>
                            {guide.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[11px] text-white/60">
                            <Clock size={11} className="text-amber-400" />
                            <span>{meta.estimatedTime}</span>
                          </span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${meta.difficultyTone}`}>
                            {meta.difficulty}
                          </span>
                        </div>
                      </div>

                      {/* 제목 & 요약 설명 */}
                      <h3 className="text-white font-bold text-sm leading-snug mb-2 group-hover:text-amber-300 transition-colors line-clamp-2">
                        {guide.title}
                      </h3>
                      <p className="text-subtext text-xs line-clamp-2 mb-4 leading-relaxed">
                        {meta.summary}
                      </p>
                    </div>

                    {/* 카드 하단 액션 버튼 */}
                    <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-semibold">
                      <span className="text-gold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        <span>가이드 보기</span>
                        <ArrowRight size={13} />
                      </span>
                      {meta.consoleUrl && (
                        <a
                          href={meta.consoleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[11px] text-white/50 hover:text-white flex items-center gap-1 bg-white/5 hover:bg-white/10 px-2 py-1 rounded transition-colors"
                          title={meta.consoleLabel}
                        >
                          <span>콘솔</span>
                          <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </GlassCard>
                </Link>
              );
            })}
          </div>
        )
      ) : (
        /* 트랙 2: 서브프로그램 매뉴얼 그리드 */
        filteredPrograms.length === 0 ? (
          <GlassCard className="text-center py-16">
            <p className="text-subtext text-sm">일치하는 프로그램이 없습니다.</p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPrograms.map((program) => {
              const templateBadge = getTemplateBadge(program.slug, program.category?.slug);
              return (
                <GlassCard key={program.id} hover className="h-full p-5 flex flex-col justify-between transition-all duration-300 hover:border-gold/40">
                  <div>
                    {/* 상단 카테고리 & 템플릿 */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs text-gold/90 font-medium">
                        {program.category?.name || "자동화 솔루션"}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${templateBadge.tone}`}>
                        <span>{templateBadge.icon}</span>
                        <span>{templateBadge.label}</span>
                      </span>
                    </div>

                    {/* 프로그램명 */}
                    <h3 className="text-white font-bold text-sm mb-2 line-clamp-1">
                      {program.name}
                    </h3>
                    <p className="text-subtext text-xs line-clamp-2 mb-4 leading-relaxed">
                      {program.short_desc || "AIMaster 최신 AI 파이프라인 엔진 탑재"}
                    </p>
                  </div>

                  {/* 하단 실행 & 매뉴얼 링크 */}
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                    <Link
                      href={`/programs/${program.slug}`}
                      className="text-xs text-white/80 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      <BookOpen size={12} className="text-amber-400" />
                      <span>기능 상세</span>
                    </Link>

                    {program.app_url && (
                      <a
                        href={program.app_url}
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-bold text-xs flex items-center gap-1 hover:scale-105 transition-all shadow-md"
                      >
                        <Play size={11} className="fill-slate-950" />
                        <span>즉시 실행</span>
                      </a>
                    )}
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
