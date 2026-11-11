"use server";

// D24 거래처 특가 — 손님 상세 화면의 저장·삭제. 쓰기는 직원 「손님」 권한만(DB 보안 규칙도 같은 조건)
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseBaseRate, parseEndsOn, parseSpecialPrice, todayKst } from "@/lib/customerPrices";

async function prepare(slug: string, customerId: string) {
  const back = (q: string): never => redirect(`/s/${slug}/admin/customers/${customerId}?${q}#customer-prices`);
  const supabase = await createClient();
  const { data: c } = await supabase.from("mall_builder_store_customers").select("id, store_id, mall_builder_stores!inner(slug)").eq("id", customerId).maybeSingle();
  const store = c as unknown as { store_id: string; mall_builder_stores: { slug: string } } | null;
  if (!store || store.mall_builder_stores.slug !== slug) back(`error=${encodeURIComponent("손님을 찾을 수 없습니다.")}`);
  const { data: can } = await supabase.rpc("mall_builder_staff_can", { p_store_id: store!.store_id, p_perm: "customers" });
  if (can !== true) back(`error=${encodeURIComponent("손님 권한이 있는 직원만 특가를 정할 수 있습니다.")}`);
  return { supabase, storeId: store!.store_id, back };
}
const done = (slug: string, back: (q: string) => never, msg: string) => {
  revalidatePath(`/s/${slug}`, "layout");
  back(`ok=special&msg=${encodeURIComponent(msg)}`);
};

/** 상품별 특가 넣기·고치기 — 품번(대소문자 무시)으로 상품을 찾는다 */
export async function saveCustomerPriceAction(slug: string, customerId: string, form: FormData) {
  const { supabase, storeId, back } = await prepare(slug, customerId);
  const code = String(form.get("product_code") ?? "").trim();
  if (!code) back(`error=${encodeURIComponent("품번을 골라 주세요.")}`);
  const value = parseSpecialPrice(form.get("value"));
  if (!value.ok) back(`error=${encodeURIComponent(value.error)}`);
  const ends = parseEndsOn(form.get("ends_on"), todayKst());
  if (!ends.ok) back(`error=${encodeURIComponent(ends.error)}`);
  const memo = String(form.get("memo") ?? "").trim().slice(0, 200);

  const { data: products } = await supabase.from("mall_builder_products").select("id, name").eq("store_id", storeId).ilike("product_code", code.replace(/[%_\\]/g, "\\$&")).limit(1);
  const product = products?.[0];
  if (!product) back(`error=${encodeURIComponent(`품번 「${code}」 상품이 없습니다.`)}`);
  const v = (value as { ok: true; value: { price: number | null; discount_rate: number | null } }).value;
  const row = { price: v.price, discount_rate: v.discount_rate, ends_on: (ends as { ok: true; value: string | null }).value, memo };

  const { data: existing } = await supabase.from("mall_builder_customer_prices").select("id").eq("customer_id", customerId).eq("product_id", product!.id).maybeSingle();
  const { error } = existing
    ? await supabase.from("mall_builder_customer_prices").update(row).eq("id", existing.id)
    : await supabase.from("mall_builder_customer_prices").insert({ ...row, store_id: storeId, customer_id: customerId, product_id: product!.id });
  if (error) back(`error=${encodeURIComponent(error.message)}`);
  done(slug, back, `「${product!.name}」 특가를 저장했습니다.`);
}

/** 거래처 기본 할인율(전체 상품) — 비우면 지움 */
export async function saveBaseRateAction(slug: string, customerId: string, form: FormData) {
  const { supabase, storeId, back } = await prepare(slug, customerId);
  const rate = parseBaseRate(form.get("rate"));
  if (!rate.ok) back(`error=${encodeURIComponent(rate.error)}`);
  const ends = parseEndsOn(form.get("ends_on"), todayKst());
  if (!ends.ok) back(`error=${encodeURIComponent(ends.error)}`);
  const r = (rate as { ok: true; value: number | null }).value;

  const { data: existing } = await supabase.from("mall_builder_customer_prices").select("id").eq("customer_id", customerId).is("product_id", null).maybeSingle();
  if (r == null) {
    if (existing) {
      const { error } = await supabase.from("mall_builder_customer_prices").delete().eq("id", existing.id);
      if (error) back(`error=${encodeURIComponent(error.message)}`);
    }
    done(slug, back, "기본 할인율을 지웠습니다.");
  }
  const row = { discount_rate: r, price: null, ends_on: (ends as { ok: true; value: string | null }).value };
  const { error } = existing
    ? await supabase.from("mall_builder_customer_prices").update(row).eq("id", existing.id)
    : await supabase.from("mall_builder_customer_prices").insert({ ...row, store_id: storeId, customer_id: customerId, product_id: null });
  if (error) back(`error=${encodeURIComponent(error.message)}`);
  done(slug, back, `기본 할인율 ${r}%를 저장했습니다.`);
}

/** 상품별 특가 지우기 */
export async function deleteCustomerPriceAction(slug: string, customerId: string, priceId: string) {
  const { supabase, back } = await prepare(slug, customerId);
  const { error } = await supabase.from("mall_builder_customer_prices").delete().eq("id", priceId).eq("customer_id", customerId);
  if (error) back(`error=${encodeURIComponent(error.message)}`);
  done(slug, back, "특가를 지웠습니다.");
}
