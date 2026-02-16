import Link from "next/link";
import { Eye } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import GlassCard from "@/components/ui/GlassCard";
import GoldGradientText from "@/components/ui/GoldGradientText";
import MemberGradeSelect from "@/components/admin/MemberGradeSelect";
import { formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "회원 관리" };

export default async function AdminMembersPage() {
  const supabase = createServiceClient();
  const { data: members } = await supabase
    .from("profiles")
    .select("*, grade:member_grades(name, color)")
    .order("created_at", { ascending: false });

  const { data: grades } = await supabase
    .from("member_grades")
    .select("*")
    .order("sort_order");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          <GoldGradientText>회원</GoldGradientText> 관리
        </h1>
        <p className="text-subtext mt-1">총 {members?.length ?? 0}명의 회원</p>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[480px]">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left text-xs text-subtext font-medium p-4">회원</th>
              <th className="text-left text-xs text-subtext font-medium p-4 hidden md:table-cell">등급</th>
              <th className="text-center text-xs text-subtext font-medium p-4 hidden lg:table-cell">관리자</th>
              <th className="text-right text-xs text-subtext font-medium p-4 hidden md:table-cell">가입일</th>
              <th className="text-center text-xs text-subtext font-medium p-4 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {members?.map((m) => (
              <tr key={m.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                <td className="p-4">
                  <Link href={`/admin/members/${m.id}`} className="hover:text-gold transition-colors">
                    <p className="text-white text-sm font-medium">{m.name ?? "(이름 없음)"}</p>
                    <p className="text-subtext text-xs">{m.email}</p>
                  </Link>
                </td>
                <td className="p-4 hidden md:table-cell">
                  <MemberGradeSelect
                    userId={m.id}
                    currentGradeId={m.grade_id}
                    grades={(grades ?? []).map((g) => ({ id: g.id, name: g.name, color: g.color }))}
                  />
                </td>
                <td className="p-4 text-center hidden lg:table-cell">
                  {m.is_admin && (
                    <span className="text-xs bg-gold/20 text-gold px-2 py-0.5 rounded-full">관리자</span>
                  )}
                </td>
                <td className="p-4 text-right hidden md:table-cell">
                  <span className="text-subtext text-xs">{formatDate(m.created_at)}</span>
                </td>
                <td className="p-4 text-center">
                  <Link
                    href={`/admin/members/${m.id}`}
                    className="text-subtext hover:text-gold transition-colors p-1.5 rounded hover:bg-gold/10 inline-flex"
                  >
                    <Eye size={14} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </GlassCard>
    </div>
  );
}
