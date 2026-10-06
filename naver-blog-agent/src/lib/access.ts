import "server-only";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
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

/**
 * 로그인 + "naver-blog-agent" 프로그램 이용 권한을 함께 확인한다.
 * 세션 쿠키의 RLS 차단 및 권한 누락을 방지하기 위해 권한 조사는 createAdminClient()를 사용한다.
 */
export async function requireProgramAccess() {
  const user = await requireUser();
  const adminClient = createAdminClient() as unknown as SupabaseLike;

  // 1. 계정 정지 여부 및 관리자, 회원 등급 조회
  const { data: profile } = await adminClient
    .from("profiles")
    .select("is_suspended, is_admin, grade:member_grades(sort_order)")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_suspended) {
    redirect(noAccessUrl("suspended"));
  }

  // 2. 프로그램 정보 및 요구 등급 조회
  const { data: program } = await adminClient
    .from("programs")
    .select("id, required_grade_id, badges, required_grade:member_grades!required_grade_id(sort_order)")
    .eq("slug", THIS_PROGRAM_SLUG)
    .eq("is_active", true)
    .maybeSingle();

  if (!program) {
    if (profile?.is_admin) return user;
    redirect(noAccessUrl());
  }

  // 3. 관리자 및 FREE 배지 프로그램은 가입한 회원이면 누구나 통과
  if (profile?.is_admin || (program.badges ?? []).includes("free")) {
    return user;
  }

  // 4. 활성 유료 구독 확인
  const { data: subs } = await adminClient
    .from("subscriptions")
    .select("status, expires_at")
    .eq("user_id", user.id)
    .eq("program_id", program.id);

  const hasActiveSub = (subs ?? []).some(
    (s: { status: string; expires_at: string | null }) => s.status === "active" && isNotExpired(s.expires_at)
  );
  if (hasActiveSub) return user;

  // 5. 개별 부여 권한 (user_program_access) 확인
  const { data: grant } = await adminClient
    .from("user_program_access")
    .select("expires_at")
    .eq("user_id", user.id)
    .eq("program_id", program.id)
    .maybeSingle();

  if (grant && isNotExpired(grant.expires_at)) {
    return user;
  }

  // 6. 최소 등급 제한이 없는 프로그램이면 로그인 회원 통과
  if (!program.required_grade_id) {
    return user;
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
    return user;
  }

  redirect(noAccessUrl());
}
