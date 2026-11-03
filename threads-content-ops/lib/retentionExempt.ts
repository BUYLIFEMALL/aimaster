import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// 30일 자동 삭제 예외 회원(관리자·시험 계정, 2026-10-31 승인·2026-11-03 재지시). 기준은 DB 한 곳 profiles.retention_exempt = true(코드에 이메일 없음).
// 근거: docs/PLAN_20261031_RETENTION_EXEMPT_ACCOUNTS.md

/** 이 회원 자료를 지우면 안 되면 true — 예외 회원이거나, 예외 여부를 읽지 못했을 때(잘못 지우지 않게). */
export async function retentionCleanupBlocked(service: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await service.from("profiles").select("retention_exempt").eq("id", userId).maybeSingle();
  return Boolean(error) || data?.retention_exempt === true;
}
