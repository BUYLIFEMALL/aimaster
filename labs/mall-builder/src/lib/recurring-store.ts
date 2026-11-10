// D30 정기 주문 — 서버 읽기(보안 규칙상 손님은 자기 것만, 「주문」 권한 직원은 몰 전체)
import { createClient } from "./supabase/server";
import type { RecurringKind, RecurringPay, RecurringStatus } from "./recurring";

export type RecurringItem = { product_id: string; variant_id: string | null; qty: number; name: string; option: string };
export type RecurringRow = {
  id: string; store_id: string; customer_id: string; user_id: string; items: RecurringItem[];
  kind: RecurringKind; weekday: number | null; every_weeks: number; month_day: number | null; next_date: string;
  pay_method: RecurringPay; address_id: string | null; depositor: string; memo: string; status: RecurringStatus;
  last_run_date: string | null; last_status: "ordered" | "failed" | null; last_reason: string | null; last_order_id: string | null; created_at: string;
  customer?: { name: string; company: string | null } | null;
};
export type RecurringRun = { id: string; recurring_id: string; run_date: string; status: "ordered" | "failed"; order_id: string | null; total: number | null; reason: string | null; created_at: string };

const COLS = "id, store_id, customer_id, user_id, items, kind, weekday, every_weeks, month_day, next_date, pay_method, address_id, depositor, memo, status, last_run_date, last_status, last_reason, last_order_id, created_at";

export async function getMyRecurring(storeId: string, userId: string): Promise<RecurringRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_recurring_orders").select(COLS).eq("store_id", storeId).eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
  return (data ?? []) as RecurringRow[];
}

export async function getStoreRecurring(storeId: string): Promise<RecurringRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mall_builder_recurring_orders")
    .select(`${COLS}, customer:mall_builder_store_customers(name, company)`)
    .eq("store_id", storeId)
    .order("status")
    .order("next_date")
    .limit(500);
  return (data ?? []) as unknown as RecurringRow[];
}

export async function getRecurringRuns(storeId: string, recurringIds?: string[], limit = 50): Promise<RecurringRun[]> {
  const supabase = await createClient();
  let q = supabase.from("mall_builder_recurring_runs").select("id, recurring_id, run_date, status, order_id, total, reason, created_at").eq("store_id", storeId);
  if (recurringIds) q = q.in("recurring_id", recurringIds.length ? recurringIds : ["00000000-0000-0000-0000-000000000000"]);
  const { data } = await q.order("created_at", { ascending: false }).limit(limit);
  return (data ?? []) as RecurringRun[];
}

export async function getRecurringPaused(storeId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_recurring_settings").select("paused").eq("store_id", storeId).maybeSingle();
  return !!data?.paused;
}
