import { Suspense } from "react";
import ProgramCard from "@/components/programs/ProgramCard";
import CategoryNav from "@/components/programs/CategoryNav";
import ProgramSearch from "@/components/programs/ProgramSearch";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ category?: string; q?: string; sort?: string; page?: string }>;
}

async function getPrograms(categorySlug?: string, query?: string, sort?: string) {
  const supabase = await createClient();

  let dbQuery = supabase
    .from("programs")
    .select("*, category:categories(*), pricing_plans(*)")
    .eq("is_active", true);

  // 카테고리 필터
  if (categorySlug) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", categorySlug)
      .single();
    if (cat) dbQuery = dbQuery.eq("category_id", cat.id);
  }

  // 검색어 필터 (이름 또는 설명에서)
  if (query) {
    dbQuery = dbQuery.or(`name.ilike.%${query}%,short_desc.ilike.%${query}%`);
  }

  // 정렬
  switch (sort) {
    case "newest":
      dbQuery = dbQuery.order("created_at", { ascending: false });
      break;
    case "price_low":
    case "price_high":
      // 가격 정렬은 클라이언트에서 처리 (pricing_plans가 별도 테이블)
      dbQuery = dbQuery.order("sort_order");
      break;
    default:
      dbQuery = dbQuery.order("sort_order");
  }

  const { data } = await dbQuery;
  let programs = data ?? [];

  // 가격 기준 클라이언트 정렬
  if (sort === "price_low" || sort === "price_high") {
    programs = programs.sort((a, b) => {
      const aMin = Math.min(...(a.pricing_plans?.filter((p: { is_active: boolean }) => p.is_active).map((p: { price: number }) => p.price) ?? [Infinity]));
      const bMin = Math.min(...(b.pricing_plans?.filter((p: { is_active: boolean }) => p.is_active).map((p: { price: number }) => p.price) ?? [Infinity]));
      return sort === "price_low" ? aMin - bMin : bMin - aMin;
    });
  }

  return programs;
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

export default async function ProgramsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [programs, categories] = await Promise.all([
    getPrograms(params.category, params.q, params.sort),
    getCategories(),
  ]);

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
          <ProgramSearch />
        </div>
      </Suspense>

      {/* Category Filter */}
      <Suspense>
        <div className="mb-8">
          <CategoryNav categories={categories} activeSlug={params.category} />
        </div>
      </Suspense>

      {/* Results count */}
      {params.q && (
        <p className="text-subtext text-sm mb-4">
          &quot;{params.q}&quot; 검색 결과: {programs.length}개
        </p>
      )}

      {/* Programs Grid */}
      {programs.length === 0 ? (
        <div className="text-center py-20 text-subtext">
          {params.q ? (
            <>
              <p className="text-xl mb-2">&quot;{params.q}&quot; 검색 결과가 없습니다</p>
              <p className="text-sm">다른 키워드로 검색해보세요</p>
            </>
          ) : (
            <>
              <p className="text-xl mb-2">등록된 프로그램이 없습니다</p>
              <p className="text-sm">곧 새로운 프로그램이 업로드될 예정입니다</p>
            </>
          )}
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
