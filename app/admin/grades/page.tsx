import { createClient } from "@/lib/supabase/server";
import GoldGradientText from "@/components/ui/GoldGradientText";
import GradeManager from "@/components/admin/GradeManager";

export const metadata = { title: "등급 관리" };

export default async function AdminGradesPage() {
  const supabase = await createClient();

  // 등급 목록 + 각 등급별 회원 수
  const { data: grades } = await supabase
    .from("member_grades")
    .select("*")
    .order("sort_order");

  // 각 등급별 회원 수 집계
  const { data: memberCounts } = await supabase
    .from("profiles")
    .select("grade_id");

  const countMap: Record<string, number> = {};
  memberCounts?.forEach((m) => {
    if (m.grade_id) {
      countMap[m.grade_id] = (countMap[m.grade_id] || 0) + 1;
    }
  });

  const gradesWithCount = (grades ?? []).map((g) => ({
    ...g,
    member_count: countMap[g.id] || 0,
  }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          <GoldGradientText>등급</GoldGradientText> 관리
        </h1>
        <p className="text-subtext mt-1">회원 등급을 관리하세요</p>
      </div>

      <GradeManager initialGrades={gradesWithCount} />
    </div>
  );
}
