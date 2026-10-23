import "server-only";
import { redirect } from "next/navigation";
import { requireUser, getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkProgramAccess } from "@/lib/programAccess";

export const THIS_PROGRAM_SLUG = "ai-influencer-studio";
const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://www.buylife.xyz";

type SupabaseLike = { from: (table: string) => any };

export async function requireProgramAccess() {
  const user = await requireUser();
  const access = await checkProgramAccess(createAdminClient() as unknown as SupabaseLike, user.id, THIS_PROGRAM_SLUG);
  if (access.reason === "phone_required") {
    redirect(`${MAIN_SITE_URL}/settings?need_phone=1`);
  }
  if (access.reason === "suspended") {
    redirect(`${MAIN_SITE_URL}/programs/${THIS_PROGRAM_SLUG}?error=suspended`);
  }
  if (!access.allowed) {
    redirect(`${MAIN_SITE_URL}/programs/${THIS_PROGRAM_SLUG}?need_access=1`);
  }
  return user;
}

export async function checkProgramAccessApi(): Promise<
  | { allowed: true; user: NonNullable<Awaited<ReturnType<typeof getUser>>> }
  | { allowed: false; error: string; status: number }
> {
  const user = await getUser();
  if (!user) return { allowed: false, error: "로그인이 필요합니다.", status: 401 };
  const access = await checkProgramAccess(createAdminClient() as unknown as SupabaseLike, user.id, THIS_PROGRAM_SLUG);
  if (access.reason === "phone_required") {
    return { allowed: false, error: "핸드폰 번호를 입력 후 사용해주세요!", status: 403 };
  }
  if (access.reason === "suspended") {
    return { allowed: false, error: "정지된 계정입니다.", status: 403 };
  }
  if (!access.allowed) {
    return { allowed: false, error: "이 프로그램의 이용 권한이 없습니다. 메인 사이트에서 이용 권한을 확인해주세요.", status: 403 };
  }
  return { allowed: true, user };
}
