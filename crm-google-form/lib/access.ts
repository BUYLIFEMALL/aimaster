import "server-only";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// 이 앱(crm-google-form)은 AIMaster와 같은 Supabase 프로젝트를 공유한다.
// 로그인 여부만으로는 부족하고, AIMaster의 programs/subscriptions/user_program_access
// 테이블을 기준으로 "이 프로그램을 실제로 이용할 권한이 있는지"까지 확인해야 한다.
// stepmail/music/threads/shots/insta_auto_poster와 동일한 패턴.
//
// AIMaster Database 타입에는 없는 테이블이라 제네릭 타입 충돌을 피하기 위해
// from()의 반환값만 느슨하게 받는다.
type SupabaseLike = {
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

const THIS_PROGRAM_SLUG = "crm-google-form";
const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

function isNotExpired(expiresAt: string | null): boolean {
  return !expiresAt || new Date(expiresAt) > new Date();
}

/**
 * 로그인 + "crm-google-form" 프로그램 이용 권한을 함께 확인한다.
 * 권한이 없으면 AIMaster의 프로그램 구매 페이지로 리다이렉트한다.
 */
export async function requireProgramAccess() {
  const user = await requireUser();
  const supabase = (await createClient()) as unknown as SupabaseLike;

  const { data: suspendCheck } = await supabase
    .from("profiles")
    .select("is_suspended")
    .eq("id", user.id)
    .maybeSingle();
  if (suspendCheck?.is_suspended) {
    redirect(`${MAIN_SITE_URL}/programs/${THIS_PROGRAM_SLUG}?error=suspended`);
  }

  const { data: program } = await supabase
    .from("programs")
    .select("id, required_grade_id")
    .eq("slug", THIS_PROGRAM_SLUG)
    .eq("is_active", true)
    .single();

  if (!program) {
    redirect(`${MAIN_SITE_URL}/programs/${THIS_PROGRAM_SLUG}`);
  }

  const { data: subs } = await supabase
    .from("subscriptions")
    .select("status, expires_at")
    .eq("user_id", user.id)
    .eq("program_id", program.id);

  const hasActiveSub = (subs ?? []).some(
    (s: { status: string; expires_at: string | null }) =>
      s.status === "active" && isNotExpired(s.expires_at),
  );
  if (hasActiveSub) return user;

  const { data: grant } = await supabase
    .from("user_program_access")
    .select("expires_at")
    .eq("user_id", user.id)
    .eq("program_id", program.id)
    .maybeSingle();
  if (grant && isNotExpired(grant.expires_at)) return user;

  if (!program.required_grade_id) return user;

  const { data: profile } = await supabase
    .from("profiles")
    .select("grade:member_grades(sort_order)")
    .eq("id", user.id)
    .single();

  const { data: requiredGrade } = await supabase
    .from("member_grades")
    .select("sort_order")
    .eq("id", program.required_grade_id)
    .single();

  const userGrade = Array.isArray(profile?.grade) ? profile?.grade[0] : profile?.grade;
  if (userGrade && requiredGrade && userGrade.sort_order >= requiredGrade.sort_order) {
    return user;
  }

  // 일반 회원 (sort_order >= 1 또는 로그인 유저) 기본 접근 허용
  if (!userGrade || userGrade.sort_order >= 1) {
    return user;
  }

  redirect(`${MAIN_SITE_URL}/programs/${THIS_PROGRAM_SLUG}`);
}

/** 로그인한 사용자를 반환하되, 권한 검사 없이 사용자 여부만 확인한다 (API route에서 재사용). */
export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * requireProgramAccess()와 동일한 판정 로직이지만, API route handler에서
 * 쓸 수 있도록 redirect() 대신 결과 객체를 반환한다.
 * (route handler에서 redirect()를 쓰면 fetch 호출자가 HTML 리다이렉트를
 * 받아 res.json() 파싱에 실패하는 문제가 있어 분리했다.)
 */
export async function checkProgramAccessApi(): Promise<
  | { allowed: true; user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>> }
  | { allowed: false; error: string; status: number }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { allowed: false, error: "로그인이 필요합니다.", status: 401 };
  }

  const sb = supabase as unknown as SupabaseLike;

  const { data: suspendCheck } = await sb
    .from("profiles")
    .select("is_suspended")
    .eq("id", user.id)
    .maybeSingle();
  if (suspendCheck?.is_suspended) {
    return { allowed: false, error: "계정이 정지되어 이용할 수 없습니다. 고객센터에 문의해주세요.", status: 403 };
  }

  const { data: program } = await sb
    .from("programs")
    .select("id, required_grade_id")
    .eq("slug", THIS_PROGRAM_SLUG)
    .eq("is_active", true)
    .single();

  if (!program) {
    return { allowed: false, error: "이용 중인 프로그램을 찾을 수 없습니다.", status: 403 };
  }

  const { data: subs } = await sb
    .from("subscriptions")
    .select("status, expires_at")
    .eq("user_id", user.id)
    .eq("program_id", program.id);

  const hasActiveSub = (subs ?? []).some(
    (s: { status: string; expires_at: string | null }) =>
      s.status === "active" && isNotExpired(s.expires_at),
  );
  if (hasActiveSub) return { allowed: true, user };

  const { data: grant } = await sb
    .from("user_program_access")
    .select("expires_at")
    .eq("user_id", user.id)
    .eq("program_id", program.id)
    .maybeSingle();
  if (grant && isNotExpired(grant.expires_at)) return { allowed: true, user };

  if (!program.required_grade_id) return { allowed: true, user };

  const { data: profile } = await sb
    .from("profiles")
    .select("grade:member_grades(sort_order)")
    .eq("id", user.id)
    .single();

  const { data: requiredGrade } = await sb
    .from("member_grades")
    .select("sort_order")
    .eq("id", program.required_grade_id)
    .single();

  const userGrade = Array.isArray(profile?.grade) ? profile?.grade[0] : profile?.grade;
  if (userGrade && requiredGrade && userGrade.sort_order >= requiredGrade.sort_order) {
    return { allowed: true, user };
  }

  // 일반 회원 (sort_order >= 1 또는 로그인 유저) 기본 접근 허용
  if (!userGrade || userGrade.sort_order >= 1) {
    return { allowed: true, user };
  }

  return { allowed: false, error: "이 프로그램 이용 권한이 없습니다. 구독 후 이용해주세요.", status: 403 };
}
