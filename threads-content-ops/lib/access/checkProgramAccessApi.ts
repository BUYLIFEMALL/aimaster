// API 라우트용 이용 권한 확인(redirect 없이 결과 객체) — 다른 프로그램의 `checkProgramAccessApi()`와 같은 모양.
// 로그인(쿠키 세션) 확인 → 기존 checkProgramAccess(정지·관리자·핸드폰·FREE·구독·등급+사용기간)로 판정한다. 2026-11-06 U10.
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { checkProgramAccess } from "./checkProgramAccess";

export const PROGRAM_SLUG = "threads-content-ops";

export async function checkProgramAccessApi(): Promise<
  | { allowed: true; user: User }
  | { allowed: false; error: string; status: number }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { allowed: false, error: "로그인이 필요합니다.", status: 401 };
  const result = await checkProgramAccess(supabase as never, user.id, PROGRAM_SLUG);
  if (!result.allowed) {
    return { allowed: false, error: "이 프로그램의 이용 권한이 없습니다. 메인 사이트에서 이용 권한을 확인해 주세요.", status: 403 };
  }
  return { allowed: true, user };
}
