import { createServiceClient } from "@/lib/supabase/service";
import GoldGradientText from "@/components/ui/GoldGradientText";
import MembersTable from "@/components/admin/MembersTable";

type ExpiryRow = { user_id: string | null; expires_at: string | null };

/**
 * Supabase(PostgREST)는 한 요청당 기본 최대 1000행만 반환한다 — .range()로 명시적으로
 * 페이지네이션하지 않으면 조용히 잘려서, 조건에 맞는 행이 1000개를 넘는 순간부터는
 * 일부 사용자의 데이터가 통째로 빠진다(2026-09-08 발견: 회원×프로그램 조합이 1640건이라
 * 사용만료기간 컬럼이 일부 회원에게만 "-"로 보이던 원인). 결과가 페이지 크기보다
 * 작아질 때까지 반복 조회해서 전체 행을 모은다.
 */
async function fetchAllRows(
  queryBuilder: (from: number, to: number) => PromiseLike<{ data: ExpiryRow[] | null; error: unknown }>,
): Promise<ExpiryRow[]> {
  const pageSize = 1000;
  const all: ExpiryRow[] = [];
  let from = 0;
  while (true) {
    const { data } = await queryBuilder(from, from + pageSize - 1);
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

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
  const nowIso = new Date().toISOString();
  const [{ data: members }, { data: grades }, activeSubs, activeAccess, { data: programs }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*, grade:member_grades(name, color)")
      .order("created_at", { ascending: false }),
    supabase.from("member_grades").select("*").order("sort_order"),
    // 목록에 "사용만료기간"을 보여주기 위해 전체 회원의 활성 구독을 한 번에 조회한다.
    // 회원×프로그램 조합이 많아지면 1000행을 넘길 수 있어 fetchAllRows로 페이지네이션한다.
    fetchAllRows((from, to) =>
      supabase.from("subscriptions").select("user_id, expires_at").eq("status", "active").range(from, to),
    ),
    // "만료기간 설정" 모달(회원 목록/상세 공통)이 실제로 기록하는 곳은 user_program_access다
    // — 여기를 함께 조회하지 않으면 모달로 설정해도 목록에 반영되지 않는 것처럼 보인다
    // (실제로 이 조회가 빠져 있어 발생한 버그, 2026-09-08 수정). 이미 지난 만료일은
    // 더 이상 유효하지 않으므로 평생(null) 또는 아직 안 지난 것만 가져온다.
    fetchAllRows((from, to) =>
      supabase
        .from("user_program_access")
        .select("user_id, expires_at")
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
        .range(from, to),
    ),
    // 목록에서 바로 "만료일 설정" 모달을 열 때 프로그램을 고를 수 있어야 한다.
    supabase.from("programs").select("id, name, slug").eq("is_active", true).order("sort_order"),
  ]);

  // user_id별로 "가장 빨리 끝나는 만료일"과 유효한 이용 권한 개수를 계산한다. 구독
  // (subscriptions)과 관리자 수동 부여(user_program_access) 두 출처를 합산한다. 평생
  // (expires_at=null)인 것만 있으면 "평생"으로, 유료/유한 만료일이 하나라도 있으면 그중
  // 가장 이른 날짜를 보여준다(여러 프로그램이면 상세 화면에서 개별 확인).
  const expiryByUserId = new Map<string, { soonest: string | null; hasLifetime: boolean; count: number }>();
  function addExpiryEntry(userId: string | null, expiresAt: string | null) {
    if (!userId) return;
    const entry = expiryByUserId.get(userId) ?? { soonest: null, hasLifetime: false, count: 0 };
    entry.count += 1;
    if (expiresAt === null) {
      entry.hasLifetime = true;
    } else if (entry.soonest === null || expiresAt < entry.soonest) {
      entry.soonest = expiresAt;
    }
    expiryByUserId.set(userId, entry);
  }
  for (const sub of activeSubs) addExpiryEntry(sub.user_id, sub.expires_at);
  for (const access of activeAccess) addExpiryEntry(access.user_id, access.expires_at);

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
