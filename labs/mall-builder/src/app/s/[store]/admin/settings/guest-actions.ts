"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type GuestSettingState = { error: string | null; message: string | null };

// 비회원 주문 켜기·끄기(D15) — 몰 설정 settings.guest_order. 보안 규칙이 그 몰 운영자만 고치게 한다
export async function saveGuestSettingAction(slug: string, _prev: GuestSettingState, form: FormData): Promise<GuestSettingState> {
  const on = form.get("guest_order") === "on";
  const supabase = await createClient();
  const { data: store } = await supabase.from("mall_builder_stores").select("id, settings").eq("slug", slug).maybeSingle();
  if (!store) return { error: "몰을 찾을 수 없습니다.", message: null };
  // 폐쇄몰(D20)에서는 비회원 주문을 켤 수 없다(DB 주문 트리거도 막음)
  const closedOn = (store.settings as { closed?: { enabled?: boolean } } | null)?.closed?.enabled === true;
  if (on && closedOn) return { error: "폐쇄몰이 켜져 있어 비회원 주문을 켤 수 없습니다. 폐쇄몰을 먼저 꺼 주세요.", message: null };
  const settings = { ...((store.settings as Record<string, unknown> | null) ?? {}), guest_order: on };
  const { data, error } = await supabase.from("mall_builder_stores").update({ settings }).eq("id", store.id).select("id");
  if (error) return { error: error.message, message: null };
  if (!data?.length) return { error: "이 몰을 고칠 권한이 없습니다.", message: null };
  revalidatePath(`/s/${slug}`, "layout");
  return { error: null, message: on ? "비회원 주문을 켰습니다. 로그인하지 않은 손님도 장바구니에 담고 무통장으로 주문할 수 있습니다." : "비회원 주문을 껐습니다." };
}
