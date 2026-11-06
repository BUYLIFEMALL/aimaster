"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateLookup } from "@/lib/guest";
import { readGuestTokens, saveGuestToken } from "@/lib/guest-store";

// 비회원 주문 조회·상태 변경(D15) — 토큰·권한·이동표는 DB 함수가 검사한다

async function storeId(slug: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_stores").select("id").eq("slug", slug).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/** 주문번호 + 휴대폰 → 새 조회 토큰을 쿠키에 담고 주문 상세로 */
export async function lookupGuestOrderAction(slug: string, form: FormData) {
  const back = (error: string): never => redirect(`/s/${slug}/guest?error=${encodeURIComponent(error)}`);
  const v = validateLookup({ order_no: form.get("order_no"), phone: form.get("phone") });
  if (!v.ok) return back(v.error);
  const id = await storeId(slug);
  if (!id) back("몰을 찾을 수 없습니다.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mall_builder_guest_lookup", { p_store_id: id, p_order_no: v.value.orderNo, p_phone: v.value.phone });
  if (error) back(error.message);
  const row = data as { order_id: string; token: string };
  await saveGuestToken(slug, row.order_id, row.token);
  redirect(`/s/${slug}/guest/orders/${row.order_id}`);
}

/** 비회원 손님의 상태 변경(입금 전 취소·취소 요청·구매 확정·반품 요청) */
export async function guestChangeStatusAction(slug: string, orderId: string, to: string) {
  const here = `/s/${slug}/guest/orders/${orderId}`;
  const token = (await readGuestTokens(slug))[orderId];
  if (!token) redirect(`/s/${slug}/guest?error=${encodeURIComponent("주문 조회가 만료되었습니다. 다시 조회해 주세요.")}`);
  const id = await storeId(slug);
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_guest_change_status", { p_store_id: id, p_order_id: orderId, p_token: token, p_to: to });
  revalidatePath(`/s/${slug}`, "layout");
  redirect(`${here}?${error ? `error=${encodeURIComponent(error.message)}` : "ok=1"}`);
}
