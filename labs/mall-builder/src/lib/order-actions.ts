"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// 주문 상태 바꾸기 — 손님 화면·운영자 화면 공통. 누가 무엇을 바꿀 수 있는지는 DB 함수가 이동표로 검사한다
export async function changeOrderStatusAction(slug: string, orderId: string, to: string, backPath: string, form: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_change_order_status", {
    p_order_id: orderId,
    p_to: to,
    p_note: String(form.get("note") ?? ""),
    p_courier: String(form.get("courier") ?? ""),
    p_tracking: String(form.get("tracking_no") ?? ""),
  });
  revalidatePath(`/s/${slug}`, "layout");
  // backPath는 화면이 넘기는 고정 경로 — 같은 몰 안 주소만 허용
  const path = backPath.startsWith(`/s/${slug}/`) ? backPath : `/s/${slug}/orders/${orderId}`;
  redirect(`${path}?${error ? `error=${encodeURIComponent(error.message)}` : "ok=1"}`);
}
