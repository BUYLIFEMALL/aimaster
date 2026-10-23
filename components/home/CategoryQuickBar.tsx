"use client";

import { useState } from "react";
import Link from "next/link";
import { Layers, Sparkles } from "lucide-react";
import type { Category } from "@/types/database.types";

interface CategoryQuickBarProps {
  categories: Category[];
  totalCount: number;
}

export default function CategoryQuickBar({ categories, totalCount }: CategoryQuickBarProps) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const handleCategoryClick = (slug: string | null) => {
    setActiveSlug(slug);
    if (!slug) {
      const target = document.getElementById("program-catalog");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }

    const target = document.getElementById(`category-${slug}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="w-full py-4 border-y border-white/10 bg-[#0a0a0f]/95 backdrop-blur-md sticky top-16 z-30 shadow-xl">
      <div className="max-w-6xl mx-auto px-4">
        {/* 상단 라벨 & 안내 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-gold">
            <Layers size={16} className="text-gold" />
            <span>분야별 프로그램 바로가기</span>
            <span className="text-subtext text-xs font-normal hidden sm:inline ml-1">
              (선택한 카테고리로 즉시 이동합니다)
            </span>
          </div>

          <Link
            href="/programs"
            className="text-xs sm:text-sm font-semibold text-gold/90 hover:text-gold flex items-center gap-1 transition-colors"
          >
            <Sparkles size={13} />
            <span>전체 디렉터리 보기 →</span>
          </Link>
        </div>

        {/* 2열 래핑 칩셋 영역 — 글자 확대 & 선택 시 선명한 노란색(골드) 하이라이트 */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* 전체 버튼 */}
          <button
            type="button"
            onClick={() => handleCategoryClick(null)}
            className={`px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              !activeSlug
                ? "bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black border-amber-300 shadow-md shadow-gold/30 scale-105"
                : "bg-white/[0.06] text-white/90 hover:bg-white/[0.12] hover:text-white border-white/15"
            }`}
          >
            <span>전체</span>
            <span
              className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                !activeSlug
                  ? "bg-black/20 text-black font-black"
                  : "bg-white/10 text-white/70 font-semibold"
              }`}
            >
              {totalCount}
            </span>
          </button>

          {/* 14대 카테고리 칩셋 목록 */}
          {categories.map((cat) => {
            const isSelected = activeSlug === cat.slug;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryClick(cat.slug)}
                className={`px-3 sm:px-3.5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center gap-1 cursor-pointer border ${
                  isSelected
                    ? "bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black border-amber-300 shadow-md shadow-gold/30 scale-105"
                    : "bg-white/[0.06] text-white/90 hover:bg-white/[0.12] hover:text-white border-white/15"
                }`}
              >
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
