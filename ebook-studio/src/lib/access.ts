import "server-only";
import { redirect } from "next/navigation";
import { requireUser, getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkProgramAccess } from "@/lib/programAccess";
import { APP_SLUG } from "@/lib/version";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://www.buylife.xyz";

type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

/** 페이지/레이아웃용: 로그인 + 프로그램 이용 권한을 확인하고, 없으면 안내 페이지로 보낸다. */
export async function requireProgramAccess() {
  const user = await requireUser();
  const access = await checkProgramAccess(createAdminClient() as unknown as SupabaseLike, user.id, APP_SLUG);
  if (access.reason === "suspended") {
    redirect(`${MAIN_SITE_URL}/programs/${APP_SLUG}?error=suspended`);
  }
  if (!access.allowed) {
    redirect(`${MAIN_SITE_URL}/programs/${APP_SLUG}?need_access=1`);
  }
  return user;
}

/** API route용: redirect() 대신 결과 객체를 돌려준다. */
export async function checkProgramAccessApi(): Promise<
  | { allowed: true; user: NonNullable<Awaited<ReturnType<typeof getUser>>> }
  | { allowed: false; error: string; status: number }
> {
  const user = await getUser();
  if (!user) return { allowed: false, error: "로그인이 필요합니다.", status: 401 };
  const access = await checkProgramAccess(createAdminClient() as unknown as SupabaseLike, user.id, APP_SLUG);
  if (access.reason === "suspended") {
    return { allowed: false, error: "정지된 계정입니다.", status: 403 };
  }
  if (!access.allowed) {
    return { allowed: false, error: "이 프로그램의 이용 권한이 없습니다.", status: 403 };
  }
  return { allowed: true, user };
}
