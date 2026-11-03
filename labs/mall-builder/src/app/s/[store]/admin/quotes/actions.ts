"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateAnswer } from "@/lib/quotes";

// 견적 회신 — 권한·상태 검사는 DB 함수 mall_builder_answer_quote가 한 번 더 한다
export async function answerQuoteAction(slug: string, quoteId: string, form: FormData) {
  const back = (q: string) => redirect(`/s/${slug}/admin/quotes/${quoteId}?${q}`);
  const itemIds = form.getAll("item_id").map(String);
  const v = validateAnswer(
    itemIds.map((id) => ({ id, price: form.get(`price_${id}`) })),
    String(form.get("valid_until") ?? ""),
  );
  if (!v.ok) back(`error=${encodeURIComponent(v.error)}`);
  const ok = v as Extract<typeof v, { ok: true }>;
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_answer_quote", {
    p_quote_id: quoteId,
    p_items: ok.value.items.map((i) => ({ id: i.id, price: String(i.price) })),
    p_valid_until: ok.value.valid_until,
    p_note: String(form.get("note") ?? ""),
  });
  revalidatePath(`/s/${slug}`, "layout");
  back(error ? `error=${encodeURIComponent(error.message)}` : "ok=1");
}
