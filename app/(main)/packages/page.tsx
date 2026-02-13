import type { Metadata } from "next";
import Link from "next/link";
import { Check, Zap, Crown, Rocket } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GoldGradientText from "@/components/ui/GoldGradientText";
import GoldButton from "@/components/ui/GoldButton";
import { createClient } from "@/lib/supabase/server";
import { formatKRW } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "패키지 & 요금제",
  description: "AI Master의 다양한 구독 플랜을 비교하고 나에게 맞는 요금제를 선택하세요. 월별, 6개월, 12개월, 평생 플랜 제공.",
  openGraph: {
    title: "패키지 & 요금제 | AI Master",
    description: "AI 마케팅 자동화 프로그램 요금제를 비교해보세요.",
  },
};

const PACKAGES = [
  {
    icon: Zap,
    name: "스타터",
    desc: "마케팅 자동화를 시작하는 분께",
    features: ["프로그램 1개 선택", "기본 고객 지원", "월별 업데이트"],
    highlight: false,
    cta: "시작하기",
  },
  {
    icon: Crown,
    name: "프로",
    desc: "본격적인 마케팅 자동화에",
    features: [
      "프로그램 3개 선택",
      "우선 고객 지원",
      "모든 업데이트 포함",
      "전용 커뮤니티 접근",
    ],
    highlight: true,
    cta: "가장 인기",
  },
  {
    icon: Rocket,
    name: "엔터프라이즈",
    desc: "팀/기업 단위 사용에",
    features: [
      "모든 프로그램 이용",
      "전담 매니저 배정",
      "커스텀 기능 요청",
      "API 접근 권한",
      "팀 계정 관리",
    ],
    highlight: false,
    cta: "문의하기",
  },
];

export default async function PackagesPage() {
  const supabase = await createClient();
  const { data: programs } = await supabase
    .from("programs")
    .select("id, name, slug, short_desc, pricing_plans(*)")
    .eq("is_active", true)
    .order("sort_order");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero */}
      <div className="text-center mb-16">
        <h1 className="text-3xl md:text-5xl font-black text-white mb-4">
          합리적인 <GoldGradientText>패키지</GoldGradientText> 플랜
        </h1>
        <p className="text-subtext text-lg max-w-2xl mx-auto">
          여러 프로그램을 묶어 더 저렴하게 이용하세요.
          필요에 따라 스타터부터 엔터프라이즈까지 선택 가능합니다.
        </p>
      </div>

      {/* Package Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-20">
        {PACKAGES.map(({ icon: Icon, name, desc, features, highlight, cta }) => (
          <GlassCard
            key={name}
            glow={highlight}
            className={`flex flex-col ${highlight ? "border-gold/40" : ""}`}
          >
            {highlight && (
              <div className="text-center mb-3">
                <span className="bg-gold text-black text-xs font-bold px-3 py-1 rounded-full">
                  MOST POPULAR
                </span>
              </div>
            )}
            <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center mb-4">
              <Icon size={22} className="text-gold" />
            </div>
            <h3 className="text-xl font-bold text-white mb-1">{name}</h3>
            <p className="text-subtext text-sm mb-6">{desc}</p>

            <ul className="space-y-3 flex-1 mb-6">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-subtext">
                  <Check size={14} className="text-gold mt-0.5 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <Link href={name === "엔터프라이즈" ? "/support" : "/programs"}>
              <GoldButton variant={highlight ? "gold" : "outline"} fullWidth>
                {cta}
              </GoldButton>
            </Link>
          </GlassCard>
        ))}
      </div>

      {/* Available Programs */}
      {programs && programs.length > 0 && (
        <div>
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
              패키지에 포함 가능한 <GoldGradientText>프로그램</GoldGradientText>
            </h2>
            <p className="text-subtext">원하는 프로그램을 조합하여 패키지를 구성하세요</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {programs.map((p) => {
              const minPrice = p.pricing_plans
                ?.filter((plan: { is_active: boolean }) => plan.is_active)
                .sort((a: { price: number }, b: { price: number }) => a.price - b.price)[0];

              return (
                <Link key={p.id} href={`/programs/${p.slug}`}>
                  <GlassCard hover className="flex items-center gap-4 p-4">
                    <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
                      <Zap size={18} className="text-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium text-sm truncate">{p.name}</h3>
                      {p.short_desc && (
                        <p className="text-subtext text-xs truncate">{p.short_desc}</p>
                      )}
                    </div>
                    {minPrice && (
                      <span className="text-gold text-sm font-bold flex-shrink-0">
                        {formatKRW(minPrice.price)}~
                      </span>
                    )}
                  </GlassCard>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
