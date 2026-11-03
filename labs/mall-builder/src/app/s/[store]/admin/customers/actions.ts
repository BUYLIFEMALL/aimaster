"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
