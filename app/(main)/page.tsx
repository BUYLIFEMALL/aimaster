import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Master — AI 마케팅 자동화 프로그램",
  description: "AI 기반 마케팅 자동화 프로그램으로 시간을 절약하고 매출을 극대화하세요. SNS 자동화, 키워드 분석 등 검증된 도구를 제공합니다.",
  openGraph: {
    title: "AI Master — AI 마케팅 자동화 프로그램",
    description: "AI 기반 마케팅 자동화 프로그램으로 시간을 절약하고 매출을 극대화하세요.",
  },
};

import Link from "next/link";
import { ArrowRight, Zap, Shield, TrendingUp, Users } from "lucide-react";
import GoldButton from "@/components/ui/GoldButton";
import GoldGradientText from "@/components/ui/GoldGradientText";
import GlassCard from "@/components/ui/GlassCard";
import ProgramCard from "@/components/programs/ProgramCard";
import { createClient } from "@/lib/supabase/server";

async function getHomeData() {
  try {
    const supabase = await createClient();
    const [{ data: programs }, { data: categories }] = await Promise.all([
      supabase
        .from("programs")
        .select("*, category:categories(*), pricing_plans(*)")
        .eq("is_active", true)
        .order("sort_order"),
      supabase.from("categories").select("*").is("parent_id", null).order("sort_order"),
    ]);
    return { programs: programs ?? [], categories: categories ?? [] };
  } catch {
    return { programs: [], categories: [] };
  }
}

const FEATURES = [
  {
    icon: Zap,
    title: "즉시 사용 가능",
    desc: "결제 후 바로 접근. 설치 없이 웹 기반으로 어디서나",
  },
  {
    icon: Shield,
    title: "안전한 구독 관리",
    desc: "월별·6개월·12개월·평생 플랜. 언제든 관리",
  },
  {
    icon: TrendingUp,
    title: "지속적인 업데이트",
    desc: "AI 트렌드에 맞춰 지속적으로 기능이 업데이트됩니다",
  },
  {
    icon: Users,
    title: "수익 공유 프로그램",
    desc: "추천 링크로 판매할 때마다 수수료 자동 정산",
  },
];

const STATS = [
  { value: "1,200+", label: "활성 사용자" },
  { value: "15+", label: "마케팅 프로그램" },
  { value: "98%", label: "고객 만족도" },
  { value: "24/7", label: "상시 운영" },
];

export default async function HomePage() {
  const { programs, categories } = await getHomeData();

  const categoryBlocks = categories
    .map((category) => ({
      category,
      programs: programs.filter((p) => p.category_id === category.id),
    }))
    .filter((block) => block.programs.length > 0);

  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative min-h-[85vh] flex items-center justify-center px-4">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold/5 rounded-full blur-[120px]" />
          <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-gold/3 rounded-full blur-[80px]" />
        </div>

        <div className="relative text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/30 text-gold text-sm font-medium mb-8">
            <Zap size={14} />
            AI 마케팅 자동화의 새로운 기준
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
            <span className="text-white">마케팅을</span>
            <br />
            <GoldGradientText>자동화하세요</GoldGradientText>
          </h1>

          <p className="text-subtext text-xl md:text-2xl mb-10 max-w-2xl mx-auto leading-relaxed">
            AI 기반 마케팅 프로그램으로 시간을 절약하고
            <br className="hidden md:block" />
            매출을 극대화하세요.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/programs">
              <GoldButton size="lg" className="gap-2">
                프로그램 둘러보기 <ArrowRight size={18} />
              </GoldButton>
            </Link>
            <Link href="/revenue-share">
              <GoldButton variant="outline" size="lg">
                수익 공유 알아보기
              </GoldButton>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-4 border-y border-white/10">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-4xl font-black gold-text mb-1">{stat.value}</div>
              <div className="text-subtext text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              왜 <GoldGradientText>AI Master</GoldGradientText>인가?
            </h2>
            <p className="text-subtext text-lg">
              검증된 마케팅 자동화 도구를 한 곳에서
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <GlassCard key={title} className="text-center">
                <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center mx-auto mb-4">
                  <Icon size={22} className="text-gold" />
                </div>
                <h3 className="text-white font-semibold mb-2">{title}</h3>
                <p className="text-subtext text-sm leading-relaxed">{desc}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Programs Showcase — 카테고리별 블록 */}
      {categoryBlocks.length > 0 && (
        <section className="py-20 px-4 bg-surface/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                카테고리별 <GoldGradientText>프로그램</GoldGradientText>
              </h2>
              <p className="text-subtext">필요한 플랫폼에 맞는 자동화 도구를 찾아보세요</p>
            </div>

            <div className="space-y-16">
              {categoryBlocks.map(({ category, programs: catPrograms }) => (
                <div key={category.id}>
                  <div className="flex items-end justify-between mb-6">
                    <h3 className="text-2xl font-bold text-white">{category.name}</h3>
                    <Link href={`/programs/category/${category.slug}`} className="hidden md:block">
                      <GoldButton variant="outline" size="sm">
                        전체 보기 <ArrowRight size={14} />
                      </GoldButton>
                    </Link>
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {catPrograms.slice(0, 3).map((program) => (
                      <ProgramCard key={program.id} program={program} />
                    ))}
                  </div>
                  <div className="mt-6 text-center md:hidden">
                    <Link href={`/programs/category/${category.slug}`}>
                      <GoldButton variant="outline" size="sm">
                        {category.name} 전체 보기
                      </GoldButton>
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-16 text-center">
              <Link href="/programs">
                <GoldButton variant="outline">전체 프로그램 보기</GoldButton>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <GlassCard glow>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              지금 시작할 준비가 됐나요?
            </h2>
            <p className="text-subtext text-lg mb-8">
              무료 회원가입 후 원하는 프로그램을 구독하세요.
              <br />
              추천 링크로 수익도 함께 만드세요.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <GoldButton size="lg">무료로 시작하기</GoldButton>
              </Link>
              <Link href="/programs">
                <GoldButton variant="outline" size="lg">
                  프로그램 보기
                </GoldButton>
              </Link>
            </div>
          </GlassCard>
        </div>
      </section>
    </div>
  );
}
