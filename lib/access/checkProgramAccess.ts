// 프로그램(AI 웹앱)에 대한 실제 이용 권한을 판정하는 공용 로직.
// app/(dashboard)/apps/[slug]/ 하위에 새 AI 프로그램을 추가할 때마다
// 각자 권한 로직을 다시 구현하지 않도록 이 함수 하나로 통일한다.
//
// 판정 순서: 활성 구독 -> 개별 부여 권한(만료일 포함) -> 등급 기반 접근(계층적)

// Supabase 제네릭 타입 중첩으로 인한 "Type instantiation is excessively deep" 방지를 위해
// from()의 반환값만 느슨하게 받는다 (lib/coupons/subStatus.ts와 동일한 패턴).
type SupabaseLike = {
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

export type ProgramAccessReason =
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

function isNotExpired(expiresAt: string | null): boolean {
  return !expiresAt || new Date(expiresAt) > new Date();
}

export async function checkProgramAccess(
  supabase: SupabaseLike,
  userId: string,
  programSlug: string
): Promise<ProgramAccessResult> {
  // 정지된 계정은 구독/개별부여/등급과 무관하게 모든 프로그램 접근을 막는다.
  const { data: suspendCheck } = await supabase
    .from("profiles")
    .select("is_suspended")
    .eq("id", userId)
    .maybeSingle();
  if (suspendCheck?.is_suspended) {
    return { allowed: false, reason: "suspended", programId: null };
  }

  const { data: program } = await supabase
    .from("programs")
    .select("id, required_grade_id")
    .eq("slug", programSlug)
    .eq("is_active", true)
    .single();

  if (!program) {
    return { allowed: false, reason: "not_found", programId: null };
  }

  // 1. 활성 구독 확인
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("status, expires_at")
    .eq("user_id", userId)
    .eq("program_id", program.id);

  const hasActiveSub = (subs ?? []).some(
    (s: { status: string; expires_at: string | null }) =>
      s.status === "active" && isNotExpired(s.expires_at)
  );
  if (hasActiveSub) {
    return { allowed: true, reason: "active_subscription", programId: program.id };
  }

  // 2. 관리자 개별 부여 권한 확인 (만료일 있으면 만료 여부 체크)
  const { data: grant } = await supabase
    .from("user_program_access")
    .select("expires_at")
    .eq("user_id", userId)
    .eq("program_id", program.id)
    .maybeSingle();

  if (grant && isNotExpired(grant.expires_at)) {
    return { allowed: true, reason: "individual_grant", programId: program.id };
  }

  // 3. 등급 제한이 없는 프로그램이면 로그인 사용자 전체 허용
  if (!program.required_grade_id) {
    return { allowed: true, reason: "no_restriction", programId: program.id };
  }

  // 4. 등급 기반 접근 (계층적: 사용자 등급 sort_order >= 필요 등급 sort_order)
  const { data: profile } = await supabase
    .from("profiles")
    .select("grade:member_grades(sort_order)")
    .eq("id", userId)
    .single();

  const { data: requiredGrade } = await supabase
    .from("member_grades")
    .select("sort_order")
    .eq("id", program.required_grade_id)
    .single();

  const userGrade = Array.isArray(profile?.grade) ? profile?.grade[0] : profile?.grade;

  if (userGrade && requiredGrade && userGrade.sort_order >= requiredGrade.sort_order) {
    return { allowed: true, reason: "grade_access", programId: program.id };
  }

  return { allowed: false, reason: "none", programId: program.id };
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
