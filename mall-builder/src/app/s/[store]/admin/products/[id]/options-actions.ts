"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { buildVariants, splitValues, validateGroups, validateVariant, type OptionGroup, type Variant } from "@/lib/options";

export type OptionsState = { saved: boolean; error: string | null };

type Submitted = { groups: { name: string; values: string }[]; variants: Pick<Variant, "key" | "extra_price" | "stock" | "sku" | "is_active">[] };

export async function saveOptionsAction(slug: string, productId: string, _prev: OptionsState, form: FormData): Promise<OptionsState> {
  let submitted: Submitted;
  try {
    submitted = JSON.parse(String(form.get("options") ?? "{}"));
  } catch {
    return { saved: false, error: "옵션 정보를 읽지 못했습니다." };
  }

  const supabase = await createClient();
  const { data: product } = await supabase
    .from("mall_builder_products")
    .select("id, store_id, base_price")
    .eq("id", productId)
    .maybeSingle();
  if (!product) return { saved: false, error: "상품을 찾을 수 없습니다." };
  const { data: staff } = await supabase.rpc("mall_builder_is_store_staff", { p_store_id: product.store_id });
  if (staff !== true) return { saved: false, error: "이 몰을 고칠 권한이 없습니다." };

  // 옵션 묶음 정리·검사 → 조합은 서버에서 다시 만든다(화면이 보낸 조합 목록을 그대로 믿지 않음)
  const groups: OptionGroup[] = (submitted.groups ?? [])
    .map((g) => ({ name: String(g.name ?? "").trim(), values: splitValues(String(g.values ?? "")) }))
    .filter((g) => g.name || g.values.length);
  const groupError = validateGroups(groups);
  if (groupError) return { saved: false, error: groupError };

  const sent = (submitted.variants ?? []).map((v) => ({
    key: String(v.key),
    values: [],
    extra_price: Math.trunc(Number(v.extra_price) || 0),
    stock: Math.trunc(Number(v.stock) || 0),
    sku: String(v.sku ?? "").trim(),
    is_active: v.is_active !== false,
  }));
  const variants = buildVariants(groups, sent);
  for (const v of variants) {
    const err = validateVariant(v, Number(product.base_price));
    if (err) return { saved: false, error: `「${v.key}」: ${err}` };
  }

  // 없어진 조합 지우기(기존 조합을 읽어 id로 지정) → 남은 조합 넣기/고치기
  const keys = new Set(variants.map((v) => v.key));
  const { data: existing } = await supabase.from("mall_builder_product_variants").select("id, key").eq("product_id", productId);
  const removeIds = (existing ?? []).filter((e) => !keys.has(e.key as string)).map((e) => e.id as string);
  if (removeIds.length) {
    const { error: delError } = await supabase.from("mall_builder_product_variants").delete().in("id", removeIds);
    if (delError) return { saved: false, error: delError.message };
  }
  if (variants.length) {
    const { error } = await supabase.from("mall_builder_product_variants").upsert(
      variants.map((v, i) => ({
        product_id: productId,
        store_id: product.store_id,
        key: v.key,
        values: v.values,
        extra_price: v.extra_price,
        stock: v.stock,
        sku: v.sku,
        is_active: v.is_active,
        sort: i,
      })),
      { onConflict: "product_id,key" },
    );
    if (error) return { saved: false, error: error.message };
  }
  const { error: pError } = await supabase.from("mall_builder_products").update({ option_groups: groups }).eq("id", productId);
  if (pError) return { saved: false, error: pError.message };

  revalidatePath(`/s/${slug}`, "layout");
  return { saved: true, error: null };
}
