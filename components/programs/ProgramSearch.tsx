"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const SORT_OPTIONS = [
  { value: "sort_order", label: "기본순" },
  { value: "newest", label: "최신순" },
  { value: "price_low", label: "낮은 가격순" },
  { value: "price_high", label: "높은 가격순" },
];

export default function ProgramSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [sort, setSort] = useState(searchParams.get("sort") ?? "sort_order");

  // 검색어 디바운스
  useEffect(() => {
    const timeout = setTimeout(() => {
      updateParams({ q: query, sort });
    }, 400);
    return () => clearTimeout(timeout);
  }, [query]);

  function updateParams(updates: { q?: string; sort?: string }) {
    const params = new URLSearchParams(searchParams.toString());

    if (updates.q !== undefined) {
      if (updates.q) params.set("q", updates.q);
      else params.delete("q");
    }

    if (updates.sort !== undefined) {
      if (updates.sort && updates.sort !== "sort_order") params.set("sort", updates.sort);
      else params.delete("sort");
    }

    params.delete("page");
    router.push(`/programs?${params.toString()}`);
  }

  function handleSortChange(newSort: string) {
    setSort(newSort);
    updateParams({ q: query, sort: newSort });
  }

  function handleClear() {
    setQuery("");
    updateParams({ q: "", sort });
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* 검색 */}
      <div className="relative flex-1">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtext" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="프로그램 검색..."
          className="input-dark w-full pl-10 pr-10"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-subtext hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* 정렬 */}
      <div className="flex items-center gap-2 min-w-0">
        <SlidersHorizontal size={14} className="text-subtext flex-shrink-0" />
        <div className="flex gap-1 overflow-x-auto">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSortChange(opt.value)}
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                sort === opt.value
                  ? "bg-gold text-black"
                  : "bg-white/5 text-subtext hover:bg-white/10 hover:text-white"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
