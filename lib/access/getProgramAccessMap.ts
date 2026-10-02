import { evaluateProgramAccess } from "@/lib/access/checkProgramAccess";

type SupabaseLike = {
  auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> };
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

type AccessProgram = {
  id: string;
  badges?: string[] | null;
  required_grade_id?: string | null;
};

/**
 * 목록 카드에서 사용할 프로그램별 이용 가능 여부를 한 번에 계산한다.
 * 실제 앱의 권한 검증은 각 프로그램의 requireProgramAccess/checkProgramAccess가 담당하며,
 * 이 값은 사용자를 올바른 다음 화면(앱 또는 구독)으로 보내기 위한 UI 전용이다.
 */
export async function getProgramAccessMap(
  supabase: SupabaseLike,
  programs: AccessProgram[]
): Promise<Map<string, boolean>> {
  const denied = new Map(programs.map((program) => [program.id, false]));
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || programs.length === 0) return denied;

  const [{ data: profile }, { data: subscriptions }, { data: grants }, { data: grades }] = await Promise.all([
    supabase.from("profiles").select("is_admin, is_suspended, grade:member_grades(sort_order)").eq("id", user.id).maybeSingle(),
    supabase.from("subscriptions").select("program_id, status, expires_at").eq("user_id", user.id),
    supabase.from("user_program_access").select("program_id, expires_at").eq("user_id", user.id),
    supabase.from("member_grades").select("id, sort_order"),
  ]);

  const now = new Date();
  const gradeSortMap = new Map((grades ?? []).map((grade: { id: string; sort_order: number }) => [grade.id, grade.sort_order]));
  const userGrade = Array.isArray(profile?.grade) ? profile.grade[0] : profile?.grade;
  const subscriptionsByProgram = new Set(
    (subscriptions ?? [])
      .filter((subscription: { status: string; expires_at: string | null }) =>
        subscription.status === "active" && (!subscription.expires_at || new Date(subscription.expires_at) > now)
      )
      .map((subscription: { program_id: string }) => subscription.program_id)
  );
  const grantsByProgram = new Map(
    (grants ?? [])
      .filter((grant: { expires_at: string | null }) => !grant.expires_at || new Date(grant.expires_at) > now)
      .map((grant: { program_id: string; expires_at: string | null }) => [grant.program_id, grant.expires_at])
  );

  return new Map(programs.map((program) => [
    program.id,
    evaluateProgramAccess({
      isAdmin: !!profile?.is_admin,
      isSuspended: !!profile?.is_suspended,
      isFree: (program.badges ?? []).includes("free"),
      requiredGradeId: program.required_grade_id ?? null,
      hasActiveSubscription: subscriptionsByProgram.has(program.id),
      hasIndividualGrant: grantsByProgram.has(program.id),
      individualGrantExpiresAt: grantsByProgram.get(program.id) ?? null,
      userGradeSortOrder: userGrade?.sort_order ?? null,
      requiredGradeSortOrder: program.required_grade_id ? (gradeSortMap.get(program.required_grade_id) ?? null) : null,
    }).allowed,
  ]));
}
