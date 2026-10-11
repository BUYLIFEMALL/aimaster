import "server-only";
import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkProgramAccess } from "@/lib/programAccess";
import { THIS_PROGRAM_SLUG } from "@/lib/version";

type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * API route용: 로그인 + 이 프로그램의 이용 권한을 확인한다(redirect 대신 결과 객체).
 * 권한 판정은 루트 lib/access/checkProgramAccess.ts 의 사본을 쓰고, 권한 테이블 조회는 RLS 차단을 피하려고 서비스 키로 한다(핵심 원칙 6).
 */
export async function authorize(): Promise<{ ok: true; userId: string } | { ok: false; response: NextResponse }> {
  const user = await getUser();
  if (!user) return { ok: false, response: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }) };
  const access = await checkProgramAccess(createAdminClient() as unknown as SupabaseLike, user.id, THIS_PROGRAM_SLUG);
  if (access.reason === "suspended") return { ok: false, response: NextResponse.json({ error: "정지된 계정입니다." }, { status: 403 }) };
  if (!access.allowed) {
    return { ok: false, response: NextResponse.json({ error: "이 프로그램의 이용 권한이 없습니다. 메인 사이트에서 이용 권한을 확인해주세요." }, { status: 403 }) };
  }
  return { ok: true, userId: user.id };
}
