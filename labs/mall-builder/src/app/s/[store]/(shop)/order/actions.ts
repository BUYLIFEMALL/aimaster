"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PlaceOrderState = { error: string | null; depositor: string; memo: string };

// 금액·재고·외상 한도는 DB 함수 mall_builder_place_order(6칸)가 다시 계산·검사한다(화면 금액은 「확인용」으로만 보낸다)
// 장바구니 비우기는 함수 밖에서 손님 권한으로 한다 — DB 함수에 지우기를 넣으면 적용 확인 창이 막힘(docs/mall/LESSONS_LEARNED.md)
export async function placeOrderAction(slug: string, _prev: PlaceOrderState, form: FormData): Promise<PlaceOrderState> {
  const values = { depositor: String(form.get("depositor") ?? ""), memo: String(form.get("memo") ?? "") };
  const addressId = String(form.get("address_id") ?? "");
  const expected = Number(form.get("expected_total"));
  const payMethod = form.get("pay_method") === "credit" ? "credit" : "bank";
  if (!addressId) return { ...values, error: "배송지를 골라 주세요." };
  const supabase = await createClient();
  const { data: store } = await supabase.from("mall_builder_stores").select("id").eq("slug", slug).maybeSingle();
  if (!store) return { ...values, error: "몰을 찾을 수 없습니다." };
  const { data, error } = await supabase.rpc("mall_builder_place_order", {
    p_store_id: store.id,
    p_address_id: addressId,
    p_depositor: values.depositor,
    p_memo: values.memo,
    p_expected_total: Number.isFinite(expected) ? expected : -1,
    p_pay_method: payMethod,
  });
  if (error) return { ...values, error: error.message };
  const row = (data as { order_id: string; order_no: string }[] | null)?.[0];
  if (!row) return { ...values, error: "주문을 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  const { data: auth } = await supabase.auth.getUser();
  if (auth.user) await supabase.from("mall_builder_cart_items").delete().eq("store_id", store.id).eq("user_id", auth.user.id);
  revalidatePath(`/s/${slug}`, "layout");
  redirect(`/s/${slug}/orders/${row.order_id}?done=1`);
}
