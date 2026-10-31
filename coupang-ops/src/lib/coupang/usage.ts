import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { thisProgramId } from "@/lib/readGap";
import { budgetMessage, DEFAULT_DAILY_LIMIT, DEFAULT_MONTHLY_LIMIT, kstDayStartIso, kstMonthStartIso, positiveInt, reachedWarning, warningTitle, type UsageCounts } from "@/lib/coupang/usageRule";

// 쿠팡 호출 기록(C9-1). 공용 usage_logs에 호출 1회당 1행, 주소·주문 내용은 남기지 않는다. 기록 실패가 쿠팡 처리를 막지 않는다.
const ACTION = "coupang_api_call";

export async function recordWingCalls(userId: string, calls: number): Promise<void> {
  const admin = createAdminClient();
  const pid = await thisProgramId(admin);
  if (!pid || calls <= 0) return;
  await admin.from("usage_logs").insert(Array.from({ length: calls }, () => ({ user_id: userId, program_id: pid, action: ACTION, quantity: 1, credits_used: 0, metadata: null })));
}

/** 회원의 오늘 호출 수와 프로그램 전체의 이번 달 호출 수. 못 읽으면 0으로 두어 조회를 막지 않는다 */
export async function usageCounts(userId: string, nowMs = Date.now()): Promise<UsageCounts> {
  const admin = createAdminClient();
  const dailyLimit = positiveInt(process.env.COUPANG_DAILY_CALL_LIMIT, DEFAULT_DAILY_LIMIT);
  const monthlyLimit = positiveInt(process.env.FIXIE_MONTHLY_LIMIT, DEFAULT_MONTHLY_LIMIT);
  const pid = await thisProgramId(admin);
  if (!pid) return { today: 0, month: 0, dailyLimit, monthlyLimit };
  const base = () => admin.from("usage_logs").select("id", { count: "exact", head: true }).eq("program_id", pid).eq("action", ACTION);
  const [today, month] = await Promise.all([base().eq("user_id", userId).gte("created_at", kstDayStartIso(nowMs)), base().gte("created_at", kstMonthStartIso(nowMs))]);
  return { today: today.count ?? 0, month: month.count ?? 0, dailyLimit, monthlyLimit };
}

/** 70%를 넘으면 관리자 요청함에 달마다 한 번 알린다 */
async function warnOwnerOnce(month: number, monthlyLimit: number, nowMs: number): Promise<void> {
  const admin = createAdminClient();
  const title = warningTitle(nowMs);
  const { data } = await admin.from("admin_dev_requests").select("id").eq("kind", "owner_action").eq("title", title).limit(1);
  if (data?.length) return;
  await admin.from("admin_dev_requests").insert({ kind: "owner_action", status: "open", category: "cost", title, note: `이번 달 쿠팡 호출 ${month}회 / 한도 ${monthlyLimit}회. 토스 연동 사용량은 빠져 있으니 Fixie 화면과 함께 보고 유료 전환을 결정해 주세요.`, from_session: "coupang-ops-auto" });
}

/** 재고 점검·목록 같은 선택 조회 전에 부른다. 주문·송장·쓰기 흐름에는 걸지 않는다. 막을 때만 문구를 돌려준다 */
export async function callBudgetBlock(userId: string): Promise<string> {
  const nowMs = Date.now();
  const counts = await usageCounts(userId, nowMs).catch(() => null);
  if (!counts) return "";
  if (reachedWarning(counts.month, counts.monthlyLimit)) await warnOwnerOnce(counts.month, counts.monthlyLimit, nowMs).catch(() => {});
  return budgetMessage(counts);
}
