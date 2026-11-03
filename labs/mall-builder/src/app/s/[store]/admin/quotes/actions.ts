"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateAnswer, validateSendItems } from "@/lib/quotes";
import { getQuotableProducts } from "@/lib/store";

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

/** 운영자가 먼저 견적 보내기(D4) — 품목 정리는 validateSendItems, 권한·손님·상품·옵션 검사는 DB 함수 mall_builder_send_quote가 한 번 더.
 * 오류는 이동하지 않고 돌려준다(작성 화면의 품목 줄이 지워지지 않게 — useActionState) */
export async function sendQuoteAction(slug: string, customerId: string, _prev: { error: string }, form: FormData): Promise<{ error: string }> {
  let rows: unknown;
  try {
    rows = JSON.parse(String(form.get("items") ?? "[]"));
  } catch {
    return { error: "품목을 읽지 못했습니다. 다시 입력해 주세요." };
  }
  const supabase = await createClient();
  const { data: store } = await supabase.from("mall_builder_stores").select("id").eq("slug", slug).maybeSingle();
  if (!store) return { error: "몰을 찾을 수 없습니다." };
  const products = await getQuotableProducts(store.id as string);
  const options = new Map(products.map((p) => [p.id, p.variants.length > 0]));
  const v = validateSendItems(Array.isArray(rows) ? rows : [], (id) => options.get(id) ?? false);
  if (!v.ok) return { error: v.error };
  const items = v.value.map((i) => ({ ...i, qty: String(i.qty), price: String(i.price) }));
  const { data: quoteId, error } = await supabase.rpc("mall_builder_send_quote", {
    p_store_id: store.id,
    p_customer_id: customerId,
    p_items: items,
    p_valid_until: String(form.get("valid_until") ?? ""),
    p_note: String(form.get("note") ?? ""),
  });
  if (error) return { error: error.message };
  revalidatePath(`/s/${slug}`, "layout");
  redirect(`/s/${slug}/admin/quotes/${quoteId}?ok=sent`);
}
