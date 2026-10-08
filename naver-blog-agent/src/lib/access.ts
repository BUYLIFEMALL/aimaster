import "server-only";
import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const THIS_PROGRAM_SLUG = "naver-blog-agent";
const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL || "https://www.buylife.xyz";

function noAccessUrl(reason?: "suspended") {
  const productPage = `${MAIN_SITE_URL}/programs/${THIS_PROGRAM_SLUG}`;
  return reason ? `${productPage}?error=${reason}` : productPage;
}

function isNotExpired(expiresAt: string | null): boolean {
  return !expiresAt || new Date(expiresAt) > new Date();
}

type SupabaseLike = {
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

type ProgramAccessResult =
  | { allowed: true; userId: string }
  | { allowed: false; error: string; status: 401 | 403 };

const ACCESS_ERRORS = {
  login: "로그인이 필요합니다.",
  suspended: "정지된 계정은 프로그램을 이용할 수 없습니다.",
  unavailable: "현재 이용 가능한 프로그램 정보를 찾을 수 없습니다.",
  denied: "이 프로그램을 이용할 권한이 없습니다.",
} as const;

/**
 * 로그인 + "naver-blog-agent" 프로그램 이용 권한을 함께 확인한다.
 * 세션 쿠키의 RLS 차단 및 권한 누락을 방지하기 위해 권한 조사는 createAdminClient()를 사용한다.
 */
/**
 * Session-independent entitlement evaluation.
 * Extension token routes use this after resolving the token's owner, while web
 * routes use checkProgramAccessApi() to bind the result to the signed-in user.
 */
export async function evaluateProgramAccessForUser(userId: string): Promise<ProgramAccessResult> {
  const adminClient = createAdminClient() as unknown as SupabaseLike;

  // 1. 계정 정지 여부 및 관리자, 회원 등급 조회
  const { data: profile } = await adminClient
    .from("profiles")
    .select("is_suspended, is_admin, grade:member_grades(sort_order)")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.is_suspended) {
    return { allowed: false, error: ACCESS_ERRORS.suspended, status: 403 };
  }

  // 2. 프로그램 정보 및 요구 등급 조회
  const { data: program } = await adminClient
    .from("programs")
    .select("id, required_grade_id, badges, required_grade:member_grades!required_grade_id(sort_order)")
    .eq("slug", THIS_PROGRAM_SLUG)
    .eq("is_active", true)
    .maybeSingle();

  if (!program) {
    if (profile?.is_admin) return { allowed: true, userId };
    return { allowed: false, error: ACCESS_ERRORS.unavailable, status: 403 };
  }

  // 3. 관리자 및 FREE 배지 프로그램은 가입한 회원이면 누구나 통과
  if (profile?.is_admin || (program.badges ?? []).includes("free")) {
    return { allowed: true, userId };
  }

  // 4. 활성 유료 구독 확인
  const { data: subs } = await adminClient
    .from("subscriptions")
    .select("status, expires_at")
    .eq("user_id", userId)
    .eq("program_id", program.id);

  const hasActiveSub = (subs ?? []).some(
    (s: { status: string; expires_at: string | null }) => s.status === "active" && isNotExpired(s.expires_at)
  );
  if (hasActiveSub) return { allowed: true, userId };

  // 5. 개별 부여 권한 (user_program_access) 확인
  const { data: grant } = await adminClient
    .from("user_program_access")
    .select("expires_at")
    .eq("user_id", userId)
    .eq("program_id", program.id)
    .maybeSingle();

  if (grant && isNotExpired(grant.expires_at)) {
    return { allowed: true, userId };
  }

  // 6. 최소 등급 제한이 없는 프로그램이면 로그인 회원 통과
  if (!program.required_grade_id) {
    return { allowed: true, userId };
  }

  // 7. 등급 기반 접근 (회원 등급이 요구 등급 이상이고 관리자 부여 사용기간이 있는 경우)
  const userGrade = Array.isArray(profile?.grade) ? profile?.grade[0] : profile?.grade;
  const requiredGrade = Array.isArray(program.required_grade) ? program.required_grade[0] : program.required_grade;

  if (
    userGrade &&
    requiredGrade &&
    userGrade.sort_order >= requiredGrade.sort_order &&
    grant &&
    isNotExpired(grant.expires_at)
  ) {
    return { allowed: true, userId };
  }

  return { allowed: false, error: ACCESS_ERRORS.denied, status: 403 };
}

/** Returns JSON-safe 401/403 results for Route Handlers; never redirects. */
export async function checkProgramAccessApi(): Promise<ProgramAccessResult> {
  const user = await getOptionalUser();
  if (!user) return { allowed: false, error: ACCESS_ERRORS.login, status: 401 };
  return evaluateProgramAccessForUser(user.id);
}

export async function requireProgramAccess() {
  const user = await getOptionalUser();
  if (!user) {
    redirect("/login?redirect=%2Fdashboard");
  }

  const result = await evaluateProgramAccessForUser(user.id);
  if (result.allowed) return user;
  redirect(noAccessUrl(result.error === ACCESS_ERRORS.suspended ? "suspended" : undefined));
}
