import "server-only";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// AIMaster 공용 DB의 programs/subscriptions/user_program_access 기준으로 「이 프로그램을 쓸 권한」까지 확인한다.
// 로그인 확인은 쿠키 세션으로, 권한 표 조회는 서비스 키(createAdminClient)로 한다 — RLS나 서브도메인 쿠키 때문에
// 권한 있는 회원이 튕기는 사고를 막는 공통 규칙(루트 CLAUDE.md 핵심 원칙 6).
// 판정 순서(모든 프로그램 공통): 정지 → 관리자 → 핸드폰 → FREE 배지 → 결제 구독 → (최소 등급 없음) → 등급 ≥ 최소 등급 + 사용기간.
import { evaluateAccess as judge, THIS_PROGRAM_SLUG, type Db, type Verdict } from "@/lib/accessVerdict";

export { THIS_PROGRAM_SLUG };
const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://www.buylife.xyz";

export async function evaluateAccess(userId: string): Promise<Verdict> {
  return judge(userId, createAdminClient() as unknown as Db);
}

/** 페이지·레이아웃·Server Action용: 권한이 없으면 안내 화면으로 보낸다. */
export async function requireProgramAccess() {
  const user = await requireUser();
  const v = await evaluateAccess(user.id);
  if (v.ok) return user;
  if (v.reason === "suspended") redirect(`${MAIN_SITE_URL}/programs/${THIS_PROGRAM_SLUG}?error=suspended`);
  if (v.reason === "phone") redirect(`${MAIN_SITE_URL}/settings?need_phone=1`);
  redirect(`${MAIN_SITE_URL}/programs/${THIS_PROGRAM_SLUG}`);
}

/** API 라우트용: redirect 대신 결과 객체(JSON 오류 응답에 씀). */
export async function checkProgramAccessApi(): Promise<
  | { allowed: true; user: { id: string; email?: string | null } }
  | { allowed: false; error: string; status: number }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { allowed: false, error: "로그인이 필요합니다.", status: 401 };
  const v = await evaluateAccess(user.id);
  if (v.ok) return { allowed: true, user };
  if (v.reason === "suspended") return { allowed: false, error: "계정이 정지되어 이용할 수 없습니다. 고객센터에 문의해주세요.", status: 403 };
  if (v.reason === "phone") return { allowed: false, error: "핸드폰 번호를 입력 후 사용해주세요!", status: 403 };
  return { allowed: false, error: "이 프로그램의 이용 권한이 필요합니다.", status: 403 };
}
