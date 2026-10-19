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
    <div className="w-full py-4 border-y border-white/10 bg-[#0a0a0f]/90 backdrop-blur-md sticky top-16 z-30 shadow-lg">
      <div className="max-w-6xl mx-auto px-4">
        {/* 상단 라벨 */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gold">
            <Layers size={14} className="text-gold" />
            <span>분야별 프로그램 바로가기</span>
            <span className="text-subtext text-[11px] font-normal hidden sm:inline ml-1">
              (클릭 시 해당 분야로 즉시 이동합니다)
            </span>
          </div>

          <Link
            href="/programs"
            className="text-[11px] sm:text-xs font-medium text-gold/80 hover:text-gold flex items-center gap-1 transition-colors"
          >
            <Sparkles size={12} />
            <span>전체 디렉터리 보기 →</span>
          </Link>
        </div>

        {/* 2열 래핑 칩셋 영역 — 가로 스크롤바 완전 제거 및 2행 정돈 */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* 전체 버튼 */}
          <button
            type="button"
            onClick={() => handleCategoryClick(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              !activeSlug
                ? "bg-gold text-black border-gold shadow-sm shadow-gold/30"
                : "bg-white/5 text-subtext hover:text-white hover:bg-white/10 border-white/10"
            }`}
          >
            <span>전체</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                !activeSlug ? "bg-black/20 text-black font-black" : "bg-white/10 text-subtext"
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
                className={`px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 cursor-pointer border ${
                  isSelected
                    ? "bg-gold text-black font-bold border-gold shadow-sm shadow-gold/30"
                    : "bg-white/5 text-subtext hover:text-white hover:bg-white/10 border-white/10"
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
