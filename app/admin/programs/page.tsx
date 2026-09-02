import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import GlassCard from "@/components/ui/GlassCard";
import GoldButton from "@/components/ui/GoldButton";
import GoldGradientText from "@/components/ui/GoldGradientText";
import ProgramsAdminBoard from "@/components/admin/ProgramsAdminBoard";

export const metadata = { title: "프로그램 관리" };

export default async function AdminProgramsPage() {
  const supabase = await createClient();
  const [{ data: programs }, { data: categories }] = await Promise.all([
    supabase
      .from("programs")
      .select("id, name, slug, app_url, is_active, sort_order, category_id")
      .order("sort_order"),
    supabase.from("categories").select("*").order("sort_order"),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">
            <GoldGradientText>프로그램</GoldGradientText> 관리
          </h1>
          <p className="text-subtext mt-1">등록된 프로그램을 관리하세요</p>
        </div>
        <Link href="/admin/programs/new">
          <GoldButton>
            <Plus size={16} />
            새 프로그램
          </GoldButton>
        </Link>
      </div>

      {!programs || programs.length === 0 ? (
        <GlassCard className="text-center py-12">
          <p className="text-subtext mb-4">등록된 프로그램이 없습니다</p>
          <Link href="/admin/programs/new">
            <GoldButton>첫 프로그램 등록하기</GoldButton>
          </Link>
        </GlassCard>
      ) : (
        <ProgramsAdminBoard programs={programs} categories={categories ?? []} />
      )}
    </div>
  );
}
