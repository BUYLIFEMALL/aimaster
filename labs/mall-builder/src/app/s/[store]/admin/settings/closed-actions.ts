"use server";

// 폐쇄몰(D20) 설정 — 저장·초대 코드 새로 만들기. 권한·검사는 DB 함수(0040)가 한다
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStoreBySlug } from "@/lib/store";

export type ClosedState = { error: string | null; message: string | null };

export async function saveClosedAction(slug: string, _prev: ClosedState, form: FormData): Promise<ClosedState> {
  const store = await getStoreBySlug(slug);
  const supabase = await createClient();
  const enabled = form.get("enabled") === "on";
  const { error } = await supabase.rpc("mall_builder_closed_save", {
    p_store_id: store.id,
    p_enabled: enabled,
    p_approval: form.get("approval") === "on",
    p_code: form.get("code") === "on",
    p_notice: String(form.get("notice") ?? ""),
    p_new_code: form.get("new_code") === "on",
  });
  if (error) return { error: error.message, message: null };
  revalidatePath(`/s/${slug}`, "layout");
  return { error: null, message: enabled ? "폐쇄몰을 켰습니다. 비회원 주문은 꺼졌고, 승인된 회원만 상품을 보고 주문할 수 있습니다." : "폐쇄몰을 껐습니다. 누구나 상품을 볼 수 있습니다." };
}
