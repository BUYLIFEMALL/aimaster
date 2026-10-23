import "server-only";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { THIS_PROGRAM_SLUG } from "@/lib/version";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

function isNotExpired(expiresAt: string | null): boolean {
  return !expiresAt || new Date(expiresAt) > new Date();
}

/**
 * 로그인 + "naver-blog-allinone" 프로그램 이용 권한을 함께 확인한다.
 * 권한이 없으면 AIMaster의 프로그램 구매/상세 페이지로 리다이렉트한다.
 * 핵심 원칙 6: 서브프로그램의 requireProgramAccess()는 회원 세션 인증 후 RLS 차단 방지를 위해 반드시 createAdminClient()를 사용한다.
 */
/** 핸드폰 번호 필수 정책(2026-10-12): 핸드폰(010·011·016·017·018·019)만 유효. 루트 lib/utils/phone.ts 와 같은 규칙. */
const hasMobilePhone = (v: unknown): boolean => typeof v === "string" && /^01[016789]\d{7,8}$/.test(v.replace(/[^0-9]/g, ""));

export async function requireProgramAccess() {
  const user = await requireUser();
  const adminClient = createAdminClient();

  // 정지된 계정은 차단
  const { data: profile } = await adminClient
    .from("profiles")
    .select("is_suspended, is_admin, role, phone")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_suspended) {
    redirect(`${MAIN_SITE_URL}/programs/${THIS_PROGRAM_SLUG}?error=suspended`);
  }

  // 관리자는 항상 통과
  if (profile?.is_admin || profile?.role === "admin") {
    return user;
  }

  // 핸드폰 번호 필수 정책(2026-10-12): 번호가 없으면 FREE 프로그램 포함 모두 차단
  if (!hasMobilePhone(profile?.phone)) {
    redirect(`${MAIN_SITE_URL}/settings?need_phone=1`);
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
  const isFree = badges.some((b) => String(b).toUpperCase() === "FREE");
  if (isFree) {
    return user;
  }

  // 2. 관리자가 직접 부여한 개별 프로그램 사용기간(user_program_access) 확인
  const { data: directAccess } = await adminClient
    .from("user_program_access")
    .select("expires_at, is_active")
    .eq("user_id", user.id)
    .eq("program_id", program.id)
    .maybeSingle();

  if (
    directAccess &&
    directAccess.is_active !== false &&
    isNotExpired(directAccess.expires_at)
  ) {
    return user;
  }

  // 3. 결제 활성 구독(subscriptions) 확인
  const { data: activeSub } = await adminClient
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", user.id)
    .eq("program_id", program.id)
    .eq("status", "active")
    .maybeSingle();

  if (activeSub && isNotExpired(activeSub.current_period_end)) {
    return user;
  }

  // 4. 회원 등급(user_grades) 충족 여부 확인
  if (program.required_grade_id) {
    const { data: userGrade } = await adminClient
      .from("user_grades")
      .select("grade_id, expires_at, grades!inner(level)")
      .eq("user_id", user.id)
      .maybeSingle();

    if (userGrade && isNotExpired(userGrade.expires_at)) {
      const { data: reqGrade } = await adminClient
        .from("grades")
        .select("level")
        .eq("id", program.required_grade_id)
        .maybeSingle();

      const userLevel = (userGrade.grades as unknown as { level: number })?.level ?? 0;
      const reqLevel = reqGrade?.level ?? 0;
      if (userLevel >= reqLevel) {
        return user;
      }
    }
  }

  // 권한 없음: 메인 사이트의 프로그램 안내/구매 페이지로 안내
  redirect(`${MAIN_SITE_URL}/programs/${THIS_PROGRAM_SLUG}?need_access=1`);
}
