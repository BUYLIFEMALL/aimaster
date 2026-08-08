import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import ProgramCard from "@/components/programs/ProgramCard";
import CategoryNav from "@/components/programs/CategoryNav";
import ProgramSearch from "@/components/programs/ProgramSearch";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "마케팅 자동화 프로그램",
  description: "AI 기반 마케팅 도구로 비즈니스를 성장시키세요.",
};

interface PageProps {
  searchParams: Promise<{ q?: string; sort?: string }>;
}

async function getCategories() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .is("parent_id", null)
    .order("sort_order");
  return data ?? [];
}

async function getPrograms(query?: string, sort?: string) {
  const supabase = await createClient();

  let dbQuery = supabase
    .from("programs")
    .select("*, category:categories(*), pricing_plans(*)")
    .eq("is_active", true);

  if (query) {
    dbQuery = dbQuery.or(`name.ilike.%${query}%,short_desc.ilike.%${query}%`);
  }

  switch (sort) {
    case "newest":
      dbQuery = dbQuery.order("created_at", { ascending: false });
      break;
    case "price_low":
    case "price_high":
      dbQuery = dbQuery.order("sort_order");
      break;
    default:
      dbQuery = dbQuery.order("sort_order");
  }

  const { data } = await dbQuery;
  let programs = data ?? [];

  if (sort === "price_low" || sort === "price_high") {
    programs = programs.sort((a, b) => {
      const aMin = Math.min(...(a.pricing_plans?.filter((p: { is_active: boolean }) => p.is_active).map((p: { price: number }) => p.price) ?? [Infinity]));
      const bMin = Math.min(...(b.pricing_plans?.filter((p: { is_active: boolean }) => p.is_active).map((p: { price: number }) => p.price) ?? [Infinity]));
      return sort === "price_low" ? aMin - bMin : bMin - aMin;
    });
  }

  return programs;
}

export default async function ProgramsPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  const [programs, categories] = await Promise.all([
    getPrograms(sp.q, sp.sort),
    getCategories(),
  ]);

  const showBlocks = !sp.q;
  const categoryBlocks = categories
    .map((category) => ({
      category,
      programs: programs.filter((p) => p.category_id === category.id),
    }))
    .filter((block) => block.programs.length > 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          마케팅 자동화 프로그램
        </h1>
        <p className="text-subtext text-lg">
          AI 기반 마케팅 도구로 비즈니스를 성장시키세요
        </p>
      </div>

      {/* Search + Sort */}
      <Suspense>
        <div className="mb-6">
          <ProgramSearch basePath="/programs" />
        </div>
      </Suspense>

      {/* Category Filter */}
      <Suspense>
        <div className="mb-8">
          <CategoryNav categories={categories} />
        </div>
      </Suspense>

      {/* Results count */}
      {sp.q && (
        <p className="text-subtext text-sm mb-4">
          &quot;{sp.q}&quot; 검색 결과: {programs.length}개
        </p>
      )}

      {/* Programs */}
      {programs.length === 0 ? (
        <div className="text-center py-20 text-subtext">
          {sp.q ? (
            <>
              <p className="text-xl mb-2">&quot;{sp.q}&quot; 검색 결과가 없습니다</p>
              <p className="text-sm">다른 키워드로 검색해보세요</p>
            </>
          ) : (
            <p className="text-xl mb-2">등록된 프로그램이 없습니다</p>
          )}
        </div>
      ) : showBlocks ? (
        <div className="space-y-16">
          {categoryBlocks.map(({ category, programs: catPrograms }) => (
            <div key={category.id}>
              <div className="flex items-end justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">{category.name}</h2>
                <Link
                  href={`/programs/category/${category.slug}`}
                  className="text-sm text-gold hover:underline flex-shrink-0"
                >
                  전체 보기 →
                </Link>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {catPrograms.map((program) => (
                  <ProgramCard key={program.id} program={program} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map((program) => (
            <ProgramCard key={program.id} program={program} />
          ))}
        </div>
      )}
    </div>
  );
}
