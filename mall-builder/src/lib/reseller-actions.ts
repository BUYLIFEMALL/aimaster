"use server";

// D33 리셀러 서버 동작 — 권한·검사는 DB 함수(0052)가 다시 한다. 결과는 돌아갈 화면의 ?error= / ?ok=&msg=
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { codeError, normalizeCode, parseRate } from "@/lib/reseller";
import { parseApproveRate } from "@/lib/reseller-apply";

function go(path: string, error?: string | null, ok?: string): never {
  const [p, hash] = path.split("#");
  const q = error ? `error=${encodeURIComponent(error)}` : `ok=1&msg=${encodeURIComponent(ok ?? "처리했습니다.")}`;
  redirect(`${p}${p.includes("?") ? "&" : "?"}${q}${hash ? `#${hash}` : ""}`);
}

async function storeIdOf(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_stores").select("id").eq("slug", slug).maybeSingle();
  return { supabase, id: (data?.id as string | undefined) ?? null };
}

/** 운영자: 손님을 리셀러로 지정·수정 */
export async function setResellerAction(slug: string, customerId: string, form: FormData) {
  const back = `/s/${slug}/admin/customers/${customerId}#reseller`;
  const code = normalizeCode(form.get("code"));
  const ce = codeError(code);
  if (ce) go(back, ce);
  const rate = parseRate(form.get("rate"));
  if (!rate.ok) go(back, rate.error);
  const { supabase, id } = await storeIdOf(slug);
  if (!id) go(back, "몰을 찾을 수 없습니다.");
  const { error } = await supabase.rpc("mall_builder_reseller_set", { p_store_id: id, p_customer_id: customerId, p_code: code, p_rate: rate.value, p_active: form.get("active") === "on" });
  revalidatePath(`/s/${slug}/admin`, "layout");
  go(back, error?.message, "리셀러 정보를 저장했습니다.");
}

/** 운영자: 손님의 연결 리셀러 바꾸기(빈 값이면 빼기) */
export async function setCustomerResellerAction(slug: string, customerId: string, form: FormData) {
  const back = `/s/${slug}/admin/customers/${customerId}#reseller`;
  const supabase = await createClient();
  const rid = String(form.get("reseller_id") ?? "") || null;
  const { error } = await supabase.rpc("mall_builder_customer_set_reseller", { p_customer_id: customerId, p_reseller_id: rid });
  revalidatePath(`/s/${slug}/admin/customers/${customerId}`);
  go(back, error?.message, rid ? "연결 리셀러를 바꿨습니다." : "연결 리셀러를 뺐습니다.");
}

/** 리셀러 본인: 출금 신청 */
export async function requestPayoutAction(slug: string, form: FormData) {
  // 마이페이지는 ?ok=<안내 문구> 형식(기존 마이페이지 동작과 같게)
  const back = (q: { error?: string; ok?: string }): never =>
    redirect(`/s/${slug}/my?${q.error ? `error=${encodeURIComponent(q.error)}` : `ok=${encodeURIComponent(q.ok ?? "")}`}#reseller`);
  const amount = Math.floor(Number(String(form.get("amount") ?? "").replace(/[^0-9]/g, "")));
  if (!(amount > 0)) back({ error: "출금 금액을 적어 주세요." }); // 몰 최소 금액은 DB(0075)가 검사
  const { supabase, id } = await storeIdOf(slug);
  if (!id) back({ error: "몰을 찾을 수 없습니다." });
  const { error } = await supabase.rpc("mall_builder_reseller_request_payout", {
    p_store_id: id,
    p_amount: amount,
    p_bank_name: String(form.get("bank_name") ?? ""),
    p_bank_account: String(form.get("bank_account") ?? ""),
    p_bank_holder: String(form.get("bank_holder") ?? ""),
  });
  revalidatePath(`/s/${slug}/my`);
  back(error ? { error: error.message } : { ok: "출금을 신청했습니다. 운영자가 확인한 뒤 송금합니다(개인은 3.3% 원천징수 뒤 이체)." });
}

/** 운영자: 출금 처리 — 지급 완료(공제금액·비고, M1-7 0075)·반려 */
export async function decidePayoutAction(slug: string, payoutId: string, action: "paid" | "rejected", form: FormData) {
  const back = `/s/${slug}/admin/resellers`;
  const supabase = await createClient();
  const deduction = Math.floor(Number(String(form.get("deduction") ?? "0").replace(/[^0-9]/g, "") || "0"));
  const { error } =
    action === "paid"
      ? await supabase.rpc("mall_builder_reseller_payout_pay", { p_id: payoutId, p_deduction: deduction, p_memo: String(form.get("reason") ?? "") })
      : await supabase.rpc("mall_builder_reseller_decide_payout", { p_id: payoutId, p_action: action, p_reason: String(form.get("reason") ?? "") });
  revalidatePath(back);
  go(back, error?.message, action === "paid" ? "지급 완료로 표시했습니다." : "반려하고 잔액을 돌려줬습니다.");
}

// ── M1-4(0071) 리셀러 신청·승인 ──
/** 신청자: 서류를 비공개 저장소에 올린 뒤 신청 기록(검사는 DB 함수가 다시) */
export async function applyResellerAction(storeId: string, input: Record<string, string | null>): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_reseller_apply", { p_store_id: storeId, p: input });
  return { error: error?.message ?? null };
}

/** 신청자: 대기 중 신청 취소 */
export async function cancelResellerApplyAction(slug: string, id: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_reseller_apply_cancel", { p_id: id });
  revalidatePath(`/s/${slug}/reseller/apply`);
  go(`/s/${slug}/reseller/apply`, error?.message, "신청을 취소했습니다.");
}

/** 몰 대표: 리셀러 신청 받기 켜기/끄기 */
export async function setResellerApplyOpenAction(slug: string, storeId: string, open: boolean) {
  const base = `/s/${slug}/admin/resellers`;
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_reseller_apply_open", { p_store_id: storeId, p_open: open });
  revalidatePath(base);
  go(base, error?.message, open ? "리셀러 신청을 받습니다. 신청 주소를 회원에게 알려 주세요." : "리셀러 신청을 그만 받습니다.");
}

/** 몰 대표: 승인(추가 수수료율 선택, 비우면 0%)·반려(사유 필수) */
export async function decideResellerApplyAction(slug: string, id: string, action: "approve" | "reject", form: FormData) {
  const base = `/s/${slug}/admin/resellers`;
  const rate = parseApproveRate(form.get("rate"));
  if (!rate.ok) go(base, rate.error);
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_reseller_apply_decide", { p_id: id, p_action: action, p_note: String(form.get("note") ?? ""), p_rate: rate.value });
  revalidatePath(base);
  go(base, error?.message, action === "approve" ? "리셀러로 승인했습니다. 리셀러 코드가 만들어졌습니다." : "신청을 반려했습니다.");
}

/** 몰 대표: 리셀러 최소 출금 금액(M1-7 0075) */
export async function setPayoutMinAction(slug: string, storeId: string, form: FormData) {
  const base = `/s/${slug}/admin/resellers`;
  const amount = Math.floor(Number(String(form.get("payout_min") ?? "").replace(/[^0-9]/g, "")));
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_reseller_payout_min_set", { p_store_id: storeId, p_amount: amount });
  revalidatePath(base);
  go(base, error?.message, `최소 출금 금액을 ${amount.toLocaleString("ko-KR")}원으로 바꿨습니다.`);
}
