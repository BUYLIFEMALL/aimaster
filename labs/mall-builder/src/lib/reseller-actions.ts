"use server";

// D33 리셀러 서버 동작 — 권한·검사는 DB 함수(0052)가 다시 한다. 결과는 돌아갈 화면의 ?error= / ?ok=&msg=
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { codeError, normalizeCode, parseRate, PAYOUT_MIN } from "@/lib/reseller";

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
  if (!(amount >= PAYOUT_MIN)) back({ error: `출금은 ${PAYOUT_MIN.toLocaleString("ko-KR")}원 이상부터 신청할 수 있습니다.` });
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
  back(error ? { error: error.message } : { ok: "출금을 신청했습니다. 운영자가 확인한 뒤 송금합니다." });
}

/** 운영자: 출금 처리(지급 완료·반려) */
export async function decidePayoutAction(slug: string, payoutId: string, action: "paid" | "rejected", form: FormData) {
  const back = `/s/${slug}/admin/resellers`;
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_reseller_decide_payout", { p_id: payoutId, p_action: action, p_reason: String(form.get("reason") ?? "") });
  revalidatePath(back);
  go(back, error?.message, action === "paid" ? "지급 완료로 표시했습니다." : "반려하고 잔액을 돌려줬습니다.");
}
