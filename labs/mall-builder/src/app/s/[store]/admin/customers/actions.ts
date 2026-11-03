"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseCreditLimit, validateLedgerEntry } from "@/lib/credit";

/** 외상 한도 정하기 — 승인 사업자만 0보다 크게(DB 함수가 검사) */
export async function setCreditLimitAction(slug: string, customerId: string, form: FormData) {
  const back = (q: string) => redirect(`/s/${slug}/admin/customers/${customerId}?${q}`);
  const parsed = parseCreditLimit(form.get("credit_limit"));
  if (!parsed.ok) back(`error=${encodeURIComponent(parsed.error)}`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_set_credit_limit", { p_customer_id: customerId, p_limit: (parsed as { value: number }).value });
  revalidatePath(`/s/${slug}`, "layout");
  back(error ? `error=${encodeURIComponent(error.message)}` : "ok=credit");
}

/** 외상 장부에 입금·조정 기록 */
export async function creditEntryAction(slug: string, customerId: string, form: FormData) {
  const back = (q: string) => redirect(`/s/${slug}/admin/customers/${customerId}?${q}`);
  const v = validateLedgerEntry(String(form.get("kind") ?? ""), form.get("amount"), form.get("note"));
  if (!v.ok) back(`error=${encodeURIComponent(v.error)}`);
  const ok = v as Extract<typeof v, { ok: true }>;
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_credit_entry", {
    p_customer_id: customerId,
    p_kind: ok.value.kind,
    p_amount: ok.value.amount,
    p_note: ok.value.note,
  });
  revalidatePath(`/s/${slug}`, "layout");
  back(error ? `error=${encodeURIComponent(error.message)}` : "ok=ledger");
}

// 사업자 심사 — 그 몰 운영자인지·승인 대기인지는 DB 함수 mall_builder_review_business가 검사한다
export async function reviewBusinessAction(slug: string, customerId: string, approve: boolean, form: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_review_business", {
    p_customer_id: customerId,
    p_approve: approve,
    p_reason: String(form.get("reason") ?? ""),
  });
  revalidatePath(`/s/${slug}`, "layout");
  const q = error ? `error=${encodeURIComponent(error.message)}` : `ok=${approve ? "approved" : "rejected"}`;
  redirect(`/s/${slug}/admin/customers/${customerId}?${q}`);
}
