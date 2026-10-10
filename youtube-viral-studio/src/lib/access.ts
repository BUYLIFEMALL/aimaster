import "server-only";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const THIS_PROGRAM_SLUG = "youtube-viral-studio";
const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

function isNotExpired(expiresAt: string | null): boolean {
  return !expiresAt || new Date(expiresAt) > new Date();
}

/**
 * 로그인 + "youtube-viral-studio" 프로그램 이용 권한을 함께 확인한다.
 * 권한이 없으면 AIMaster의 프로그램 구매/상세 페이지로 리다이렉트한다.
 * 핵심 원칙 6: 서브프로그램의 requireProgramAccess()는 회원 세션 인증 후 RLS 차단 방지를 위해 반드시 createAdminClient()를 사용한다.
 */
export async function requireProgramAccess() {
  const user = await requireUser();
  const adminClient = createAdminClient();

  // 정지된 계정은 차단
  const { data: profile } = await adminClient
    .from("profiles")
    .select("is_suspended, is_admin, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_suspended) {
    redirect(`${MAIN_SITE_URL}/programs/${THIS_PROGRAM_SLUG}?error=suspended`);
  }

  // 관리자는 항상 통과
  if (profile?.is_admin || profile?.role === "admin") {
    return user;
  }

  const { data: program } = await adminClient
    .from("programs")
    .select("id, required_grade_id, badges, is_active")
    .eq("slug", THIS_PROGRAM_SLUG)
    .maybeSingle();

  if (!program || !program.is_active) {
    // 프로그램이 아직 비활성 상태거나 없을 때
    return user;
  }

  // 1. FREE 배지 프로그램은 가입 회원 누구나 무료 이용 (핵심 원칙 6번)
  const badges: string[] = program.badges ?? [];
  if (badges.includes("free")) {
    return user;
  }

  // 2. 활성 유료 구독 확인
  const { data: subs } = await adminClient
    .from("subscriptions")
    .select("status, expires_at")
    .eq("user_id", user.id)
    .eq("program_id", program.id);

  if (subs && subs.some((s: { status: string; expires_at: string | null }) => s.status === "active" && isNotExpired(s.expires_at))) {
    return user;
  }

  // 3. 관리자가 직접 넣어준 프로그램 접근 권한 (user_program_access)
  const { data: directAccess } = await adminClient
    .from("user_program_access")
    .select("expires_at")
    .eq("user_id", user.id)
    .eq("program_id", program.id)
    .maybeSingle();

  if (directAccess && isNotExpired(directAccess.expires_at)) {
    return user;
  }

  // 4. 최소 등급 제한이 없는 프로그램이면 로그인 회원 즉시 통과 (메인 evaluateProgramAccess no_restriction과 동일)
  if (!program.required_grade_id) {
    return user;
  }

  // 5. 회원 등급 기반 확인 (요구 등급 이상)
  const { data: userGrades } = await adminClient
    .from("user_grades")
    .select("grade_id, expires_at")
    .eq("user_id", user.id);

  const hasValidGrade = (userGrades ?? []).some(
    (ug: { grade_id: string; expires_at: string | null }) =>
      ug.grade_id === program.required_grade_id && isNotExpired(ug.expires_at)
  );

  if (hasValidGrade) {
    return user;
  }

  // 권한이 없으면 안내 페이지로 리다이렉트
  redirect(`${MAIN_SITE_URL}/programs/${THIS_PROGRAM_SLUG}?need_access=1`);
}
