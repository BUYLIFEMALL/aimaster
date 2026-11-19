import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { requireUser, getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkProgramAccess } from "@/lib/programAccess";
import { THIS_PROGRAM_SLUG, accessApiError, accessRedirect } from "@/lib/accessDecision";

export { THIS_PROGRAM_SLUG };
const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://www.buylife.xyz";

// 판정 규칙은 루트 lib/access/checkProgramAccess.ts의 사본(src/lib/programAccess.ts)을 그대로 쓴다
// (정지 → 관리자 → 핸드폰 → FREE 배지 → 구독 → 등급+사용기간). 규칙이 바뀌면 사본도 같이 고칠 것.
// 권한 테이블 조회는 RLS 차단을 피하려고 createAdminClient()로 한다(CLAUDE.md 핵심 원칙 6).
// 이 프로그램이 메인 사이트 programs 표에 등록되기 전에는 판정이 not_found라 관리자도 들어오지 못한다.
type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

/** 페이지/레이아웃·Server Action용: 로그인 + 프로그램 이용 권한을 확인하고, 없으면 안내 페이지로 보낸다. */
export const requireProgramAccess = cache(async function requireProgramAccess() {
  const user = await requireUser();
  const access = await checkProgramAccess(createAdminClient() as unknown as SupabaseLike, user.id, THIS_PROGRAM_SLUG);
  const to = accessRedirect(access, MAIN_SITE_URL);
  if (to) redirect(to);
  return user;
});

/** API route용: redirect() 대신 결과 객체를 돌려준다(fetch 호출자가 JSON을 받도록). */
export async function checkProgramAccessApi(): Promise<
  { allowed: true; user: NonNullable<Awaited<ReturnType<typeof getUser>>> } | { allowed: false; error: string; status: number }
> {
  const user = await getUser();
  if (!user) return { allowed: false, error: "로그인이 필요합니다.", status: 401 };
  const access = await checkProgramAccess(createAdminClient() as unknown as SupabaseLike, user.id, THIS_PROGRAM_SLUG);
  const err = accessApiError(access);
  if (err) return { allowed: false, ...err };
  return { allowed: true, user };
}
