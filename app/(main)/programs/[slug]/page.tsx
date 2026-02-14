import { notFound } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Play, Lock } from "lucide-react";
import Link from "next/link";
import GoldGradientText from "@/components/ui/GoldGradientText";
import PricingTable from "@/components/programs/PricingTable";
import PaymentController from "@/components/payment/PaymentController";
import { createClient } from "@/lib/supabase/server";
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
    .select("*, category:categories(*), pricing_plans(*)")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!program) notFound();

  // 등급별 접근 제한 확인
  const { data: accessRows } = await supabase
    .from("grade_program_access")
    .select("grade_id, grade:member_grades(*)")
    .eq("program_id", program.id);

  const allowedGrades: MemberGrade[] = (accessRows ?? [])
    .map((r: { grade: MemberGrade | MemberGrade[] | null }) => Array.isArray(r.grade) ? r.grade[0] : r.grade)
    .filter(Boolean) as MemberGrade[];
  const hasGradeRestriction = allowedGrades.length > 0;

  // 현재 사용자 등급 확인
  let userGradeId: string | null = null;
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("grade_id").eq("id", user.id).single();
    userGradeId = profile?.grade_id ?? null;
  }

  const isAccessAllowed = !hasGradeRestriction || (userGradeId && allowedGrades.some((g: MemberGrade) => g.id === userGradeId));

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
          {program.category && (
            <span className="text-gold/70 text-sm font-medium">{program.category.name}</span>
          )}
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

          <Link href="#pricing">
            <button className="btn-gold w-full py-4 text-lg rounded-xl font-bold">
              지금 구독하기
            </button>
          </Link>
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

          {hasGradeRestriction && !isAccessAllowed ? (
            <div className="glass-card rounded-2xl p-8 text-center">
              <Lock size={40} className="text-gold mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">등급 전용 프로그램</h3>
              <p className="text-subtext mb-4">
                이 프로그램은{" "}
                <span className="text-gold font-semibold">
                  {allowedGrades.map((g) => g.name).join(", ")}
                </span>{" "}
                등급 회원만 구매할 수 있습니다.
              </p>
              {!user && (
                <Link href="/login" className="text-gold hover:underline text-sm">
                  로그인하여 확인하기
                </Link>
              )}
            </div>
          ) : (
            <>
              <PricingTable plans={activePlans} programId={program.id} />
              <PaymentController plans={activePlans} programName={program.name} />
            </>
          )}
        </section>
      )}
    </div>
  );
}
