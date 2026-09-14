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

/**
 * 로그인 + "mbti-character" 프로그램 이용 권한을 함께 확인한다.
 * 권한이 없으면 AIMaster의 프로그램 소개 페이지로 리다이렉트한다.
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

  // 등급 정보가 아직 없는 신규 가입자도 최하위 기본 등급("일반")으로 취급해 허용한다.
  if (!userGrade) return user;

  redirect(`${MAIN_SITE_URL}/programs/${THIS_PROGRAM_SLUG}`);
}

/**
 * requireProgramAccess()와 동일한 판정 로직이지만, API route handler(예:
 * generate-character-image)에서 쓸 수 있도록 redirect() 대신 결과 객체를 반환한다 —
 * route handler에서 redirect()를 쓰면 fetch 호출자가 HTML 리다이렉트를 받아 res.json()
 * 파싱에 실패한다(threads/blog와 동일 패턴).
 */
export async function checkProgramAccessApi(): Promise<
  { allowed: true; user: { id: string } } | { allowed: false; error: string; status: number }
> {
  const rawClient = await createClient();
  const {
    data: { user },
  } = await rawClient.auth.getUser();
  const supabase = rawClient as unknown as SupabaseLike;

  if (!user) {
    return { allowed: false, error: "로그인이 필요합니다.", status: 401 };
  }

  const { data: suspendCheck } = await supabase
    .from("profiles")
    .select("is_suspended")
    .eq("id", user.id)
    .maybeSingle();
  if (suspendCheck?.is_suspended) {
    return { allowed: false, error: "계정이 정지되어 이용할 수 없습니다.", status: 403 };
  }

  const { data: program } = await supabase
    .from("programs")
    .select("id, required_grade_id")
    .eq("slug", THIS_PROGRAM_SLUG)
    .eq("is_active", true)
    .single();

  if (!program) {
    return { allowed: false, error: "이용 중인 프로그램을 찾을 수 없습니다.", status: 403 };
  }
  if (!program.required_grade_id) return { allowed: true, user };

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
    return { allowed: true, user };
  }
  if (!userGrade) return { allowed: true, user };

  return { allowed: false, error: "이용 권한이 없습니다.", status: 403 };
}
