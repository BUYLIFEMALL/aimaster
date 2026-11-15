"use server";

// M2-7 반품·환불 서버 동작 — 권한·상태·금액 검사는 DB 함수(0099)가 다시 한다. 끝나면 그 화면으로 돌아가 결과를 보여 준다
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseReturnFee } from "@/lib/returns";

const bankOf = (form: FormData) => ({
  bank_name: String(form.get("bank_name") ?? ""),
  bank_account: String(form.get("bank_account") ?? ""),
  bank_holder: String(form.get("bank_holder") ?? ""),
});

function finish(slug: string, path: string, error: { message: string } | null, msg: string): never {
  revalidatePath(`/s/${slug}`, "layout");
  const safe = path.startsWith(`/s/${slug}/`) ? path : `/s/${slug}`;
  redirect(error ? `${safe}?error=${encodeURIComponent(error.message)}` : `${safe}?ok=1&msg=${encodeURIComponent(msg)}`);
}

/** 유저: 반품 요청(사유·메모·무통장이면 환불 계좌) */
export async function requestReturnAction(slug: string, orderId: string, backPath: string, form: FormData) {
  const supabase = await createClient();
  const hasBank = form.has("bank_account");
  const { error } = await supabase.rpc("mall_builder_request_return", {
    p_order_id: orderId,
    p_reason: String(form.get("reason") ?? ""),
    p_memo: String(form.get("memo") ?? "").slice(0, 300),
    p_bank: hasBank ? bankOf(form) : null,
  });
  finish(slug, backPath, error, "반품을 요청했습니다. 운영사가 회수를 안내합니다.");
}

/** 유저: 환불 계좌 넣기·고치기(무통장 주문) */
export async function setRefundAccountAction(slug: string, orderId: string, backPath: string, form: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_set_refund_account", { p_order_id: orderId, p_bank: bankOf(form) });
  finish(slug, backPath, error, "환불 계좌를 저장했습니다.");
}

/** 운영사: 회수 중(회수 택배사·송장) / 회수 완료 */
export async function returnStepAction(slug: string, orderId: string, backPath: string, step: "collecting" | "collected", form: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_return_step", {
    p_order_id: orderId,
    p_step: step,
    p_courier: String(form.get("return_courier") ?? ""),
    p_tracking: String(form.get("return_tracking") ?? ""),
  });
  finish(slug, backPath, error, step === "collecting" ? "회수 중으로 바꿨습니다." : "회수 완료로 바꿨습니다.");
}

/** 운영사: 반품 승인(반품비 차감) */
export async function approveReturnAction(slug: string, orderId: string, backPath: string, form: FormData) {
  const fee = parseReturnFee(form.get("return_fee"));
  if (!fee.ok) finish(slug, backPath, { message: fee.error }, "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_approve_return", {
    p_order_id: orderId,
    p_fee: fee.ok ? fee.value : 0,
    p_note: String(form.get("note") ?? "").slice(0, 200),
  });
  finish(slug, backPath, error, "반품을 승인했습니다(재고 복구, 반품비를 뺀 금액 환불).");
}

/** 운영사(분양몰 주문이면 본사도): 무통장 환불 이체 뒤 「환불 완료」 */
export async function refundDoneAction(slug: string, orderId: string, backPath: string, form: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_refund_done", { p_order_id: orderId, p_note: String(form.get("note") ?? "").slice(0, 100) });
  finish(slug, backPath, error, "환불 완료로 기록했습니다(환불 계좌 정보는 지웠습니다).");
}

/** 대표: 몰 반품비 기본값(settings.return_fee) — 보안 규칙상 그 몰 대표만 몰 설정을 고친다 */
export type ReturnFeeState = { error: string | null; message: string | null };
export async function saveReturnFeeAction(slug: string, _prev: ReturnFeeState, form: FormData): Promise<ReturnFeeState> {
  const fee = parseReturnFee(form.get("return_fee"));
  if (!fee.ok) return { error: fee.error, message: null };
  const supabase = await createClient();
  const { data: store } = await supabase.from("mall_builder_stores").select("id, settings").eq("slug", slug).maybeSingle();
  if (!store) return { error: "몰을 찾을 수 없습니다.", message: null };
  const settings = { ...((store.settings as Record<string, unknown> | null) ?? {}), return_fee: fee.value };
  const { data, error } = await supabase.from("mall_builder_stores").update({ settings }).eq("id", store.id).select("id");
  if (error || !data?.length) return { error: error?.message ?? "저장하지 못했습니다(대표 운영사만 고칠 수 있습니다).", message: null };
  revalidatePath(`/s/${slug}`, "layout");
  return { error: null, message: `반품비 기본값을 ${fee.value.toLocaleString("ko-KR")}원으로 저장했습니다.` };
}
