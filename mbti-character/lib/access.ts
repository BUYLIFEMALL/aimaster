import "server-only";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * 캐릭코드(mbti-character)는 AIMaster와 같은 Supabase 프로젝트를 공유한다.
 * 2026-09-14 사용자 결정으로 이 프로그램은 로그인이 필요해졌다 — "한번 가입하면 다른
 * 프로그램도 쓸 수 있으니 이 프로그램은 회원가입 유도용으로도 써도 좋을 듯"이라는 취지라,
 * required_grade_id를 "일반"(가장 낮은 기본 등급, 모든 신규 가입자가 기본으로 갖는 등급)으로
 * 유지해서 사실상 "로그인만 하면 누구나 무료로 이용" 조건이 되게 한다 — 구독/결제는 요구하지
 * 않는다. threads/blog 등 다른 서브프로젝트의 requireProgramAccess() 패턴과 동일한 구조를
 * 따르되, 이 프로그램은 등급 요건 외의 구독 결제 레이어(pricing_plans)를 두지 않는다.
 *
 * AIMaster Database 타입 생성기를 이 프로젝트에 따로 두지 않았으므로(자기완결형 서브프로젝트
 * 원칙), from()의 반환값은 threads/lib/access.ts와 동일하게 느슨한 타입으로 받는다.
 */
type SupabaseLike = {
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

const THIS_PROGRAM_SLUG = "mbti-character";
const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

function isNotExpired(expiresAt: string | null): boolean {
  return !expiresAt || new Date(expiresAt) > new Date();
}

type AccessDecision = { allowed: true } | { allowed: false; reason: "suspended" | "not_found" | "no_access" };

/**
 * 플랫폼 공통 이용 권한 규칙(루트 CLAUDE.md 핵심 원칙 6번, 2026-09-30):
 * 정지 → 차단 / 관리자 → 허용 / FREE 배지 → 가입한 회원이면 등급과 무관하게 허용 / 결제 구독 → 허용 /
 * 최소 등급 없음 → 허용 / 일반 등급 이상 + 관리자가 넣어준 사용기간(user_program_access) → 허용 / 그 외 차단.
 * 이 프로그램은 FREE 배지를 달아 "가입만 하면 무료"로 운영한다(회원가입 유도용).
 */
async function decideAccess(supabase: SupabaseLike, userId: string): Promise<AccessDecision> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_suspended, is_admin, grade:member_grades(sort_order)")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.is_suspended) return { allowed: false, reason: "suspended" };

  const { data: program } = await supabase
    .from("programs")
    .select("id, required_grade_id, badges, required_grade:member_grades!required_grade_id(sort_order)")
    .eq("slug", THIS_PROGRAM_SLUG)
    .eq("is_active", true)
    .maybeSingle();
  if (!program) return { allowed: false, reason: "not_found" };

  if (profile?.is_admin || (program.badges ?? []).includes("free")) return { allowed: true };

  const { data: subs } = await supabase
    .from("subscriptions")
    .select("status, expires_at")
    .eq("user_id", userId)
    .eq("program_id", program.id);
  const hasActiveSub = (subs ?? []).some(
    (s: { status: string; expires_at: string | null }) => s.status === "active" && isNotExpired(s.expires_at),
  );
  if (hasActiveSub) return { allowed: true };

  if (!program.required_grade_id) return { allowed: true };

  const { data: grant } = await supabase
    .from("user_program_access")
    .select("expires_at")
    .eq("user_id", userId)
    .eq("program_id", program.id)
    .maybeSingle();
  const userGrade = Array.isArray(profile?.grade) ? profile?.grade[0] : profile?.grade;
  const requiredGrade = Array.isArray(program.required_grade) ? program.required_grade[0] : program.required_grade;
  const meetsGrade = !!userGrade && !!requiredGrade && userGrade.sort_order >= requiredGrade.sort_order;
  if (meetsGrade && grant && isNotExpired(grant.expires_at)) return { allowed: true };

  return { allowed: false, reason: "no_access" };
}

/**
 * 로그인 + 이 프로그램 이용 권한을 함께 확인한다. 권한이 없으면 AIMaster의 프로그램 소개 페이지로 보낸다.
 */
export async function requireProgramAccess() {
  const user = await requireUser();
  const supabase = (await createClient()) as unknown as SupabaseLike;
  const decision = await decideAccess(supabase, user.id);
  if (decision.allowed) return user;
  if (decision.reason === "suspended") redirect(`${MAIN_SITE_URL}/programs/${THIS_PROGRAM_SLUG}?error=suspended`);
  redirect(`${MAIN_SITE_URL}/programs/${THIS_PROGRAM_SLUG}`);
}

/**
 * requireProgramAccess()와 같은 판정이지만 API route용으로 redirect() 대신 결과 객체를 돌려준다
 * (route handler에서 redirect()를 쓰면 fetch 호출자의 res.json() 파싱이 깨진다).
 */
export async function checkProgramAccessApi(): Promise<
  { allowed: true; user: { id: string } } | { allowed: false; error: string; status: number }
> {
  const rawClient = await createClient();
  const {
    data: { user },
  } = await rawClient.auth.getUser();
  if (!user) return { allowed: false, error: "로그인이 필요합니다.", status: 401 };

  const decision = await decideAccess(rawClient as unknown as SupabaseLike, user.id);
  if (decision.allowed) return { allowed: true, user };
  if (decision.reason === "suspended") return { allowed: false, error: "계정이 정지되어 이용할 수 없습니다.", status: 403 };
  if (decision.reason === "not_found") return { allowed: false, error: "이용 중인 프로그램을 찾을 수 없습니다.", status: 403 };
  return { allowed: false, error: "이용 권한이 없습니다.", status: 403 };
}
