import { createServiceClient } from "@/lib/supabase/server";
import GlassCard from "@/components/ui/GlassCard";
import GoldGradientText from "@/components/ui/GoldGradientText";
import AccessMatrixManager from "@/components/admin/AccessMatrixManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "접근 권한 관리" };

export default async function AccessMatrixPage() {
  const supabase = createServiceClient();

  const [{ data: grades }, { data: programs }, { data: access }] = await Promise.all([
    supabase.from("member_grades").select("*").order("sort_order"),
    supabase.from("programs").select("id, name, slug, is_active").eq("is_active", true).order("sort_order"),
    supabase.from("grade_program_access").select("grade_id, program_id"),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          <GoldGradientText>접근 권한</GoldGradientText> 관리
        </h1>
        <p className="text-subtext mt-1">등급별로 프로그램 접근 권한을 설정합니다</p>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <AccessMatrixManager
          grades={grades ?? []}
          programs={programs ?? []}
          initialAccess={access ?? []}
        />
      </GlassCard>
    </div>
  );
}
