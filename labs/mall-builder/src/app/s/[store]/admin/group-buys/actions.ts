"use server";

// 공동구매(D21) 운영자 동작 — 만들기(표 규칙: 그 몰 운영자만), 지금 마감·실패 일괄 취소(DB 함수 0041)
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateGroupBuy } from "@/lib/groupBuy";

function go(slug: string, error?: string | null, ok?: string): never {
  const base = `/s/${slug}/admin/group-buys`;
  redirect(error ? `${base}?error=${encodeURIComponent(error)}` : `${base}?ok=1&msg=${encodeURIComponent(ok ?? "처리했습니다.")}`);
}

const kstIso = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s ? new Date(`${s}:00+09:00`).toISOString() : "";
};

export async function createGroupBuyAction(slug: string, form: FormData) {
  const num = (k: string) => {
    const s = String(form.get(k) ?? "").replace(/,/g, "").trim();
    return s === "" ? null : Number(s);
  };
  const f = {
    title: String(form.get("title") ?? "").trim(),
    group_price: num("group_price") ?? -1,
    target_qty: num("target_qty") ?? 0,
    max_per_customer: num("max_per_customer"),
    starts_at: kstIso(form.get("starts_at")) || new Date().toISOString(),
    ends_at: kstIso(form.get("ends_at")),
  };
  const err = validateGroupBuy(f);
  if (err) go(slug, err);
  const productId = String(form.get("product_id") ?? "");
  if (!productId) go(slug, "상품을 골라 주세요.");
  const supabase = await createClient();
  const { data: store } = await supabase.from("mall_builder_stores").select("id").eq("slug", slug).maybeSingle();
  if (!store) go(slug, "몰을 찾을 수 없습니다.");
  const { error } = await supabase.from("mall_builder_group_buys").insert({ ...f, store_id: store!.id, product_id: productId });
  revalidatePath(`/s/${slug}`, "layout");
  if (error) go(slug, error.message.includes("one_active") ? "이 상품은 이미 진행 중인 공동구매가 있습니다." : error.message);
  go(slug, null, `공동구매 「${f.title}」을(를) 시작했습니다.`);
}

export async function closeGroupBuyAction(slug: string, groupId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mall_builder_group_buy_close", { p_group_id: groupId });
  revalidatePath(`/s/${slug}`, "layout");
  if (error) go(slug, error.message);
  go(slug, null, data === "succeeded" ? "마감했습니다. 목표를 달성했습니다." : "마감했습니다. 목표를 채우지 못했습니다 — 「미달 주문 일괄 취소·환불」을 눌러 주세요.");
}

export async function cancelAllGroupBuyAction(slug: string, groupId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mall_builder_group_buy_cancel_all", { p_group_id: groupId });
  revalidatePath(`/s/${slug}`, "layout");
  if (error) go(slug, error.message);
  const r = data as { cancelled: number; bank_refunds: { order_no: string; amount: number }[]; errors: { order_no: string; error: string }[] };
  const refunds = r.bank_refunds.length ? ` 무통장 환불할 주문 ${r.bank_refunds.length}건: ${r.bank_refunds.map((x) => `${x.order_no}(${x.amount.toLocaleString("ko-KR")}원)`).join(", ")}.` : "";
  if (r.errors.length) go(slug, `${r.cancelled}건 취소, ${r.errors.length}건 실패: ${r.errors.map((x) => `${x.order_no} — ${x.error}`).join(" / ")}.${refunds}`);
  go(slug, null, `미달 주문 ${r.cancelled}건을 취소했습니다(카드는 환불 완료).${refunds}`);
}
