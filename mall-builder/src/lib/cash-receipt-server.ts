// M2-10 현금영수증 읽기(서버) — 주문 칸(0100)을 따로 읽는다. 0100이 없는 DB에서도 화면이 깨지지 않게 「없음」으로.
import { createClient } from "@/lib/supabase/server";
import type { CashReceipt } from "./cash-receipt";

export async function getCashReceipt(orderId: string): Promise<{ ready: boolean; receipt: CashReceipt | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("mall_builder_orders").select("cash_receipt").eq("id", orderId).maybeSingle();
  if (error || !data) return { ready: false, receipt: null };
  return { ready: true, receipt: ((data as { cash_receipt: CashReceipt | null }).cash_receipt ?? null) };
}
