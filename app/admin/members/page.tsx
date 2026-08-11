import { createServiceClient } from "@/lib/supabase/service";
import GoldGradientText from "@/components/ui/GoldGradientText";
import MembersTable from "@/components/admin/MembersTable";

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

      <MembersTable members={members ?? []} grades={grades ?? []} />
    </div>
  );
}
