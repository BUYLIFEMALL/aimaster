"use server";

// M2-9(2026-11-15) 상품 선택 일괄 변경 — 판매 상태 바꾸기·카테고리 넣기/빼기. 「상품」 권한을 확인하고
// 한 상품씩 보안 규칙(RLS)·DB 트리거를 거쳐 바꾼다(분양몰 거울 상품 등 DB가 막는 상품은 실패로 센다). DB 변경 없음.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PRODUCT_STATUSES, cleanProductIds, isUuid, type ProductStatusKey } from "@/lib/product-list";

export async function productBulkAction(slug: string, backQuery: string, form: FormData) {
  const base = `/s/${slug}/admin/products`;
  const back = (q: string): never => redirect(`${base}?${[backQuery.replace(/^\?/, ""), q].filter(Boolean).join("&")}`);
  const err = (m: string) => back(`bulk_error=${encodeURIComponent(m)}`);
  const op = String(form.get("op") ?? "");
  const ids = cleanProductIds(form.getAll("ids"));
  if (!ids.length) err("상품을 1개 이상 골라 주세요.");

  const supabase = await createClient();
  const { data: store } = await supabase.from("mall_builder_stores").select("id").eq("slug", slug).maybeSingle();
  if (!store) err("몰을 찾을 수 없습니다.");
  const storeId = store!.id as string;
  const { data: can } = await supabase.rpc("mall_builder_staff_can", { p_store_id: storeId, p_perm: "products" });
  if (can !== true) err("상품 권한이 없습니다.");

  // 이 몰 상품만 남긴다(다른 몰 id를 섞어 보내도 무시)
  const { data: mine } = await supabase.from("mall_builder_products").select("id").eq("store_id", storeId).in("id", ids);
  const targets = (mine ?? []).map((r) => r.id as string);
  let ok = 0;
  const fails: string[] = [];

  if (op.startsWith("status:")) {
    const to = op.slice(7) as ProductStatusKey;
    if (!PRODUCT_STATUSES.includes(to)) err("바꿀 판매 상태를 골라 주세요.");
    for (const id of targets) {
      const { data, error } = await supabase.from("mall_builder_products").update({ status: to }).eq("id", id).eq("store_id", storeId).select("id");
      if (error) fails.push(error.message);
      else if (!data?.length) fails.push("바꿀 수 없는 상품입니다.");
      else ok++;
    }
  } else if (op === "category_add" || op === "category_remove") {
    const category = String(form.get("category") ?? "");
    if (!isUuid(category)) err("카테고리를 골라 주세요.");
    const { data: cat } = await supabase.from("mall_builder_categories").select("id").eq("store_id", storeId).eq("id", category).maybeSingle();
    if (!cat) err("이 몰의 카테고리가 아닙니다.");
    if (op === "category_add") {
      const { error } = await supabase
        .from("mall_builder_product_categories")
        .upsert(targets.map((product_id) => ({ product_id, category_id: category, store_id: storeId })), { onConflict: "product_id,category_id", ignoreDuplicates: true });
      if (error) fails.push(error.message);
      else ok = targets.length; // 이미 들어 있던 상품도 「넣음」으로 센다
    } else {
      const { error } = await supabase.from("mall_builder_product_categories").delete().eq("store_id", storeId).eq("category_id", category).in("product_id", targets);
      if (error) fails.push(error.message);
      else ok = targets.length;
    }
  } else {
    err("할 일을 골라 주세요.");
  }

  const skipped = ids.length - targets.length; // 이 몰 상품이 아니라 뺀 것
  revalidatePath(`/s/${slug}`, "layout");
  const reasons = [...new Set(fails)].slice(0, 3).join(" / ").slice(0, 300);
  const failCount = op.startsWith("status:") ? fails.length + skipped : (fails.length ? targets.length : 0) + skipped;
  back(`bulk_ok=${ok}&bulk_fail=${failCount}${reasons ? `&bulk_error=${encodeURIComponent(reasons)}` : ""}`);
}
