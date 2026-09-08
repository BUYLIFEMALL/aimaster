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
import { ArrowRight, Zap, Shield, TrendingUp, Users, Info, GraduationCap } from "lucide-react";
import GoldButton from "@/components/ui/GoldButton";
import GoldGradientText from "@/components/ui/GoldGradientText";
import GlassCard from "@/components/ui/GlassCard";
import ProgramCard from "@/components/programs/ProgramCard";
import { createClient } from "@/lib/supabase/server";
import { evaluateProgramAccess } from "@/lib/access/checkProgramAccess";
import { daysRemaining } from "@/lib/utils/format";

interface UserAccessSummary {
  accessibleCount: number;
  expiryLabel: string;
}

async function getHomeData() {
  try {
    const supabase = await createClient();
    const [{ data: { user } }, { data: programs }, { data: categories }] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from("programs")
        .select("*, category:categories(*), pricing_plans(*)")
        .eq("is_active", true)
        .order("sort_order"),
      supabase.from("categories").select("*").is("parent_id", null).order("sort_order"),
    ]);

    // 로그인한 회원에게만 "내가 이용 가능한 프로그램 수 / 가장 빠른 만료일"을 보여준다.
    // 판정 규칙은 반드시 lib/access/checkProgramAccess.ts의 evaluateProgramAccess()를
    // 재사용한다 — /dashboard와 동일한 규칙(구독 -> 개별부여 -> 등급)이어야 두 화면의
    // 숫자가 서로 어긋나지 않는다.
    let userAccess: UserAccessSummary | null = null;
    if (user) {
      const [{ data: profile }, { data: subs }, { data: grants }, { data: grades }] = await Promise.all([
        supabase.from("profiles").select("is_admin, is_suspended, grade:member_grades(sort_order)").eq("id", user.id).maybeSingle(),
        supabase.from("subscriptions").select("program_id, status, expires_at").eq("user_id", user.id),
        supabase.from("user_program_access").select("program_id, expires_at").eq("user_id", user.id),
        supabase.from("member_grades").select("id, sort_order"),
      ]);

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

    return { programs: programs ?? [], categories: categories ?? [], userAccess };
  } catch {
    return { programs: [], categories: [], userAccess: null as UserAccessSummary | null };
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

interface NoticeItem {
  text: string;
  highlights: string[];
}

const NOTICE_ITEMS: NoticeItem[] = [
  {
    text: "서비스 중인 자동화 프로그램은 회원 개인별로 플랫폼별 본인의 API 키와 계정을 연동하여 사용할 수 있도록 제공됩니다.",
    highlights: ["자동화 프로그램", "개인별", "플랫폼별", "API 키와 계정"],
  },
  {
    text: "사용자별로 생성된 데이터는 본인만 볼 수 있으며, 보안이 적용된 서버에 개인별로 분리되어 저장됩니다.",
    highlights: [],
  },
  {
    text: "본 서비스는 프로그램 안정화를 위해 현재 베타(무료)로 서비스 중이며, 사용자들의 사용 트래픽 및 서버 사용량이 증가 시 일부 서비스는 유료로 전환될 예정임을 공지드립니다.",
    highlights: ["베타(무료)", "일부 서비스는 유료로 전환"],
  },
];

// 드림팀(수강생) 혜택만 따로 묶어서 보여준다 — 일반 안내와 섞여 있으면 "나는 해당 없는
// 내용"으로 오해하기 쉬워, 소제목으로 구분했다.
const DREAM_TEAM_ITEMS: NoticeItem[] = [
  {
    text: "드림팀 회원의 경우 대부분의 프로그램을 무료로 이용할 수 있습니다.",
    highlights: ["드림팀 회원", "무료로 이용"],
  },
  {
    text: "드림팀 혜택 제공을 위해 실명으로 가입해야 하며, 실명 확인이 안될 경우 일반사용자 등급으로 서비스가 제공됩니다.",
    highlights: ["실명으로 가입", "실명 확인이 안될 경우", "일반사용자 등급"],
  },
  {
    text: "트래픽 발생량이 많거나 서버 저장공간을 많이 사용되는 일부 프로그램은 유료(할인가 적용)로 제공됩니다.",
    highlights: ["일부 프로그램은 유료(할인가 적용)"],
  },
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 문구 중 강조하고 싶은 구절만 볼드 + 골드 색상으로 감싼다. */
function renderNoticeText(item: NoticeItem) {
  if (item.highlights.length === 0) return item.text;
  const pattern = new RegExp(`(${item.highlights.map(escapeRegExp).join("|")})`, "g");
  return item.text
    .split(pattern)
    .filter((part) => part.length > 0)
    .map((part, i) =>
      item.highlights.includes(part) ? (
        <strong key={i} className="font-bold text-gold">
          {part}
        </strong>
      ) : (
        <span key={i}>{part}</span>
      )
    );
}

const STATS = [
  { value: "1,200+", label: "활성 사용자" },
  { value: "15+", label: "마케팅 프로그램" },
  { value: "98%", label: "고객 만족도" },
  { value: "24/7", label: "상시 운영" },
];

export default async function HomePage() {
  const { programs, categories, userAccess } = await getHomeData();

  const categoryBlocks = categories
    .map((category) => ({
      category,
      programs: programs.filter((p) => p.category_id === category.id),
    }))
    .filter((block) => block.programs.length > 0);

  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative min-h-[55vh] flex items-center justify-center px-4 pt-24 pb-8">
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

      {/* 이용 안내 — 첫 방문자가 스크롤 한 번으로 바로 보도록 히어로 바로 아래에 배치
          (2026-09-08: 프로그램 목록 아래에 뒀더니 등록 프로그램이 많아 스크롤을 한참
          내려야 보인다는 신고로 위치를 옮김) */}
      <section className="px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          {/* 로그아웃 상태: 등록된 프로그램 수만. 로그인 상태: 회원 개인의 이용 가능
              프로그램 수 + 가장 빠른 만료일까지 함께 보여준다 */}
          <div className={`grid gap-4 mb-4 ${userAccess ? "grid-cols-2 md:grid-cols-3" : "grid-cols-1"}`}>
            <GlassCard className="p-4 text-center">
              <div className="text-2xl md:text-3xl font-black gold-text mb-1">{programs.length}</div>
              <div className="text-subtext text-xs">현재 등록된 자동화 프로그램</div>
            </GlassCard>
            {userAccess && (
              <>
                <GlassCard className="p-4 text-center">
                  <div className="text-2xl md:text-3xl font-black gold-text mb-1">{userAccess.accessibleCount}</div>
                  <div className="text-subtext text-xs">내가 이용 가능한 프로그램</div>
                </GlassCard>
                <GlassCard className="p-4 text-center col-span-2 md:col-span-1">
                  <div className="text-2xl md:text-3xl font-black gold-text mb-1">{userAccess.expiryLabel}</div>
                  <div className="text-subtext text-xs">가장 빠른 이용 만료</div>
                </GlassCard>
              </>
            )}
          </div>

          <div className="glass-card rounded-2xl border border-gold/30 bg-gold/[0.04] p-6 md:p-8">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                <Info size={18} className="text-gold" />
              </div>
              <h2 className="text-lg md:text-xl font-bold text-white">이용 안내</h2>
            </div>
            <ul className="space-y-3">
              {NOTICE_ITEMS.map((item) => (
                <li key={item.text} className="flex items-start gap-2.5 text-subtext text-sm md:text-base leading-relaxed">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-gold/60 shrink-0" />
                  <span>{renderNoticeText(item)}</span>
                </li>
              ))}
            </ul>

            {/* 드림팀(수강생) 혜택 — 일반 안내와 섞이지 않도록 소제목으로 구분 */}
            <div className="mt-6 pt-5 border-t border-gold/20">
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap size={16} className="text-gold" />
                <h3 className="text-sm md:text-base font-bold text-gold">드림팀·드림AI팀 - 수강생 혜택</h3>
              </div>
              <ul className="space-y-3">
                {DREAM_TEAM_ITEMS.map((item) => (
                  <li key={item.text} className="flex items-start gap-2.5 text-subtext text-sm md:text-base leading-relaxed">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-gold/60 shrink-0" />
                    <span>{renderNoticeText(item)}</span>
                  </li>
                ))}
              </ul>
            </div>
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
                    {catPrograms.map((program) => (
                      <ProgramCard key={program.id} program={program} />
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
