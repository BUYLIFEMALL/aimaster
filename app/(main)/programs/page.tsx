import { Suspense } from "react";
import ProgramCard from "@/components/programs/ProgramCard";
import CategoryNav from "@/components/programs/CategoryNav";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ category?: string; page?: string }>;
}

async function getPrograms(categorySlug?: string) {
  const supabase = await createClient();

  let query = supabase
    .from("programs")
    .select("*, category:categories(*), pricing_plans(*)")
    .eq("is_active", true)
    .order("sort_order");

  if (categorySlug) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", categorySlug)
      .single();
    if (cat) query = query.eq("category_id", cat.id);
  }

  const { data } = await query;
  return data ?? [];
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
    getPrograms(params.category),
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

      {/* Category Filter */}
      <Suspense>
        <div className="mb-8">
          <CategoryNav categories={categories} activeSlug={params.category} />
        </div>
      </Suspense>

      {/* Programs Grid */}
      {programs.length === 0 ? (
        <div className="text-center py-20 text-subtext">
          <p className="text-xl mb-2">등록된 프로그램이 없습니다</p>
          <p className="text-sm">곧 새로운 프로그램이 업로드될 예정입니다</p>
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
