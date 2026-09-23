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
  | "none";

export interface ProgramAccessResult {
  allowed: boolean;
  reason: ProgramAccessReason;
  programId: string | null;
}

export function isNotExpired(expiresAt: string | null): boolean {
  return !expiresAt || new Date(expiresAt) > new Date();
}

export function evaluateProgramAccess(input: {
  isAdmin: boolean;
  isSuspended: boolean;
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
  if (input.isFree) return { allowed: true, reason: "no_restriction" };
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
    .select("id, badges, required_grade_id, required_grade:member_grades!required_grade_id(sort_order)")
    .eq("slug", programSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (!program) {
    return { allowed: false, reason: "not_found", programId: null };
  }

  const { data: subs } = await supabase
    .from("subscriptions")
    .select("status, expires_at")
    .eq("user_id", userId)
    .eq("program_id", program.id)
    .eq("status", "active")
    .maybeSingle();

  const hasActiveSubscription = !!subs && isNotExpired(subs.expires_at ?? null);

  const { data: grants } = await supabase
    .from("user_program_access")
    .select("expires_at")
    .eq("user_id", userId)
    .eq("program_id", program.id)
    .maybeSingle();

  const hasIndividualGrant = !!grants;
  const individualGrantExpiresAt = grants?.expires_at ?? null;

  const isFree = (program.badges ?? []).includes("free");

  const access = evaluateProgramAccess({
    isAdmin: !!profile?.is_admin,
    isSuspended: !!profile?.is_suspended,
    isFree,
    requiredGradeId: program.required_grade_id,
    hasActiveSubscription,
    hasIndividualGrant,
    individualGrantExpiresAt,
    userGradeSortOrder: profile?.grade?.sort_order ?? null,
    requiredGradeSortOrder: program.required_grade?.sort_order ?? null,
  });

  return {
    allowed: access.allowed,
    reason: access.reason,
    programId: program.id,
  };
}
