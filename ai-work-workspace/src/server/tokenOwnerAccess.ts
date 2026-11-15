// 2026-11-15 로그인 쿠키 없이 토큰으로 들어오는 주소(캘린더 구독·MCP·공개 REST API·회원 정시 실행·공개 페이지)가 함께 쓰는
// 「토큰 주인 회원이 지금 이 프로그램을 쓸 수 있는가」 판정 한 곳. 판정 규칙은 공용 checkProgramAccess 그대로(정지·관리자·핸드폰·FREE·구독·등급+사용기간).
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkProgramAccess } from "@/lib/programAccess";
import { THIS_PROGRAM_SLUG } from "@/lib/access";

type AccessClient = Parameters<typeof checkProgramAccess>[0];

/** 토큰 주인(userId)의 이 프로그램 이용 권한. client를 넘기면 그것으로(회원 정시 실행처럼 이미 만든 서버 클라이언트 재사용) */
export async function tokenOwnerAllowed(userId: string, client?: unknown): Promise<boolean> {
  if (!userId) return false;
  const c = (client ?? createAdminClient()) as unknown as AccessClient;
  return (await checkProgramAccess(c, userId, THIS_PROGRAM_SLUG)).allowed;
}
