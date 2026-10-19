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
      // 전체 프로그램 보기 - 첫 번째 카테고리 블록이나 프로그램 섹션으로 스크롤
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
    <div className="w-full py-4 border-y border-white/10 bg-[#0a0a0f]/80 backdrop-blur-md sticky top-16 z-30 shadow-lg">
      <div className="max-w-6xl mx-auto px-4 flex items-center gap-3">
        {/* 라벨 배너 */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0 pr-2 border-r border-white/10 text-xs font-bold text-gold">
          <Layers size={14} className="text-gold" />
          <span>분야별 바로가기</span>
        </div>

        {/* 가로 롤링 칩셋 바 */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 -my-1 w-full">
          <button
            type="button"
            onClick={() => handleCategoryClick(null)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              !activeSlug
                ? "bg-gold text-black border-gold shadow-sm shadow-gold/30"
                : "bg-white/5 text-subtext hover:text-white hover:bg-white/10 border-white/10"
            }`}
          >
            <span>전체</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${!activeSlug ? "bg-black/20 text-black font-black" : "bg-white/10 text-subtext"}`}>
              {totalCount}
            </span>
          </button>

          {categories.map((cat) => {
            const isSelected = activeSlug === cat.slug;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryClick(cat.slug)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 cursor-pointer border ${
                  isSelected
                    ? "bg-gold text-black font-bold border-gold shadow-sm shadow-gold/30"
                    : "bg-white/5 text-subtext hover:text-white hover:bg-white/10 border-white/10"
                }`}
              >
                <span>{cat.name}</span>
              </button>
            );
          })}

          <Link
            href="/programs"
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30 flex items-center gap-1 ml-1"
          >
            <Sparkles size={11} />
            <span>디렉터리 전체보기</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
