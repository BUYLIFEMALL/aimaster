"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { categoryNameError, nextSort, swapTarget, type CategoryRow } from "@/lib/categories";

// 모든 동작은 보안 규칙(그 몰 운영자만 쓰기)을 그대로 거친다. 운영자가 아니면 바뀐 줄이 0이 된다.

async function storeIdOf(slug: string) {
  const supabase = await createClient();
  const { data: store } = await supabase.from("mall_builder_stores").select("id").eq("slug", slug).maybeSingle();
  if (!store) back(slug, "몰을 찾을 수 없습니다.");
  const { data: staff } = await supabase.rpc("mall_builder_is_store_staff", { p_store_id: store!.id });
  if (staff !== true) back(slug, "이 몰을 고칠 권한이 없습니다.");
  return { supabase, storeId: store!.id as string };
}

async function rowsOf(slug: string) {
  const { supabase, storeId } = await storeIdOf(slug);
  const { data } = await supabase
    .from("mall_builder_categories")
    .select("id, parent_id, name, depth, sort, is_visible")
    .eq("store_id", storeId);
  return { supabase, storeId, rows: (data ?? []) as CategoryRow[] };
}

function back(slug: string, error?: string): never {
  revalidatePath(`/s/${slug}`, "layout");
  redirect(`/s/${slug}/admin/categories${error ? `?error=${encodeURIComponent(error)}` : ""}`);
}

export async function createCategoryAction(slug: string, parentId: string | null, form: FormData) {
  const name = String(form.get("name") ?? "").trim();
  const nameError = categoryNameError(name);
  if (nameError) back(slug, nameError);
  const { supabase, storeId, rows } = await rowsOf(slug);
  const { error } = await supabase
    .from("mall_builder_categories")
    .insert({ store_id: storeId, parent_id: parentId, name, sort: nextSort(rows, parentId) });
  back(slug, error?.message);
}

export async function renameCategoryAction(slug: string, id: string, form: FormData) {
  const name = String(form.get("name") ?? "").trim();
  const nameError = categoryNameError(name);
  if (nameError) back(slug, nameError);
  const { supabase, storeId } = await storeIdOf(slug);
  const { error } = await supabase.from("mall_builder_categories").update({ name }).eq("id", id).eq("store_id", storeId);
  back(slug, error?.message);
}

export async function toggleCategoryAction(slug: string, id: string, visible: boolean) {
  const { supabase, storeId } = await storeIdOf(slug);
  const { error } = await supabase.from("mall_builder_categories").update({ is_visible: visible }).eq("id", id).eq("store_id", storeId);
  back(slug, error?.message);
}

export async function moveCategoryAction(slug: string, id: string, direction: "up" | "down") {
  const { supabase, storeId, rows } = await rowsOf(slug);
  const target = swapTarget(rows, id, direction);
  if (!target) back(slug);
  // 형제의 순서 값이 겹쳐 있을 수 있으므로 10, 20, 30… 으로 다시 매기고 두 칸을 바꾼다
  const me = rows.find((r) => r.id === id)!;
  const siblings = rows
    .filter((r) => (r.parent_id ?? null) === (me.parent_id ?? null))
    .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, "ko"));
  const order = siblings.map((r) => r.id);
  const i = order.indexOf(target!.a.id);
  const j = order.indexOf(target!.b.id);
  [order[i], order[j]] = [order[j], order[i]];
  for (const [index, rowId] of order.entries()) {
    const { error } = await supabase
      .from("mall_builder_categories")
      .update({ sort: (index + 1) * 10 })
      .eq("id", rowId)
      .eq("store_id", storeId);
    if (error) back(slug, error.message);
  }
  back(slug);
}

export async function deleteCategoryAction(slug: string, id: string) {
  const { supabase, storeId, rows } = await rowsOf(slug);
  if (rows.some((r) => r.parent_id === id)) back(slug, "하위 카테고리가 있어 삭제할 수 없습니다. 하위부터 지워 주세요.");
  const { error } = await supabase.from("mall_builder_categories").delete().eq("id", id).eq("store_id", storeId);
  back(slug, error?.message);
}
