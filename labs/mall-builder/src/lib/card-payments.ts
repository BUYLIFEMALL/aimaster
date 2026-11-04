// 카드 결제 기록 읽기(0028 mall_builder_card_payments) — 보안 규칙상 그 몰 운영자와 그 주문의 손님만 읽힌다
import { createClient } from "@/lib/supabase/server";

export type CardPayment = {
  status: string;
  amount: number;
  canceled_amount: number;
  method: string;
  approved_at: string | null;
  receipt_url: string;
  error: string;
  updated_at: string;
};

export async function getCardPayment(orderId: string): Promise<CardPayment | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mall_builder_card_payments")
    .select("status, amount, canceled_amount, method, approved_at, receipt_url, error, updated_at")
    .eq("order_id", orderId)
    .maybeSingle();
  return (data as CardPayment | null) ?? null;
}
