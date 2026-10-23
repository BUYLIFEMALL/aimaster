import { KeyRound, Sparkles, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import GoldGradientText from "@/components/ui/GoldGradientText";
import GuideHub, { GuideRow } from "@/components/guides/GuideHub";
import type { Program } from "@/types/database.types";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "이용 가이드 · API연동 & 서브프로그램 매뉴얼 | AIMaster",
  description: "초보자도 3분 만에 끝내는 OpenAI, Gemini, Claude, 인스타그램, Threads API 연동 및 서브프로그램 실전 매뉴얼",
};

export default async function GuideListPage() {
  const supabase = await createClient();

  const [{ data: guides }, { data: categories }, { data: programs }] = await Promise.all([
    supabase
      .from("platform_guides")
      .select("id, category, title, sort_order")
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true }),
    supabase
      .from("platform_guide_categories")
      .select("name, sort_order")
      .order("sort_order", { ascending: true }),
    supabase
      .from("programs")
      .select(`
        id,
        name,
        slug,
        short_desc,
        app_url,
        badges,
        is_active,
        sort_order,
        category:categories(id, name, slug)
      `)
      .order("sort_order", { ascending: true }),
  ]);

  const guideList = (guides ?? []) as GuideRow[];
  const programList = ((programs ?? []) as unknown as Program[]).filter((p) => p.is_active !== false);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* 1. 상단 히어로 헤더 */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-400/10 to-yellow-400/10 border border-amber-400/30 text-amber-300 text-xs sm:text-sm font-bold mb-4 shadow-sm">
          <KeyRound size={14} className="text-amber-400" />
          <span>API생성 · 플랫폼연동 & 서브프로그램 마스터 가이드</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-white mb-4 tracking-tight">
          <GoldGradientText>AI Master</GoldGradientText> 종합 이용 가이드북
        </h1>

        <p className="text-subtext text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          복잡한 API 발급과 플랫폼 연동을 초보자도 3분 만에 끝낼 수 있도록
          <br className="hidden sm:inline" />
          단계별 실전 매뉴얼과 서브프로그램 사용법을 완벽히 정리했습니다.
        </p>

        {/* 3대 보안 및 편의 뱃지 */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-xs text-white/70">
          <span className="flex items-center gap-1 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
            <ShieldCheck size={13} className="text-emerald-400" />
            <span>개인 API 키 100% 분리 격리</span>
          </span>
          <span className="flex items-center gap-1 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
            <Sparkles size={13} className="text-amber-400" />
            <span>원클릭 공식 콘솔 직링크 지원</span>
          </span>
          <span className="flex items-center gap-1 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
            <KeyRound size={13} className="text-cyan-400" />
            <span>82개 전 솔루션 사용 매뉴얼 연동</span>
          </span>
        </div>
      </div>

      {/* 2. 가이드 허브 (탭 스위처, 실시간 검색, 카테고리 필터, 카드 그리드) */}
      <GuideHub
        guides={guideList}
        programs={programList}
        categories={categories ?? []}
      />
    </div>
  );
}
