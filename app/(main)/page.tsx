import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "AI Master — AI 마케팅 자동화 프로그램",
  description: "AI 마케팅 프로그램으로 시간을 절약하고 매출을 극대화하세요. SNS 자동화, 키워드 분석 등 검증된 도구를 제공합니다.",
  openGraph: {
    title: "AI Master — AI 마케팅 자동화 프로그램",
    description: "AI 마케팅 프로그램으로 시간을 절약하고 매출을 극대화하세요.",
  },
};

import Link from "next/link";
import { ArrowRight, Zap, Shield, TrendingUp, Users, Info, GraduationCap } from "lucide-react";
import GoldButton from "@/components/ui/GoldButton";
import GoldGradientText from "@/components/ui/GoldGradientText";
import GlassCard from "@/components/ui/GlassCard";
import ProgramCard from "@/components/programs/ProgramCard";
import NoticeTabs from "@/components/home/NoticeTabs";
import CategoryQuickBar from "@/components/home/CategoryQuickBar";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { evaluateProgramAccess } from "@/lib/access/checkProgramAccess";
import { getProgramAccessMap } from "@/lib/access/getProgramAccessMap";
import { sortByLikes } from "@/lib/programs/likes";
import { daysRemaining } from "@/lib/utils/format";

interface UserAccessSummary {
  accessibleCount: number;
  expiryLabel: string;
}

async function getHomeData() {
  try {
    const supabase = await createClient();
    const service = createServiceClient();
    const [{ data: { user } }, { data: programs }, { data: categories }, { count: activeUserCount }] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from("programs")
        .select("*, category:categories(*), pricing_plans(*)")
        .eq("is_active", true)
        .order("sort_order"),
      supabase.from("categories").select("*").is("parent_id", null).order("sort_order"),
      // 홈페이지의 활성 사용자 수는 홍보용 고정 숫자가 아니라 실제 회원 데이터로
      // 계산한다. 정지 회원은 제외하고, 관리자 포함 전체 활성 계정을 집계한다.
      service.from("profiles").select("id", { count: "exact", head: true }).eq("is_suspended", false),
    ]);

    // 로그인한 회원에게만 "내가 이용 가능한 프로그램 수 / 가장 빠른 만료일"을 보여준다.
    // 판정 규칙은 반드시 lib/access/checkProgramAccess.ts의 evaluateProgramAccess()를
    // 재사용한다 — /dashboard와 동일한 규칙(구독 -> 개별부여 -> 등급)이어야 두 화면의
    // 숫자가 서로 어긋나지 않는다.
    const accessByProgramId = await getProgramAccessMap(supabase, programs ?? []);
    let userAccess: UserAccessSummary | null = null;
    let isAdminUser = false;
    let likedIds: string[] = [];
    if (user) {
      const { data: likedRows } = await supabase.from("program_likes").select("program_id").eq("user_id", user.id);
      likedIds = (likedRows ?? []).map((row) => row.program_id as string);
      const [{ data: profile }, { data: subs }, { data: grants }, { data: grades }] = await Promise.all([
        supabase.from("profiles").select("is_admin, is_suspended, grade:member_grades(sort_order)").eq("id", user.id).maybeSingle(),
        supabase.from("subscriptions").select("program_id, status, expires_at").eq("user_id", user.id),
        supabase.from("user_program_access").select("program_id, expires_at").eq("user_id", user.id),
        supabase.from("member_grades").select("id, sort_order"),
      ]);

      isAdminUser = !!profile?.is_admin;
      const now = new Date();
      const gradeSortMap = new Map((grades ?? []).map((g) => [g.id, g.sort_order]));
      const userGrade = Array.isArray(profile?.grade) ? profile?.grade[0] : profile?.grade;

      const subExpiryMap = new Map<string, string | null>(
        (subs ?? [])
          .filter((s) => s.status === "active" && (!s.expires_at || new Date(s.expires_at) > now))
          .map((s) => [s.program_id, s.expires_at])
      );
      const grantMap = new Map<string, string | null>(
        (grants ?? [])
          .filter((g) => !g.expires_at || new Date(g.expires_at) > now)
          .map((g) => [g.program_id, g.expires_at])
      );

      const accessiblePrograms = (programs ?? []).filter((p) =>
        evaluateProgramAccess({
          isAdmin: !!profile?.is_admin,
          isSuspended: !!profile?.is_suspended,
          isFree: (p.badges ?? []).includes("free"),
          requiredGradeId: p.required_grade_id,
          hasActiveSubscription: subExpiryMap.has(p.id),
          hasIndividualGrant: grantMap.has(p.id),
          individualGrantExpiresAt: grantMap.get(p.id) ?? null,
          userGradeSortOrder: userGrade?.sort_order ?? null,
          requiredGradeSortOrder: p.required_grade_id ? (gradeSortMap.get(p.required_grade_id) ?? null) : null,
        }).allowed
      );

      // 여러 프로그램 중 가장 빨리 끝나는 만료일 하나만 대표로 보여준다(개별 확인은
      // /dashboard에서). 구독/개별부여 둘 다 없이 등급만으로 이용 중인 프로그램은
      // 만료 개념이 없어 계산에서 제외한다.
      let soonestDatedExpiry: string | null = null;
      let hasAnyTimedAccess = false;
      for (const p of accessiblePrograms) {
        const expiry = subExpiryMap.has(p.id) ? subExpiryMap.get(p.id)! : grantMap.has(p.id) ? grantMap.get(p.id)! : undefined;
        if (expiry === undefined) continue;
        hasAnyTimedAccess = true;
        if (expiry !== null && (!soonestDatedExpiry || expiry < soonestDatedExpiry)) soonestDatedExpiry = expiry;
      }

      userAccess = {
        accessibleCount: accessiblePrograms.length,
        expiryLabel: hasAnyTimedAccess
          ? daysRemaining(soonestDatedExpiry)
          : accessiblePrograms.length > 0
            ? "등급 기준 무제한"
            : "-",
      };
    }

    return { programs: programs ?? [], categories: categories ?? [], accessByProgramId, userAccess, activeUserCount: activeUserCount ?? 0, isAdminUser, likedIds, loggedIn: Boolean(user) };
  } catch {
    return { programs: [], categories: [], accessByProgramId: new Map<string, boolean>(), userAccess: null as UserAccessSummary | null, activeUserCount: 0, isAdminUser: false, likedIds: [] as string[], loggedIn: false };
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

export default async function HomePage() {
  const { programs, categories, accessByProgramId, userAccess, isAdminUser, likedIds, loggedIn } = await getHomeData();
  const likedSet = new Set(likedIds);
  const freeProgramCount = programs.filter((p) => (p.badges ?? []).includes("free")).length;
  const paidProgramCount = programs.length - freeProgramCount;
  // 이달의 무료 프로그램 / 추천 프로그램 — 추천(♥)을 많이 받은 순으로 왼쪽→오른쪽 나열
  const freePrograms = sortByLikes(programs.filter((p) => (p.badges ?? []).includes("free"))).slice(0, 12);
  const recommendedPrograms = sortByLikes(programs.filter((p) => (p.badges ?? []).includes("recommended"))).slice(0, 12);
  const latestPrograms = [...programs]
    .sort((a, b) => {
      const aPinned = (a.badges ?? []).includes("new") ? 1 : 0;
      const bPinned = (b.badges ?? []).includes("new") ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, 3);
  const categoryBlocks = categories
    .map((category) => ({
      category,
      programs: programs.filter((p) => p.category_id === category.id),
    }))
    .filter((block) => block.programs.length > 0);

  return (
    <div className="overflow-x-clip">
      {/* Hero */}
      <section className="relative flex items-center justify-center px-4 pt-24 pb-0">
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
            AI 마케팅 프로그램으로 시간을 절약하고
            <br className="hidden md:block" />
            매출을 극대화하세요.
          </p>

          {/* Hero CTA — Primary(골드) 중심 + 모바일 반응형(상단 와이드 + 하단 2열) 정돈 */}
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 justify-center max-w-xl mx-auto">
            <Link href="/programs" className="w-full sm:w-auto">
              <GoldButton size="lg" className="w-full sm:w-auto gap-2 justify-center shadow-lg shadow-gold/10">
                프로그램 둘러보기 <ArrowRight size={18} />
              </GoldButton>
            </Link>

            <div className="grid grid-cols-2 gap-2.5 w-full sm:flex sm:w-auto">
              <Link href="/guides" className="w-full sm:w-auto">
                <button
                  type="button"
                  className="w-full sm:w-auto px-4 py-3 rounded-xl bg-gold/[0.08] hover:bg-gold/[0.15] border border-gold/40 hover:border-gold/70 text-gold font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  API키·플랫폼연동
                </button>
              </Link>
              <Link href="/revenue-share" className="w-full sm:w-auto">
                <button
                  type="button"
                  className="w-full sm:w-auto px-4 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 text-subtext hover:text-white font-medium text-sm sm:text-base transition-all flex items-center justify-center gap-1.5"
                >
                  수익 공유 안내
                </button>
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* KPI 통계 카드 */}
      <section className="px-4 pt-12 pb-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <GlassCard className="p-4 text-center">
            <div className="text-2xl md:text-3xl font-black gold-text mb-1">{programs.length}</div>
            <div className="text-subtext text-xs">현재 등록된 자동화 프로그램</div>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <div className="text-2xl md:text-3xl font-black gold-text mb-1">{userAccess?.accessibleCount ?? programs.length}</div>
            <div className="text-subtext text-xs">내가 이용 가능한 프로그램</div>
          </GlassCard>
          <GlassCard className="p-4 text-center col-span-2 md:col-span-1">
            <div className="text-2xl md:text-3xl font-black gold-text mb-1">{userAccess?.expiryLabel ?? "평생"}</div>
            <div className="text-subtext text-xs">가장 빠른 이용 만료</div>
          </GlassCard>
        </div>
      </section>

      {/* 이용 안내 & 드림팀 혜택 — 슬림 2-Tab 스마트 인터페이스 */}
      <section className="px-4 pb-8">
        <div className="max-w-4xl mx-auto">
          <NoticeTabs />
        </div>
      </section>

      {/* 14대 표준 카테고리 퀵 내비게이션 바 (가로 롤링 & 원스톱 스크롤) */}
      <CategoryQuickBar categories={categories} totalCount={programs.length} />

      {/* 최신 등록 프로그램 — NEW로 지정한 프로그램을 우선하고, 나머지는 등록일 최신순 */}
      {latestPrograms.length > 0 && (
        <section id="program-catalog" className="py-16 px-4 bg-surface/20 scroll-mt-20">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white">
                  최신 등록 <GoldGradientText>프로그램</GoldGradientText>
                </h2>
                <p className="text-subtext mt-2">새로 추가된 프로그램을 먼저 확인해보세요.</p>
              </div>
              <Link href="/programs" className="hidden md:block">
                <GoldButton variant="outline" size="sm">전체 프로그램 보기 <ArrowRight size={14} /></GoldButton>
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {latestPrograms.map((program) => (
                <ProgramCard key={program.id} program={program} hasAccess={accessByProgramId.get(program.id)} isAdmin={isAdminUser} liked={likedSet.has(program.id)} loggedIn={loggedIn} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 이달의 무료 프로그램 — FREE 뱃지가 달린 프로그램, 추천(♥) 많은 순 */}
      {freePrograms.length > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-white">
                이달의 <GoldGradientText>무료 프로그램</GoldGradientText>
              </h2>
              <p className="text-subtext mt-2">회원가입만 하면 무료로 쓸 수 있는 프로그램입니다. 마음에 드는 프로그램에 ♥ 추천을 눌러 주세요 — 추천을 많이 받은 순서로 보여 드립니다.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {freePrograms.map((program) => (
                <ProgramCard key={program.id} program={program} hasAccess={accessByProgramId.get(program.id)} isAdmin={isAdminUser} liked={likedSet.has(program.id)} loggedIn={loggedIn} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 이달의 추천 프로그램 — 관리자가 추천 뱃지를 단 프로그램, 추천(♥) 많은 순 */}
      {recommendedPrograms.length > 0 && (
        <section className="py-16 px-4 bg-surface/20">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-white">
                이달의 <GoldGradientText>추천 프로그램</GoldGradientText>
              </h2>
              <p className="text-subtext mt-2">운영자가 추천하는 프로그램입니다. 회원 ♥ 추천 투표가 많은 순서로 왼쪽부터 보여 드립니다.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {recommendedPrograms.map((program) => (
                <ProgramCard key={program.id} program={program} hasAccess={accessByProgramId.get(program.id)} isAdmin={isAdminUser} liked={likedSet.has(program.id)} loggedIn={loggedIn} />
              ))}
            </div>
          </div>
        </section>
      )}

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
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-14">
              <div className="text-center lg:text-left">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  카테고리별 <GoldGradientText>프로그램</GoldGradientText>
                </h2>
                <p className="text-subtext">필요한 플랫폼에 맞는 자동화 도구를 찾아보세요</p>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full lg:w-auto lg:min-w-[220px]">
                <GlassCard className="p-2.5 text-center">
                  <div className="text-xl font-black gold-text leading-none mb-1">{freeProgramCount}</div>
                  <div className="text-subtext text-[11px]">무료 프로그램</div>
                </GlassCard>
                <GlassCard className="p-2.5 text-center">
                  <div className="text-xl font-black gold-text leading-none mb-1">{paidProgramCount}</div>
                  <div className="text-subtext text-[11px]">유료 프로그램</div>
                </GlassCard>
              </div>
            </div>

            <div className="space-y-16">
              {categoryBlocks.map(({ category, programs: catPrograms }) => (
                <div key={category.id} id={`category-${category.slug}`} className="scroll-mt-36">
                  <div className="flex items-end justify-between mb-6">
                    <h3 className="text-2xl font-bold text-white">{category.name}</h3>
                    <Link href={`/programs/category/${category.slug}`} className="hidden md:block">
                      <GoldButton variant="outline" size="sm">
                        전체 보기 <ArrowRight size={14} />
                      </GoldButton>
                    </Link>
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {catPrograms.map((program) => (
                      <ProgramCard key={program.id} program={program} hasAccess={accessByProgramId.get(program.id)} isAdmin={isAdminUser} liked={likedSet.has(program.id)} loggedIn={loggedIn} />
                    ))}
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
