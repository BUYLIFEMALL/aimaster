import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkProgramAccess, type ProgramAccessReason } from "@/lib/programAccess";
import { PROGRAM_SLUG } from "@/lib/version";

// 판정 규칙은 루트 lib/access/checkProgramAccess.ts의 사본(src/lib/programAccess.ts, ai-mastering-studio와 같은 파일)을 쓴다
// (정지 → 관리자 → 핸드폰 → FREE 배지 → 구독 → 등급+사용기간). 권한 표 조회는 RLS 차단을 피하려고 admin 클라이언트로 한다.
type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

type User = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** 페이지용: 로그인한 회원의 이용 권한 판정 결과를 돌려준다(화면이 안내 문구를 고른다). */
export async function getProgramAccess(user: User): Promise<{ allowed: boolean; reason: ProgramAccessReason }> {
  const access = await checkProgramAccess(createAdminClient() as unknown as SupabaseLike, user.id, PROGRAM_SLUG);
  return { allowed: access.allowed, reason: access.reason };
}

/** API route용: redirect() 대신 결과 객체를 돌려준다(fetch 호출자가 JSON을 받도록). */
export async function checkProgramAccessApi(): Promise<
  { allowed: true; user: User } | { allowed: false; error: string; status: number }
> {
  const user = await getCurrentUser();
  if (!user) return { allowed: false, error: "로그인이 필요합니다.", status: 401 };
  const access = await getProgramAccess(user);
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
