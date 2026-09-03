// 프로그램(AI 웹앱)에 대한 실제 이용 권한을 판정하는 공용 로직.
// app/(dashboard)/apps/[slug]/ 하위에 새 AI 프로그램을 추가할 때마다
// 각자 권한 로직을 다시 구현하지 않도록 이 함수 하나로 통일한다.
//
// 판정 순서: 정지 여부 -> 관리자 -> 활성 구독 -> 개별 부여 권한(만료일 포함) -> 등급 기반 접근(계층적)
//
// 2026-09-03: 이 함수가 있었는데도 app/(main)/programs/[slug]/page.tsx,
// app/(dashboard)/dashboard/page.tsx, app/(main)/blog/page.tsx가 각자 판정 로직을
// 새로 작성해서 써왔고, 그중 blog/page.tsx는 구독·등급 체크가 통째로 빠진 채
// 배포되어 있었다("일반 등급인데 접근 안 됨" 반복 신고로 발견). 판정 "규칙"을 한 곳에
// 모아도, 그 규칙을 실제로 안 불러 쓰면 소용없다는 교훈으로 위 3곳 전부 이 함수(또는
// 아래 evaluateProgramAccess)를 쓰도록 리팩터링했다 — 새 화면에서 프로그램 접근을
// 체크해야 하면 반드시 이 파일의 함수를 재사용할 것, 새로 판정 로직을 쓰지 말 것.

// Supabase 제네릭 타입 중첩으로 인한 "Type instantiation is excessively deep" 방지를 위해
// from()의 반환값만 느슨하게 받는다 (lib/coupons/subStatus.ts와 동일한 패턴).
type SupabaseLike = {
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

export type ProgramAccessReason =
  | "admin"
  | "active_subscription"
  | "individual_grant"
  | "grade_access"
  | "no_restriction"
  | "not_found"
  | "suspended"
  | "none";

export interface ProgramAccessResult {
  allowed: boolean;
  reason: ProgramAccessReason;
  programId: string | null;
}

export function isNotExpired(expiresAt: string | null): boolean {
  return !expiresAt || new Date(expiresAt) > new Date();
}

/**
 * 이미 메모리에 올라온 값으로만 판정하는 순수 함수. 대시보드처럼 프로그램 여러 개를
 * 한 번에 계산해야 해서 DB 재조회(N+1)를 피하고 싶을 때 이 함수를 직접 쓴다.
 * checkProgramAccess()도 내부적으로 이 함수를 호출한다 — 규칙 자체는 여기 한 곳에만 있다.
 */
export function evaluateProgramAccess(input: {
  isAdmin: boolean;
  isSuspended: boolean;
  requiredGradeId: string | null;
  hasActiveSubscription: boolean;
  individualGrantExpiresAt?: string | null;
  hasIndividualGrant: boolean;
  userGradeSortOrder: number | null;
  requiredGradeSortOrder: number | null;
}): { allowed: boolean; reason: ProgramAccessReason } {
  if (input.isSuspended) return { allowed: false, reason: "suspended" };
  if (input.isAdmin) return { allowed: true, reason: "admin" };
  if (input.hasActiveSubscription) return { allowed: true, reason: "active_subscription" };
  if (input.hasIndividualGrant && isNotExpired(input.individualGrantExpiresAt ?? null)) {
    return { allowed: true, reason: "individual_grant" };
  }
  if (!input.requiredGradeId) return { allowed: true, reason: "no_restriction" };
  if (
    input.userGradeSortOrder != null &&
    input.requiredGradeSortOrder != null &&
    input.userGradeSortOrder >= input.requiredGradeSortOrder
  ) {
    return { allowed: true, reason: "grade_access" };
  }
  return { allowed: false, reason: "none" };
}

export async function checkProgramAccess(
  supabase: SupabaseLike,
  userId: string,
  programSlug: string
): Promise<ProgramAccessResult> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, is_suspended, grade:member_grades(sort_order)")
    .eq("id", userId)
    .maybeSingle();

  const { data: program } = await supabase
    .from("programs")
    .select("id, required_grade_id, required_grade:member_grades!required_grade_id(sort_order)")
    .eq("slug", programSlug)
    .eq("is_active", true)
    .single();

  if (!program) {
    return { allowed: false, reason: "not_found", programId: null };
  }

  const { data: subs } = await supabase
    .from("subscriptions")
    .select("status, expires_at")
    .eq("user_id", userId)
    .eq("program_id", program.id);
  const hasActiveSubscription = (subs ?? []).some(
    (s: { status: string; expires_at: string | null }) =>
      s.status === "active" && isNotExpired(s.expires_at)
  );

  const { data: grant } = await supabase
    .from("user_program_access")
    .select("expires_at")
    .eq("user_id", userId)
    .eq("program_id", program.id)
    .maybeSingle();

  const userGrade = Array.isArray(profile?.grade) ? profile?.grade[0] : profile?.grade;
  const requiredGrade = Array.isArray(program.required_grade) ? program.required_grade[0] : program.required_grade;

  const result = evaluateProgramAccess({
    isAdmin: !!profile?.is_admin,
    isSuspended: !!profile?.is_suspended,
    requiredGradeId: program.required_grade_id,
    hasActiveSubscription,
    hasIndividualGrant: !!grant,
    individualGrantExpiresAt: grant?.expires_at ?? null,
    userGradeSortOrder: userGrade?.sort_order ?? null,
    requiredGradeSortOrder: requiredGrade?.sort_order ?? null,
  });

  return { ...result, programId: program.id };
}

/** 프로그램 사용 1건을 usage_logs에 기록한다. service role 클라이언트로 호출해야 한다 (RLS insert 정책 참고). */
export async function logProgramUsage(
  supabase: SupabaseLike,
  params: {
    userId: string;
    programId: string;
    action: string;
    quantity?: number;
    creditsUsed?: number;
    metadata?: Record<string, unknown>;
  }
) {
  await supabase.from("usage_logs").insert({
    user_id: params.userId,
    program_id: params.programId,
    action: params.action,
    quantity: params.quantity ?? 1,
    credits_used: params.creditsUsed ?? 0,
    metadata: params.metadata ?? null,
  });
}
