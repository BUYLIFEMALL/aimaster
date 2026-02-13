"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import type { Category } from "@/types/database.types";

interface CategoryNavProps {
  categories: Category[];
  activeSlug?: string;
}

export default function CategoryNav({ categories, activeSlug }: CategoryNavProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSelect = (slug: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) {
      params.set("category", slug);
    } else {
      params.delete("category");
    }
    params.delete("page");
    router.push(`/programs?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => handleSelect(null)}
        className={cn(
          "px-4 py-2 rounded-full text-sm font-medium transition-all",
          !activeSlug
            ? "bg-gold text-black"
            : "bg-white/5 text-subtext hover:bg-white/10 hover:text-white border border-white/10"
        )}
      >
        전체
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => handleSelect(cat.slug)}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-all",
            activeSlug === cat.slug
              ? "bg-gold text-black"
              : "bg-white/5 text-subtext hover:bg-white/10 hover:text-white border border-white/10"
          )}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
