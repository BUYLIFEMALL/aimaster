import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ProgramCard from "@/components/programs/ProgramCard";
import CategoryNav from "@/components/programs/CategoryNav";
import ProgramSearch from "@/components/programs/ProgramSearch";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; sort?: string }>;
}

async function getCategory(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .single();
  return data;
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

async function getPrograms(categoryId: string, query?: string, sort?: string) {
  const supabase = await createClient();

  let dbQuery = supabase
    .from("programs")
    .select("*, category:categories(*), pricing_plans(*)")
    .eq("is_active", true)
    .eq("category_id", categoryId);

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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) return { title: "카테고리를 찾을 수 없습니다" };

  return {
    title: `${category.name} 프로그램`,
    description: `${category.name} 카테고리의 AI 마케팅 자동화 프로그램을 확인하세요.`,
    openGraph: {
      title: `${category.name} | AI Master`,
      description: `${category.name} 카테고리의 AI 마케팅 자동화 프로그램을 확인하세요.`,
    },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;

  const category = await getCategory(slug);
  if (!category) notFound();

  const [programs, categories] = await Promise.all([
    getPrograms(category.id, sp.q, sp.sort),
    getCategories(),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          {category.name}
        </h1>
        <p className="text-subtext text-lg">
          {category.name} 카테고리의 마케팅 자동화 프로그램
        </p>
      </div>

      {/* Search + Sort */}
      <Suspense>
        <div className="mb-6">
          <ProgramSearch basePath={`/programs/category/${slug}`} />
        </div>
      </Suspense>

      {/* Category Filter */}
      <Suspense>
        <div className="mb-8">
          <CategoryNav categories={categories} activeSlug={slug} />
        </div>
      </Suspense>

      {/* Results count */}
      {sp.q && (
        <p className="text-subtext text-sm mb-4">
          &quot;{sp.q}&quot; 검색 결과: {programs.length}개
        </p>
      )}

      {/* Programs Grid */}
      {programs.length === 0 ? (
        <div className="text-center py-20 text-subtext">
          {sp.q ? (
            <>
              <p className="text-xl mb-2">&quot;{sp.q}&quot; 검색 결과가 없습니다</p>
              <p className="text-sm">다른 키워드로 검색해보세요</p>
            </>
          ) : (
            <>
              <p className="text-xl mb-2">이 카테고리에 등록된 프로그램이 없습니다</p>
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
