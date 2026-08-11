import { createServiceClient } from "@/lib/supabase/service";
import GoldGradientText from "@/components/ui/GoldGradientText";
import MembersTable from "@/components/admin/MembersTable";

// dynamic = "force-dynamic" 하나만으로는 이 페이지의 데이터 조회가 여전히 Next.js
// Data Cache에 걸려 삭제/정지 직후에도 예전 회원 목록이 보이는 문제가 실제로 확인됨
// (완전히 새 브라우저 탭의 첫 진입에서도 재현 — 클라이언트 캐시가 아니라 서버 쪽
// 캐시 문제). revalidate/fetchCache까지 명시해서 이 라우트의 캐시를 완전히 끈다.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
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
