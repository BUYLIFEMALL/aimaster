// M2-7 반품 정보 읽기(서버) — 주문 칸(0099)을 따로 읽는다. 0099가 없는 DB에서도 화면이 깨지지 않게 null로.
import { createClient } from "@/lib/supabase/server";

export type ReturnInfo = {
  return_reason: string | null;
  return_memo: string;
  return_step: string | null;
  return_courier: string;
  return_tracking: string;
  return_fee: number;
  refund_status: "none" | "pending" | "done";
  refund_amount: number;
  refunded_at: string | null;
};
export type RefundAccount = { bank_name: string; bank_account: string; bank_holder: string };

export async function getReturnInfo(orderId: string): Promise<{ info: ReturnInfo | null; account: RefundAccount | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mall_builder_orders")
    .select("return_reason, return_memo, return_step, return_courier, return_tracking, return_fee, refund_status, refund_amount, refunded_at")
    .eq("id", orderId)
    .maybeSingle();
  if (error || !data) return { info: null, account: null };
  const { data: acc } = await supabase.from("mall_builder_refund_accounts").select("bank_name, bank_account, bank_holder").eq("order_id", orderId).maybeSingle();
  return { info: data as unknown as ReturnInfo, account: (acc as RefundAccount | null) ?? null };
}
