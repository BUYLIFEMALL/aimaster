"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { priceLine } from "@/lib/pricing";
import { getPriceContext, type ProductRow } from "@/lib/store";
import type { Variant } from "@/lib/options";
import { addLine, guestOrderEnabled, removeLine, setLineQty } from "@/lib/guest";
import { loadGuestCart, readGuestCart, writeGuestCart } from "@/lib/guest-store";

// 보안 규칙(본인 줄만·가입한 몰에만·같은 몰 상품만)을 그대로 거친다. 담을 때도 가격 엔진으로 다시 검사한다

export type AddResult = { ok: true; count: number } | { ok: false; error: string; goto?: string };

async function context(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const { data: store } = await supabase.from("mall_builder_stores").select("id, settings").eq("slug", slug).maybeSingle();
  return { supabase, user: data.user, storeId: (store?.id as string | undefined) ?? null, guestOk: guestOrderEnabled(store?.settings) };
}

async function loadProduct(supabase: Awaited<ReturnType<typeof createClient>>, storeId: string, productId: string, variantId: string | null) {
  // 손님 화면과 같은 DB 함수로 읽는다 — 가격 비공개 상품도 와서 가격 엔진이 「승인 후 가격 공개」 같은 정확한 안내를 낸다
  const { data: rows } = await supabase.rpc("mall_builder_shop_products", { p_store_id: storeId, p_ids: [productId], p_limit: 1 });
  const product = (rows as ProductRow[] | null)?.[0];
  if (!product) return null;
  let variant: (Variant & { id: string }) | null = null;
  if (variantId) {
    const { data } = await supabase
      .from("mall_builder_product_variants")
      .select("id, key, values, extra_price, stock, sku, is_active")
      .eq("product_id", productId)
      .eq("id", variantId)
      .maybeSingle();
    if (!data) return null;
    variant = data as Variant & { id: string };
  }
  return { product: product as ProductRow, variant };
}

/** 상품 상세에서 담기 — 같은 상품·옵션이 있으면 수량을 더한다 */
export async function addToCartAction(slug: string, productId: string, variantId: string | null, qty: number): Promise<AddResult> {
  const { supabase, user, storeId, guestOk } = await context(slug);
  const here = `/s/${slug}/p/${productId}`;
  if (!storeId) return { ok: false, error: "몰을 찾을 수 없습니다." };
  // 비회원 주문을 켠 몰(D15): 로그인 없이 쿠키 장바구니에 담는다(보는 사람 = 비회원으로 가격 검사)
  if (!user && guestOk) return addToGuestCart(supabase, slug, storeId, productId, variantId, qty);
  if (!user) return { ok: false, error: "로그인 후 담을 수 있습니다.", goto: `/login?next=${encodeURIComponent(here)}` };
  const { data: customer } = await supabase.from("mall_builder_store_customers").select("id").eq("store_id", storeId).eq("user_id", user.id).maybeSingle();
  if (!customer) return { ok: false, error: "이 몰에 가입한 뒤 담을 수 있습니다.", goto: `/s/${slug}/join?next=${encodeURIComponent(here)}` };

  const loaded = await loadProduct(supabase, storeId, productId, variantId);
  if (!loaded) return { ok: false, error: "상품을 찾을 수 없습니다." };
  let existing = supabase.from("mall_builder_cart_items").select("id, qty").eq("store_id", storeId).eq("user_id", user.id).eq("product_id", productId);
  existing = variantId ? existing.eq("variant_id", variantId) : existing.is("variant_id", null);
  const { data: line } = await existing.maybeSingle();
  const total = (line?.qty ?? 0) + qty;
  const check = priceLine(loaded.product, loaded.variant, total, await getPriceContext(storeId, productId));
  if (!check.orderable) return { ok: false, error: line ? `${check.errors[0]} (장바구니에 이미 ${line.qty}개)` : check.errors[0] };

  const { error } = line
    ? await supabase.from("mall_builder_cart_items").update({ qty: total }).eq("id", line.id)
    : await supabase.from("mall_builder_cart_items").insert({ store_id: storeId, user_id: user.id, product_id: productId, variant_id: variantId, qty });
  if (error) return { ok: false, error: "담지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  revalidatePath(`/s/${slug}`, "layout");
  const { count } = await supabase.from("mall_builder_cart_items").select("id", { count: "exact", head: true }).eq("store_id", storeId).eq("user_id", user.id);
  return { ok: true, count: count ?? 0 };
}

function back(slug: string, error?: string): never {
  revalidatePath(`/s/${slug}`, "layout");
  redirect(`/s/${slug}/cart${error ? `?error=${encodeURIComponent(error)}` : ""}`);
}

export async function updateQtyAction(slug: string, itemId: string, form: FormData) {
  const qty = Number(form.get("qty"));
  const { supabase, user, storeId } = await context(slug);
  if (!user || !storeId) back(slug, "로그인이 필요합니다.");
  const { data: item } = await supabase.from("mall_builder_cart_items").select("product_id, variant_id").eq("id", itemId).eq("user_id", user!.id).maybeSingle();
  if (!item) back(slug, "장바구니에 없는 상품입니다.");
  const loaded = await loadProduct(supabase, storeId!, item!.product_id, item!.variant_id);
  if (!loaded) back(slug, "지금 판매하지 않는 상품입니다.");
  const check = priceLine(loaded!.product, loaded!.variant, qty, await getPriceContext(storeId!, item!.product_id));
  if (!check.orderable) back(slug, check.errors[0]);
  const { error } = await supabase.from("mall_builder_cart_items").update({ qty }).eq("id", itemId).eq("user_id", user!.id);
  back(slug, error?.message);
}

async function addToGuestCart(
  supabase: Awaited<ReturnType<typeof createClient>>, slug: string, storeId: string, productId: string, variantId: string | null, qty: number,
): Promise<AddResult> {
  const loaded = await loadProduct(supabase, storeId, productId, variantId);
  if (!loaded) return { ok: false, error: "상품을 찾을 수 없습니다." };
  const lines = await readGuestCart(slug);
  const added = addLine(lines, productId, variantId, qty);
  if (!added.ok) return { ok: false, error: added.error };
  const check = priceLine(loaded.product, loaded.variant, added.qty, await getPriceContext(storeId, productId));
  if (!check.orderable) return { ok: false, error: added.qty > qty ? `${check.errors[0]} (장바구니에 이미 ${added.qty - qty}개)` : check.errors[0] };
  await writeGuestCart(slug, added.lines);
  revalidatePath(`/s/${slug}`, "layout");
  return { ok: true, count: added.lines.length };
}

/** 비회원 장바구니 수량 바꾸기 — 같은 가격 엔진으로 검사 */
export async function updateGuestQtyAction(slug: string, index: number, form: FormData) {
  const qty = Number(form.get("qty"));
  const { storeId } = await context(slug);
  if (!storeId) back(slug, "몰을 찾을 수 없습니다.");
  const rows = await loadGuestCart(storeId!, slug);
  const row = rows.find((r) => r.index === index);
  if (!row) back(slug, "장바구니에 없는 상품입니다.");
  const check = priceLine(row!.product, row!.variant, qty, await getPriceContext(storeId!, row!.product.id));
  if (!check.orderable) back(slug, check.errors[0]);
  await writeGuestCart(slug, setLineQty(await readGuestCart(slug), index, qty));
  back(slug);
}

export async function removeGuestLineAction(slug: string, index: number) {
  await writeGuestCart(slug, removeLine(await readGuestCart(slug), index));
  back(slug);
}

export async function removeItemAction(slug: string, itemId: string) {
  const { supabase, user } = await context(slug);
  if (!user) back(slug, "로그인이 필요합니다.");
  const { error } = await supabase.from("mall_builder_cart_items").delete().eq("id", itemId).eq("user_id", user!.id);
  back(slug, error?.message);
}
