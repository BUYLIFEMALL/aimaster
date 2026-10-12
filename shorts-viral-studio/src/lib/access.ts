import "server-only";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkProgramAccess } from "@/lib/programAccess";

const THIS_PROGRAM_SLUG = "shorts-viral-studio";
const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL || "https://www.buylife.xyz";

// 판정 규칙은 루트 lib/access/checkProgramAccess.ts의 사본(src/lib/programAccess.ts)을 그대로 쓴다
// (정지 → 관리자 → FREE 배지 → 구독 → 등급 미지정 허용 → 등급 ≥ 최소 등급 + 사용기간). 규칙이 바뀌면 사본도 같이 고칠 것.
// 권한 테이블(profiles·programs·subscriptions·user_program_access)은 RLS·쿠키 때문에 정상 권한자가 막히지 않도록
// 로그인 세션 클라이언트가 아니라 createAdminClient()로 조회한다(CLAUDE.md 핵심 원칙 6, 로그인 확인은 requireUser()).
type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

function noAccessUrl(reason?: "suspended") {
  const productPage = `${MAIN_SITE_URL}/programs/${THIS_PROGRAM_SLUG}`;
  return reason ? `${productPage}?error=${reason}` : productPage;
}

/** 로그인 + 프로그램 이용 권한을 확인한다. 권한이 없으면 프로그램 안내 페이지로 보낸다. */
export async function requireProgramAccess() {
  const user = await requireUser();
  const access = await checkProgramAccess(createAdminClient() as unknown as SupabaseLike, user.id, THIS_PROGRAM_SLUG);

  if (access.reason === "phone_required") {
    redirect(`${MAIN_SITE_URL}/settings?need_phone=1`);
  }

  if (access.reason === "suspended") {
    redirect(noAccessUrl("suspended"));
  }
  if (!access.allowed) {
    redirect(noAccessUrl());
  }
  return user;
}
