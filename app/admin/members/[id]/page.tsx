import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import MemberDetail from "@/components/admin/MemberDetail";
import PremiumIndividualGrant from "@/components/admin/PremiumIndividualGrant";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data } = await supabase.from("profiles").select("name, email").eq("id", id).single();
  return { title: data ? `${data.name ?? data.email} - 회원 상세` : "회원 상세" };
}

export default async function MemberDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: member } = await supabase
    .from("profiles")
    .select("*, grade:member_grades(*)")
    .eq("id", id)
    .single();

  if (!member) notFound();

  const [{ data: subscriptions }, { data: manualAccess }, { data: sessions }, { data: allPrograms }] =
    await Promise.all([
      // 취소/만료된 구독도 함께 보여줘야 관리자가 "재개" 조작을 할 대상을 찾을 수 있다
      // (활성만 보여주면 중지시키는 순간 목록에서 사라져 되돌릴 방법이 없어짐).
      supabase
        .from("subscriptions")
        .select("*, program:programs(name, slug), pricing_plan:pricing_plans(name, billing_type, price)")
        .eq("user_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("user_program_access")
        .select("*, program:programs(id, name, slug, is_active)")
        .eq("user_id", id)
        .order("granted_at", { ascending: false }),
      supabase
        .from("user_sessions")
        .select("*")
        .eq("user_id", id)
        .gte("last_active", new Date(Date.now() - 5 * 60 * 1000).toISOString())
        .order("last_active", { ascending: false }),
      supabase
        .from("programs")
        .select("id, name, slug, badges, category:categories(name, sort_order)")
        .eq("is_active", true)
        .order("sort_order"),
    ]);

  // 개별 프리미엄 권한은 전용 칸에서 관리한다(수동 접근 목록의 일반 수정·삭제에서 분리)
  const visibleAccess = (manualAccess ?? []).filter((a: { program?: { is_active?: boolean } | null }) => a.program?.is_active !== false);
  const isPremiumGrant = (a: { grant_source?: string | null }) => a.grant_source === "premium_manual";
  const canGrantPremium = member.grade?.slug === "gold" || member.grade?.slug === "vip";
  const premiumGrants = visibleAccess.filter(isPremiumGrant);

  return (
    <div>
      <Link
        href="/admin/members"
        className="inline-flex items-center gap-2 text-subtext hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        회원 목록으로
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          {member.name ?? member.email}
        </h1>
        <p className="text-subtext mt-1">회원 상세 정보 및 접근 권한 관리</p>
      </div>

      {(canGrantPremium || premiumGrants.length > 0) && (
        <div className="max-w-4xl mb-6">
          <PremiumIndividualGrant
            memberId={member.id}
            programs={(allPrograms ?? []).filter((p: { badges?: string[] | null }) => (p.badges ?? []).includes("premium"))}
            grants={premiumGrants.map((g: { program_id: string; expires_at: string | null; program?: { name?: string } | null }) => ({
              program_id: g.program_id,
              expires_at: g.expires_at,
              program_name: g.program?.name ?? g.program_id,
            }))}
          />
        </div>
      )}

      <MemberDetail
        member={member}
        subscriptions={subscriptions ?? []}
        // 비공개(is_active=false) 프로그램의 부여는 사용 가능 권한 목록·개수에서 뺀다(2026-10-13 주인님 지시)
        manualAccess={visibleAccess.filter((a: { grant_source?: string | null }) => !isPremiumGrant(a))}
        sessions={sessions ?? []}
        allPrograms={allPrograms ?? []}
      />
    </div>
  );
}
