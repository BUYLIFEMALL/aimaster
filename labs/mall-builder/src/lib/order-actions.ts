"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** 카드 결제 주문인지(0028) — 취소·부분 취소는 카드 환불과 함께 하는 DB 함수로 보낸다 */
async function isCardOrder(supabase: Awaited<ReturnType<typeof createClient>>, orderId: string): Promise<boolean> {
  const { data } = await supabase.from("mall_builder_orders").select("is_card").eq("id", orderId).maybeSingle();
  return Boolean(data?.is_card);
}

// 주문 상태 바꾸기 — 손님 화면·운영자 화면 공통. 누가 무엇을 바꿀 수 있는지는 DB 함수가 이동표로 검사한다
// 카드 주문을 운영자가 취소·반품 승인하면 mall_builder_card_cancel_order가 상태를 바꾸고 카드 환불까지(환불 실패면 전부 되돌림)
export async function changeOrderStatusAction(slug: string, orderId: string, to: string, backPath: string, form: FormData) {
  const supabase = await createClient();
  const note = String(form.get("note") ?? "");
  const card = (to === "cancelled" || to === "returned") && backPath.includes("/admin/") && (await isCardOrder(supabase, orderId));
  const { data, error } = card
    ? await supabase.rpc("mall_builder_card_cancel_order", { p_order_id: orderId, p_to: to, p_note: note })
    : await supabase.rpc("mall_builder_change_order_status", {
        p_order_id: orderId,
        p_to: to,
        p_note: note,
        p_courier: String(form.get("courier") ?? ""),
        p_tracking: String(form.get("tracking_no") ?? ""),
      });
  revalidatePath(`/s/${slug}`, "layout");
  // backPath는 화면이 넘기는 고정 경로 — 같은 몰 안 주소만 허용
  const path = backPath.startsWith(`/s/${slug}/`) ? backPath : `/s/${slug}/orders/${orderId}`;
  if (error) redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  redirect(`${path}?ok=1${card && typeof data === "string" ? `&msg=${encodeURIComponent(data)}` : ""}`);
}

/** 운영자 부분 취소(D5) — 품목별 「cancel_<품목 id>」 수량. 권한·상태·수량·금액 다시 계산은 DB 함수 mall_builder_cancel_order_items(카드 주문은 _card_cancel_items로 부분 환불까지) */
export async function partialCancelAction(slug: string, orderId: string, form: FormData) {
  const items = [...form.entries()]
    .filter(([k, v]) => k.startsWith("cancel_") && String(v).trim() !== "" && String(v).trim() !== "0")
    .map(([k, v]) => ({ item_id: k.slice("cancel_".length), qty: String(v).trim() }));
  const back = (q: string) => redirect(`/s/${slug}/admin/orders/${orderId}?${q}`);
  if (!items.length) back(`error=${encodeURIComponent("취소할 수량을 1개 이상 넣어 주세요.")}`);
  const supabase = await createClient();
  const note = String(form.get("note") ?? "");
  const { error } = (await isCardOrder(supabase, orderId))
    ? await supabase.rpc("mall_builder_card_cancel_items", { p_order_id: orderId, p_items: items, p_note: note })
    : await supabase.rpc("mall_builder_cancel_order_items", { p_order_id: orderId, p_items: items, p_note: note });
  revalidatePath(`/s/${slug}`, "layout");
  back(error ? `error=${encodeURIComponent(error.message)}` : "ok=partial");
}

/** 운영자: 결과가 불확실한 카드 결제를 토스에 다시 물어 맞춘다(0028 mall_builder_card_recheck) */
export async function recheckCardAction(slug: string, orderId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mall_builder_card_recheck", { p_order_id: orderId });
  revalidatePath(`/s/${slug}`, "layout");
  const status = (data as { toss_status?: string } | null)?.toss_status ?? "";
  redirect(`/s/${slug}/admin/orders/${orderId}?${error ? `error=${encodeURIComponent(error.message)}` : `ok=1&msg=${encodeURIComponent(`토스 결제 상태: ${status || "알 수 없음"}`)}`}`);
}
