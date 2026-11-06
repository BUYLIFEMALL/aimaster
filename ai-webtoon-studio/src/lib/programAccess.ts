type SupabaseLike = {
  from: (table: string) => any;
};

export type ProgramAccessReason =
  | "admin"
  | "active_subscription"
  | "individual_grant"
  | "grade_access"
  | "no_restriction"
  | "not_found"
  | "suspended"
  | "phone_required"
  | "none";

export interface ProgramAccessResult {
  allowed: boolean;
  reason: ProgramAccessReason;
  programId: string | null;
}

export function isNotExpired(expiresAt: string | null): boolean {
  return !expiresAt || new Date(expiresAt) > new Date();
}

/** 핸드폰 번호 필수 정책(2026-10-12): 핸드폰(010·011·016·017·018·019)만 유효. 루트 lib/utils/phone.ts 와 같은 규칙. */
const hasMobilePhone = (v: unknown): boolean => typeof v === "string" && /^01[016789]\d{7,8}$/.test(v.replace(/[^0-9]/g, ""));

export function evaluateProgramAccess(input: {
  isAdmin: boolean;
  isSuspended: boolean;
  /** 핸드폰 번호가 저장돼 있는지(필수 정책). 안 넘기면 검사하지 않는다. */
  hasPhone?: boolean;
  isFree: boolean;
  requiredGradeId: string | null;
  hasActiveSubscription: boolean;
  individualGrantExpiresAt?: string | null;
  hasIndividualGrant: boolean;
  userGradeSortOrder: number | null;
  requiredGradeSortOrder: number | null;
}): { allowed: boolean; reason: ProgramAccessReason } {
  if (input.isSuspended) return { allowed: false, reason: "suspended" };
  if (input.isAdmin) return { allowed: true, reason: "admin" };
  // 핸드폰 번호 필수 정책(2026-10-12): 번호가 없으면 FREE 프로그램 포함 모두 차단(관리자 제외).
  if (input.hasPhone === false) return { allowed: false, reason: "phone_required" };
  if (input.isFree) return { allowed: true, reason: "no_restriction" };
  if (input.hasActiveSubscription) return { allowed: true, reason: "active_subscription" };
  if (!input.requiredGradeId) return { allowed: true, reason: "no_restriction" };
  const meetsGrade =
    input.userGradeSortOrder != null &&
    input.requiredGradeSortOrder != null &&
    input.userGradeSortOrder >= input.requiredGradeSortOrder;
  if (meetsGrade && input.hasIndividualGrant && isNotExpired(input.individualGrantExpiresAt ?? null)) {
    return { allowed: true, reason: "individual_grant" };
  }
  return { allowed: false, reason: "none" };
}

export async function checkProgramAccess(
  supabase: SupabaseLike,
  userId: string,
  programSlug: string
): Promise<ProgramAccessResult> {
  // 2026-11-06 주인님 결정(요청함 A-7): 순차 4회 조회를 두 묶음 동시 조회로 — 판정 결과는 같고 첫 화면 응답이 빨라진다(기준 free-music-studio).
  const [{ data: profile }, { data: program }] = await Promise.all([
    supabase
      .from("profiles")
      .select("is_admin, is_suspended, phone, grade:member_grades(sort_order)")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("programs")
      .select("id, badges, required_grade_id, required_grade:member_grades!required_grade_id(sort_order)")
      .eq("slug", programSlug)
      .eq("is_active", true)
      .single(),
  ]);

  if (!program) {
    return { allowed: false, reason: "not_found", programId: null };
  }

  const [{ data: subs }, { data: grant }] = await Promise.all([
    supabase.from("subscriptions").select("status, expires_at").eq("user_id", userId).eq("program_id", program.id),
    supabase.from("user_program_access").select("expires_at").eq("user_id", userId).eq("program_id", program.id).maybeSingle(),
  ]);
  const hasActiveSubscription = (subs ?? []).some(
    (s: { status: string; expires_at: string | null }) =>
      s.status === "active" && isNotExpired(s.expires_at)
  );

  const userGrade = Array.isArray(profile?.grade) ? profile?.grade[0] : profile?.grade;
  const requiredGrade = Array.isArray(program.required_grade) ? program.required_grade[0] : program.required_grade;

  const result = evaluateProgramAccess({
    isAdmin: !!profile?.is_admin,
    isSuspended: !!profile?.is_suspended,
    hasPhone: hasMobilePhone(profile?.phone),
    isFree: (program.badges ?? []).includes("free"),
    requiredGradeId: program.required_grade_id,
    hasActiveSubscription,
    hasIndividualGrant: !!grant,
    individualGrantExpiresAt: grant?.expires_at ?? null,
    userGradeSortOrder: userGrade?.sort_order ?? null,
    requiredGradeSortOrder: requiredGrade?.sort_order ?? null,
  });

  return { ...result, programId: program.id };
}
