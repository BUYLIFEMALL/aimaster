"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseGradePrice, validateProduct, type ProductErrors } from "@/lib/products";

export type ProductFormState = {
  saved: boolean;
  error: string | null;
  errors: ProductErrors;
  gradeError?: string;
  /** 제출한 값 — 오류 때 폼이 처음 값으로 되돌아가지 않게 다시 채운다 */
  values?: Record<string, unknown>;
};

export async function saveProductAction(
  slug: string,
  productId: string | null,
  _prev: ProductFormState,
  form: FormData,
): Promise<ProductFormState> {
  const raw: Record<string, unknown> = Object.fromEntries([...form.entries()].filter(([k]) => k !== "category_ids"));
  raw.category_ids = form.getAll("category_ids").map(String);

  const supabase = await createClient();
  const { data: store } = await supabase.from("mall_builder_stores").select("id").eq("slug", slug).maybeSingle();
  if (!store) return { saved: false, error: "몰을 찾을 수 없습니다.", errors: {}, values: raw };
  const { data: staff } = await supabase.rpc("mall_builder_is_store_staff", { p_store_id: store.id });
  if (staff !== true) return { saved: false, error: "이 몰을 고칠 권한이 없습니다.", errors: {}, values: raw };

  const checked = validateProduct(raw, store.id);
  if (!checked.ok) return { saved: false, error: "입력값을 확인해 주세요.", errors: checked.errors, values: raw };

  // 등급가 칸: grade_price_<등급 id>
  const gradePrices: { grade_id: string; value: { price: number | null; discount_rate: number | null } | null }[] = [];
  for (const [key, val] of Object.entries(raw)) {
    const m = key.match(/^grade_price_([0-9a-f-]{36})$/);
    if (!m) continue;
    const parsed = parseGradePrice(val);
    if (!parsed.ok) return { saved: false, error: "입력값을 확인해 주세요.", errors: {}, gradeError: parsed.error, values: raw };
    gradePrices.push({ grade_id: m[1], value: parsed.value });
  }
  const { cost, category_ids, ...product } = checked.value;

  let id = productId;
  if (id) {
    const { data, error } = await supabase.from("mall_builder_products").update(product).eq("id", id).eq("store_id", store.id).select("id");
    if (error) return { saved: false, error: error.message, errors: {}, values: raw };
    if (!data?.length) return { saved: false, error: "상품을 찾을 수 없거나 고칠 권한이 없습니다.", errors: {}, values: raw };
  } else {
    const { data, error } = await supabase.from("mall_builder_products").insert({ ...product, store_id: store.id }).select("id").single();
    if (error) return { saved: false, error: error.message, errors: {}, values: raw };
    id = data.id as string;
  }

  // 원가(운영자 전용 표)
  const { error: privError } = await supabase
    .from("mall_builder_product_private")
    .upsert({ product_id: id, store_id: store.id, cost }, { onConflict: "product_id" });
  if (privError) return { saved: false, error: privError.message, errors: {}, values: raw };

  // 카테고리 연결: 지우고 다시 넣기
  await supabase.from("mall_builder_product_categories").delete().eq("product_id", id).eq("store_id", store.id);
  if (category_ids.length) {
    const { error: catError } = await supabase
      .from("mall_builder_product_categories")
      .insert(category_ids.map((category_id) => ({ product_id: id, category_id, store_id: store.id })));
    if (catError) return { saved: false, error: catError.message, errors: {}, values: raw };
  }

  // 등급가: 값이 있으면 넣거나 바꾸고, 비우면 지운다(같은 몰 등급만 — DB 트리거가 확인)
  const keep = gradePrices.filter((g) => g.value);
  if (keep.length) {
    const { error: gpError } = await supabase.from("mall_builder_product_grade_prices").upsert(
      keep.map((g) => ({ store_id: store.id, product_id: id, grade_id: g.grade_id, price: g.value!.price, discount_rate: g.value!.discount_rate })),
      { onConflict: "product_id,grade_id" },
    );
    if (gpError) return { saved: false, error: gpError.message, errors: {}, values: raw };
  }
  const clear = gradePrices.filter((g) => !g.value).map((g) => g.grade_id);
  if (clear.length) await supabase.from("mall_builder_product_grade_prices").delete().eq("product_id", id).in("grade_id", clear);

  revalidatePath(`/s/${slug}`, "layout");
  if (!productId) redirect(`/s/${slug}/admin/products/${id}?saved=1`);
  return { saved: true, error: null, errors: {} };
}
