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

const WARNING_ACTION = "coupang_api_warning";

/** S4 쿠팡 경고 머리글 기록. 번호는 지우고 경로 모양과 경고 글만 남긴다(주문·고객 내용 없음) */
export async function recordWingWarning(userId: string, method: string, path: string, warning: string): Promise<void> {
  const admin = createAdminClient();
  const pid = await thisProgramId(admin);
  if (!pid) return;
  await admin.from("usage_logs").insert({ user_id: userId, program_id: pid, action: WARNING_ACTION, quantity: 1, credits_used: 0, metadata: { api: `${method} ${path.replace(/\d{3,}/g, "#").replace(/\/vendors\/[^/]+/, "/vendors/#")}`, warning: warning.slice(0, 300) } });
}

/** 최근 7일 경고. 같은 경고는 한 번만 */
export async function recentWingWarnings(userId: string, nowMs = Date.now()): Promise<{ api: string; warning: string }[]> {
  const admin = createAdminClient();
  const pid = await thisProgramId(admin);
  if (!pid) return [];
  const { data } = await admin.from("usage_logs").select("metadata").eq("program_id", pid).eq("action", WARNING_ACTION).eq("user_id", userId).gte("created_at", new Date(nowMs - 7 * 86_400_000).toISOString()).order("created_at", { ascending: false }).limit(50);
  const seen = new Map<string, { api: string; warning: string }>();
  for (const row of data ?? []) {
    const m = row.metadata as { api?: string; warning?: string } | null;
    if (m?.warning && !seen.has(`${m.api}|${m.warning}`)) seen.set(`${m.api}|${m.warning}`, { api: String(m.api ?? ""), warning: m.warning });
  }
  return [...seen.values()].slice(0, 5);
}

/** 이번 달 내 호출 수(화면 표시용). 못 읽으면 null */
export async function monthlyCalls(userId: string, nowMs = Date.now()): Promise<number | null> {
  const admin = createAdminClient();
  const pid = await thisProgramId(admin);
  if (!pid) return null;
  const { count } = await admin.from("usage_logs").select("id", { count: "exact", head: true }).eq("program_id", pid).eq("action", ACTION).eq("user_id", userId).gte("created_at", kstMonthStartIso(nowMs));
  return count ?? null;
}
