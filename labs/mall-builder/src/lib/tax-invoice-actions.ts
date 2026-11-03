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
