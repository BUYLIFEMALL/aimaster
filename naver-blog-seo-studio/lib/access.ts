import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const PROGRAM_SLUG = "naver-blog-seo-studio";
const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://www.buylife.xyz";

type AccessResult =
  | { allowed: true; user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>> }
  | { allowed: false; error: string; status: number };

function activeExpiry(expiresAt: string | null) {
  return !expiresAt || new Date(expiresAt) > new Date();
}

/** 핸드폰 번호 필수 정책(2026-10-12): 핸드폰(010·011·016·017·018·019)만 유효. 루트 lib/utils/phone.ts 와 같은 규칙. */
const hasMobilePhone = (v: unknown): boolean => typeof v === "string" && /^01[016789]\d{7,8}$/.test(v.replace(/[^0-9]/g, ""));

export async function getSessionUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

// BLC-11 (2026-10-22): slug를 넘기면 다른 프로그램(예: blog-keyword) 권한도 같은 순서로 확인한다. 기본은 이 프로그램.
export async function checkProgramAccessApi(slug: string = PROGRAM_SLUG): Promise<AccessResult> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) return { allowed: false, error: "로그인이 필요합니다.", status: 401 };

  // Platform rule (root CLAUDE.md core principle 6, 2026-09-30): suspended → deny / admin → allow /
  // FREE badge → any signed-up member regardless of grade / paid subscription → allow /
  // no minimum grade → allow / grade ≥ minimum AND admin-granted period → allow / otherwise deny.
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_suspended, is_admin, grade:member_grades(sort_order), phone")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.is_suspended) {
    return { allowed: false, error: "계정이 정지되어 이용할 수 없습니다. 고객센터에 문의해주세요.", status: 403 };
  }
  // 핸드폰 번호 필수 정책(2026-10-12): 번호가 없으면 FREE 프로그램 포함 모두 차단(관리자 제외).
  if (!profile?.is_admin && !hasMobilePhone(profile?.phone)) {
    return { allowed: false, error: "핸드폰 번호를 입력 후 사용해주세요!", status: 403 };
  }

  const { data: program } = await supabase
    .from("programs")
    .select("id, required_grade_id, badges, required_grade:member_grades!required_grade_id(sort_order)")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (!program) return { allowed: false, error: "이용 가능한 프로그램이 아닙니다.", status: 403 };

  if (profile?.is_admin || (program.badges ?? []).includes("free")) return { allowed: true, user };

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("status, expires_at")
    .eq("user_id", user.id)
    .eq("program_id", program.id);
  if ((subscriptions ?? []).some((item) => item.status === "active" && activeExpiry(item.expires_at))) {
    return { allowed: true, user };
  }

  if (!program.required_grade_id) return { allowed: true, user };

  const { data: grant } = await supabase
    .from("user_program_access")
    .select("expires_at")
    .eq("user_id", user.id)
    .eq("program_id", program.id)
    .maybeSingle();
  const userGrade = Array.isArray(profile?.grade) ? profile?.grade[0] : profile?.grade;
  const requiredGrade = Array.isArray(program.required_grade) ? program.required_grade[0] : program.required_grade;
  const meetsGrade =
    userGrade?.sort_order != null && requiredGrade?.sort_order != null && userGrade.sort_order >= requiredGrade.sort_order;
  if (meetsGrade && grant && activeExpiry(grant.expires_at)) return { allowed: true, user };

  return { allowed: false, error: "이 프로그램의 이용 권한이 없습니다.", status: 403 };
}

export async function requireProgramAccess() {
  const result = await checkProgramAccessApi();
  if (result.allowed) return result.user;
  if (result.status === 401) redirect(`/login?redirect=${encodeURIComponent("/dashboard")}`);
  redirect(`${MAIN_SITE_URL}/programs/${PROGRAM_SLUG}`);
}

export { PROGRAM_SLUG };
