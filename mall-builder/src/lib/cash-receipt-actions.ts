"use server";

// M2-10 현금영수증 서버 동작 — 권한·상태 검사와 볼타 호출은 DB 함수(0100)가 한다. 끝나면 그 화면으로 돌아가 결과를 보여 준다
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseCashReceiptForm } from "./cash-receipt";

function finish(slug: string, path: string, error: { message: string } | null, msg: string): never {
  revalidatePath(`/s/${slug}`, "layout");
  const safe = path.startsWith(`/s/${slug}/`) ? path : `/s/${slug}`;
  redirect(error ? `${safe}?error=${encodeURIComponent(error.message)}` : `${safe}?ok=1&msg=${encodeURIComponent(msg)}`);
}

/** 유저: 신청 */
export async function requestCashReceiptAction(slug: string, orderId: string, backPath: string, form: FormData) {
  const p = parseCashReceiptForm(String(form.get("kind") ?? ""), String(form.get("value") ?? ""));
  if (!p.ok) finish(slug, backPath, { message: p.error }, "");
  const v = p as Extract<typeof p, { ok: true }>;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mall_builder_cash_receipt_request", { p_order_id: orderId, p_type: v.type, p_value: v.value, p_purpose: v.purpose });
  const st = (data as { status?: string } | null)?.status;
  finish(slug, backPath, error, st === "requested" ? "현금영수증을 신청했습니다. 입금이 확인되면 발급됩니다." : "현금영수증 발급을 요청했습니다.");
}

/** 유저·운영사: 결과 다시 확인 */
export async function recheckCashReceiptAction(slug: string, orderId: string, backPath: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_cash_receipt_recheck", { p_order_id: orderId });
  finish(slug, backPath, error, "현금영수증 상태를 확인했습니다.");
}

/** 운영사: 다시 발급(retry) · 취소 다시 요청(cancel_retry) · 금액 바뀐 주문 취소 후 다시 발급(reissue) */
export async function staffCashReceiptAction(slug: string, orderId: string, backPath: string, action: "retry" | "cancel_retry" | "reissue") {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_cash_receipt_staff", { p_order_id: orderId, p_action: action });
  finish(slug, backPath, error, action === "retry" ? "현금영수증 발급을 다시 요청했습니다." : "현금영수증 취소를 요청했습니다. 취소가 확인되면 바뀐 금액으로 다시 발급합니다.");
}

export type CashReceiptSettingState = { error: string | null; message: string | null };

/** 대표: 현금영수증 받기 켜기·끄기 */
export async function saveCashReceiptSettingAction(slug: string, _prev: CashReceiptSettingState, form: FormData): Promise<CashReceiptSettingState> {
  const supabase = await createClient();
  const { data: store } = await supabase.from("mall_builder_stores").select("id").eq("slug", slug).maybeSingle();
  if (!store) return { error: "몰을 찾을 수 없습니다.", message: null };
  const on = form.get("enabled") === "1";
  const { error } = await supabase.rpc("mall_builder_cash_receipt_settings_save", { p_store_id: store.id, p_enabled: on });
  if (error) return { error: error.message, message: null };
  revalidatePath(`/s/${slug}`, "layout");
  return { error: null, message: on ? "현금영수증 신청을 받습니다." : "현금영수증 신청을 받지 않습니다." };
}
