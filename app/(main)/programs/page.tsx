import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { Play } from "lucide-react";
import CategoryNav from "@/components/programs/CategoryNav";
import ProgramSearch from "@/components/programs/ProgramSearch";
import GlassCard from "@/components/ui/GlassCard";
import Badge from "@/components/ui/Badge";
import GoldButton from "@/components/ui/GoldButton";
import { formatKRW } from "@/lib/utils/format";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "프로그램 목록",
  description: "AI 마케팅 자동화 프로그램을 카테고리별로 찾아보세요.",
};

interface PageProps {
  searchParams: Promise<{ q?: string; sort?: string }>;
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
    default:
      dbQuery = dbQuery.order("sort_order");
  }

  const { data } = await dbQuery;
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
    getPrograms(params.q, params.sort),
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

      <Suspense>
        <div className="mb-6">
          <ProgramSearch />
        </div>
      </Suspense>

      <Suspense>
        <div className="mb-8">
          <CategoryNav categories={categories} />
        </div>
      </Suspense>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programs.map((program) => {
          const minPrice = program.pricing_plans
            ?.filter((p: any) => p.is_active)
            .sort((a: any, b: any) => a.price - b.price)[0];

          const executeUrl = program.app_url || (program.slug.includes("blog") || program.name.includes("블로그") ? "/blog" : null);

          return (
            <GlassCard key={program.id} hover className="flex flex-col h-full p-0 overflow-hidden">
              <div className="relative aspect-video bg-white/5 overflow-hidden">
                {program.thumbnail_url ? (
                  <Image src={program.thumbnail_url} alt={program.name} fill className="object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center">
                      <Play size={28} className="text-gold ml-1" />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-5 flex flex-col flex-1">
                {program.category && (
                  <span className="text-xs text-gold/70 font-medium mb-1">
                    {program.category.name}
                  </span>
                )}
                <h3 className="text-white font-semibold text-base mb-2 line-clamp-2 leading-snug">
                  {program.name}
                </h3>
                {program.short_desc && (
                  <p className="text-subtext text-sm line-clamp-2 mb-4 flex-1">
                    {program.short_desc}
                  </p>
                )}

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/10">
                  <div>
                    {minPrice ? (
                      <>
                        <span className="text-xs text-subtext">월 </span>
                        <span className="text-gold font-bold text-lg">
                          {formatKRW(minPrice.price)}
                        </span>
                        <span className="text-xs text-subtext"> ~</span>
                      </>
                    ) : (
                      <span className="text-subtext text-sm">가격 문의</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {executeUrl && (
                      <Link href={executeUrl}>
                        <button
                          type="button"
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-md transition-all hover:scale-105 active:scale-95 flex items-center gap-1 cursor-pointer border-none"
                        >
                          <Play size={12} className="fill-slate-950 text-slate-950" />
                          <span>실행하기</span>
                        </button>
                      </Link>
                    )}
                    <Link href={`/programs/${program.slug}`}>
                      <GoldButton size="sm">자세히 보기</GoldButton>
                    </Link>
                  </div>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
