"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PlaceOrderState } from "../order/actions";

// 견적 — 검사는 DB 함수(요청·거절·주문 전환)가 한다

/** 장바구니를 견적 요청서로(장바구니는 그대로) */
export async function requestQuoteAction(slug: string, form: FormData) {
  const supabase = await createClient();
  const { data: store } = await supabase.from("mall_builder_stores").select("id").eq("slug", slug).maybeSingle();
  if (!store) redirect(`/s/${slug}/cart`);
  const { data, error } = await supabase.rpc("mall_builder_request_quote", { p_store_id: store.id, p_note: String(form.get("note") ?? "") });
  if (error) redirect(`/s/${slug}/cart?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/s/${slug}`, "layout");
  redirect(`/s/${slug}/quotes/${data}?requested=1`);
}

export async function rejectQuoteAction(slug: string, quoteId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_reject_quote", { p_quote_id: quoteId });
  revalidatePath(`/s/${slug}`, "layout");
  redirect(`/s/${slug}/quotes/${quoteId}${error ? `?error=${encodeURIComponent(error.message)}` : ""}`);
}

/** 회신받은 견적을 견적가 그대로 주문 — 주문서 폼(OrderForm)이 부른다 */
export async function orderFromQuoteAction(slug: string, quoteId: string, _prev: PlaceOrderState, form: FormData): Promise<PlaceOrderState> {
  const values = { depositor: String(form.get("depositor") ?? ""), memo: String(form.get("memo") ?? "") };
  const addressId = String(form.get("address_id") ?? "");
  const expected = Number(form.get("expected_total"));
  if (!addressId) return { ...values, error: "배송지를 골라 주세요." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mall_builder_order_from_quote", {
    p_quote_id: quoteId,
    p_address_id: addressId,
    p_depositor: values.depositor,
    p_memo: values.memo,
    p_expected_total: Number.isFinite(expected) ? expected : -1,
    p_pay_method: form.get("pay_method") === "credit" ? "credit" : "bank", // 6칸 함수(0019) — 외상 검사·한도·장부는 DB가
  });
  if (error) return { ...values, error: error.message };
  const row = (data as { order_id: string; order_no: string }[] | null)?.[0];
  if (!row) return { ...values, error: "주문을 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  revalidatePath(`/s/${slug}`, "layout");
  redirect(`/s/${slug}/orders/${row.order_id}?done=1`);
}
