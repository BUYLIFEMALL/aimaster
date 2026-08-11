import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import MemberDetail from "@/components/admin/MemberDetail";

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
      supabase
        .from("subscriptions")
        .select("*, program:programs(name, slug), pricing_plan:pricing_plans(name, billing_type, price)")
        .eq("user_id", id)
        .eq("status", "active")
        .order("created_at", { ascending: false }),
      supabase
        .from("user_program_access")
        .select("*, program:programs(id, name, slug)")
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
        .select("id, name, slug")
        .eq("is_active", true)
        .order("sort_order"),
    ]);

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

      <MemberDetail
        member={member}
        subscriptions={subscriptions ?? []}
        manualAccess={manualAccess ?? []}
        sessions={sessions ?? []}
        allPrograms={allPrograms ?? []}
      />
    </div>
  );
}
