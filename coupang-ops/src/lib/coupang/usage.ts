import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { thisProgramId } from "@/lib/readGap";
import { kstMonthStartIso } from "@/lib/coupang/usageRule";

// 쿠팡 호출 기록(C9-1). 공용 usage_logs에 호출 1회당 1행, 주소·주문 내용은 남기지 않는다. 기록 실패가 쿠팡 처리를 막지 않는다.
const ACTION = "coupang_api_call";

export async function recordWingCalls(userId: string, calls: number): Promise<void> {
  const admin = createAdminClient();
  const pid = await thisProgramId(admin);
  if (!pid || calls <= 0) return;
  await admin.from("usage_logs").insert(Array.from({ length: calls }, () => ({ user_id: userId, program_id: pid, action: ACTION, quantity: 1, credits_used: 0, metadata: null })));
}

/** 이번 달 내 호출 수(화면 표시용). 못 읽으면 null */
export async function monthlyCalls(userId: string, nowMs = Date.now()): Promise<number | null> {
  const admin = createAdminClient();
  const pid = await thisProgramId(admin);
  if (!pid) return null;
  const { count } = await admin.from("usage_logs").select("id", { count: "exact", head: true }).eq("program_id", pid).eq("action", ACTION).eq("user_id", userId).gte("created_at", kstMonthStartIso(nowMs));
  return count ?? null;
}
