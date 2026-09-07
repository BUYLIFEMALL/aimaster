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
  const [{ data: members }, { data: grades }, { data: activeSubs }, { data: programs }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*, grade:member_grades(name, color)")
      .order("created_at", { ascending: false }),
    supabase.from("member_grades").select("*").order("sort_order"),
    // 목록에 "사용만료기간"을 보여주기 위해 전체 회원의 활성 구독을 한 번에 조회한다.
    supabase.from("subscriptions").select("user_id, expires_at").eq("status", "active"),
    // 목록에서 바로 "만료일 설정" 모달을 열 때 프로그램을 고를 수 있어야 한다.
    supabase.from("programs").select("id, name, slug").eq("is_active", true).order("sort_order"),
  ]);

  // user_id별로 "가장 빨리 끝나는 만료일"과 활성 구독 개수를 계산한다. 평생(expires_at=null)
  // 구독만 있으면 "평생"으로, 유료 만료일이 하나라도 있으면 그중 가장 이른 날짜를 보여준다
  // (여러 프로그램을 구독 중이면 관리 화면에서 상세로 들어가 개별 확인).
  const expiryByUserId = new Map<string, { soonest: string | null; hasLifetime: boolean; count: number }>();
  for (const sub of activeSubs ?? []) {
    if (!sub.user_id) continue;
    const entry = expiryByUserId.get(sub.user_id) ?? { soonest: null, hasLifetime: false, count: 0 };
    entry.count += 1;
    if (sub.expires_at === null) {
      entry.hasLifetime = true;
    } else if (entry.soonest === null || sub.expires_at < entry.soonest) {
      entry.soonest = sub.expires_at;
    }
    expiryByUserId.set(sub.user_id, entry);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          <GoldGradientText>회원</GoldGradientText> 관리
        </h1>
        <p className="text-subtext mt-1">총 {members?.length ?? 0}명의 회원</p>
      </div>

      <MembersTable
        members={members ?? []}
        grades={grades ?? []}
        expiryByUserId={Object.fromEntries(expiryByUserId)}
        programs={programs ?? []}
      />
    </div>
  );
}
