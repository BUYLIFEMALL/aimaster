import { notFound } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Play, Lock } from "lucide-react";
import Link from "next/link";
import GoldGradientText from "@/components/ui/GoldGradientText";
import PaymentController from "@/components/payment/PaymentController";
import HeroSubscribeButton from "@/components/programs/HeroSubscribeButton";
import { createClient } from "@/lib/supabase/server";
import { checkProgramAccess } from "@/lib/access/checkProgramAccess";
import type { MemberGrade } from "@/types/database.types";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("programs")
    .select("name, short_desc, thumbnail_url")
    .eq("slug", slug)
    .single();
  if (!data) return { title: "Not Found" };

  const title = data.name;
  const description = data.short_desc || `${data.name} - AI Master 마케팅 자동화 프로그램`;

  return {
    title,
    description,
    openGraph: {
      title: `${data.name} | AI Master`,
      description,
      ...(data.thumbnail_url && { images: [{ url: data.thumbnail_url, width: 1200, height: 630 }] }),
    },
  };
}

export default async function ProgramDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: program } = await supabase
    .from("programs")
    .select("*, category:categories(*), pricing_plans(*), required_grade:member_grades!required_grade_id(*)")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!program) notFound();

  // 필요 등급 정보 (계층적)
  const requiredGrade: MemberGrade | null = program.required_grade
    ? (Array.isArray(program.required_grade) ? program.required_grade[0] : program.required_grade)
    : null;
  const hasGradeRestriction = !!requiredGrade;

  // 현재 사용자 등급 확인
  let userGrade: MemberGrade | null = null;
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("grade_id, grade:member_grades(*)")
      .eq("id", user.id)
      .single();
    if (profile?.grade) {
      userGrade = Array.isArray(profile.grade) ? profile.grade[0] : profile.grade;
    }
  }

  // 접근 판정(구독 -> 개별부여 -> 등급)은 lib/access/checkProgramAccess.ts로 통일 —
  // 이 페이지가 예전에 자체 등급 비교만 하고 구독 여부를 아예 안 봤던 것과 같은 재발을
  // 막기 위해 화면마다 새로 짜지 않고 이 공용 함수를 재사용한다.
  const accessResult = user ? await checkProgramAccess(supabase, user.id, slug) : null;

  // 수량 제한 체크 (프로그램별 접근 판정과는 별개 개념이라 여기서 따로 계산)
  let reachedLimit = false;
  let maxPrograms: number | null = null;
  if (user && userGrade) {
    maxPrograms = userGrade.max_programs;
    if (maxPrograms != null) {
      const { count } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "active");
      reachedLimit = (count ?? 0) >= maxPrograms;
    }
  }

  const isAccessAllowed = !!accessResult?.allowed && !reachedLimit;

  const activePlans = (program.pricing_plans ?? []).filter((p: { is_active: boolean }) => p.is_active);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Back */}
      <Link
        href="/programs"
        className="inline-flex items-center gap-2 text-subtext hover:text-white text-sm mb-8 transition-colors"
      >
        <ArrowLeft size={16} />
        프로그램 목록으로
      </Link>

      {/* Hero */}
      <div className="grid lg:grid-cols-2 gap-12 mb-16">
        {/* Media */}
        <div className="space-y-4">
          {program.video_url ? (
            <div className="aspect-video rounded-2xl overflow-hidden bg-black">
              <iframe
                src={program.video_url}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : program.thumbnail_url ? (
            <div className="aspect-video rounded-2xl overflow-hidden relative">
              <Image
                src={program.thumbnail_url}
                alt={program.name}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="aspect-video rounded-2xl bg-white/5 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-gold/10 flex items-center justify-center">
                <Play size={36} className="text-gold ml-1" />
              </div>
            </div>
          )}

          {/* Gallery */}
          {program.images && program.images.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {program.images.slice(0, 3).map((img: string, i: number) => (
                <div key={i} className="aspect-video rounded-xl overflow-hidden relative">
                  <Image src={img} alt={`${program.name} ${i + 1}`} fill className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            {program.category && (
              <span className="text-gold/70 text-sm font-medium">{program.category.name}</span>
            )}
            {requiredGrade && (
              <span
                className="text-xs px-2 py-0.5 rounded-full border"
                style={{ borderColor: requiredGrade.color ?? "#d4af37", color: requiredGrade.color ?? "#d4af37" }}
              >
                {requiredGrade.name} 이상
              </span>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white mt-2 mb-4">
            {program.name}
          </h1>
          {program.short_desc && (
            <p className="text-subtext text-lg leading-relaxed mb-6">{program.short_desc}</p>
          )}

          {/* Quick pricing summary */}
          {activePlans.length > 0 && (
            <div className="glass-card rounded-xl p-5 mb-6">
              <p className="text-sm text-subtext mb-3">이용 요금</p>
              <div className="flex flex-wrap gap-3">
                {activePlans.map((plan: { id: string; name: string; price: number; billing_type: string }) => (
                  <div key={plan.id} className="text-center">
                    <div className="text-xs text-subtext mb-0.5">
                      {plan.billing_type === "monthly" ? "1개월"
                        : plan.billing_type === "biannual" ? "6개월"
                        : plan.billing_type === "annual" ? "12개월"
                        : "평생"}
                    </div>
                    <div className="gold-text font-bold">
                      {new Intl.NumberFormat("ko-KR").format(plan.price)}원
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isAccessAllowed && program.app_url ? (
            <a href={program.app_url} target="_blank" rel="noopener noreferrer" className="block">
              <button
                type="button"
                className="btn-gold w-full py-4 text-lg rounded-xl font-bold cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-lg"
              >
                지금 바로 이용하기
              </button>
            </a>
          ) : (
            <HeroSubscribeButton />
          )}
        </div>
      </div>

      {/* Description */}
      {program.description && (
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">
            프로그램 <GoldGradientText>소개</GoldGradientText>
          </h2>
          <div
            className="prose prose-invert prose-gold max-w-none text-subtext leading-relaxed"
            dangerouslySetInnerHTML={{ __html: program.description }}
          />
        </section>
      )}

      {/* Pricing */}
      {activePlans.length > 0 && (
        <section id="pricing" className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-2">
            요금 <GoldGradientText>플랜</GoldGradientText>
          </h2>
          <p className="text-subtext mb-8">필요에 맞는 플랜을 선택하세요</p>

          {!isAccessAllowed ? (
            <div className="glass-card rounded-2xl p-8 text-center">
              <Lock size={40} className="text-gold mx-auto mb-4" />
              {reachedLimit ? (
                <>
                  <h3 className="text-xl font-bold text-white mb-2">이용 한도 초과</h3>
                  <p className="text-subtext mb-4">
                    현재 등급(<span className="text-gold font-semibold">{userGrade?.name}</span>)은
                    최대 <span className="text-gold font-semibold">{maxPrograms}개</span> 프로그램까지 이용 가능합니다.
                    더 많은 프로그램을 이용하려면 등급을 업그레이드하세요.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-bold text-white mb-2">등급 전용 프로그램</h3>
                  <p className="text-subtext mb-4">
                    이 프로그램은{" "}
                    <span className="text-gold font-semibold">{requiredGrade?.name}</span>{" "}
                    등급 이상 회원만 신청할 수 있습니다.
                  </p>
                </>
              )}
              {!user && (
                <Link href="/login" className="text-gold hover:underline text-sm">
                  로그인하여 확인하기
                </Link>
              )}
            </div>
          ) : (
            <PaymentController plans={activePlans} programName={program.name} programId={program.id} />
          )}
        </section>
      )}
    </div>
  );
}
