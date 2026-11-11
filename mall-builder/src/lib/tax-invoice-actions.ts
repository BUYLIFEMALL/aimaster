"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateInvoiceEmail } from "@/lib/taxInvoice";

// 세금계산서 — 요청(손님)·발행 완료 표시(운영자). 권한·상태 검사는 DB 함수가 한다

export async function requestTaxInvoiceAction(slug: string, orderId: string, form: FormData) {
  const back = (q: string) => redirect(`/s/${slug}/orders/${orderId}?${q}`);
  const v = validateInvoiceEmail(form.get("invoice_email"));
  if (!v.ok) back(`error=${encodeURIComponent(v.error)}`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_request_tax_invoice", { p_order_id: orderId, p_email: (v as { value: string }).value });
  revalidatePath(`/s/${slug}`, "layout");
  back(error ? `error=${encodeURIComponent(error.message)}` : "ok=1");
}

export async function markTaxInvoiceIssuedAction(slug: string, orderId: string, form: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_mark_tax_invoice_issued", { p_order_id: orderId, p_note: String(form.get("note") ?? "") });
  revalidatePath(`/s/${slug}`, "layout");
  redirect(`/s/${slug}/admin/orders/${orderId}?${error ? `error=${encodeURIComponent(error.message)}` : "ok=1"}`);
}

/** 운영자: 볼타 발행·상태 다시 확인·수정 발행(D19) — 결과는 주문 상세에 문구로 */
async function bolta(slug: string, orderId: string, fn: string, done: (inv: { status?: string }) => string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(fn, { p_order_id: orderId });
  revalidatePath(`/s/${slug}`, "layout");
  const base = `/s/${slug}/admin/orders/${orderId}`;
  if (error) redirect(`${base}?error=${encodeURIComponent(error.message)}`);
  const inv = (data ?? {}) as { status?: string; error?: string; check_error?: string };
  if (inv.check_error) redirect(`${base}?error=${encodeURIComponent(inv.check_error)}`);
  if (inv.status === "failed") redirect(`${base}?error=${encodeURIComponent(`세금계산서 발행 실패: ${inv.error || "볼타가 거절했습니다."}`)}`);
  redirect(`${base}?ok=1&msg=${encodeURIComponent(done(inv))}`);
}

export async function issueTaxInvoiceAction(slug: string, orderId: string) {
  await bolta(slug, orderId, "mall_builder_tax_invoice_issue", (inv) =>
    inv.status === "unknown"
      ? "볼타 응답을 받지 못했습니다. 잠시 뒤 「상태 다시 확인」을 눌러 주세요(다시 발행하지 마세요)."
      : "볼타가 발행 요청을 받았습니다. 잠시 뒤 「상태 다시 확인」으로 국세청 승인번호를 확인하세요.");
}

export async function recheckTaxInvoiceAction(slug: string, orderId: string) {
  await bolta(slug, orderId, "mall_builder_tax_invoice_recheck", (inv) =>
    inv.status === "issued" ? "세금계산서 발행이 완료됐습니다." : "아직 처리 중입니다. 조금 뒤 다시 확인해 주세요.");
}

export async function amendTaxInvoiceAction(slug: string, orderId: string) {
  await bolta(slug, orderId, "mall_builder_tax_invoice_amend", () => "수정 세금계산서 발행을 요청했습니다.");
}
