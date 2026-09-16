"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export interface CategoryActionState {
  error?: string;
}

function friendlyError(message: string): string {
  if (message.includes("duplicate key") || message.includes("unique constraint")) {
    return "이미 있는 카테고리 이름입니다.";
  }
  return message;
}

/** 게시글 글감/후보를 분류할 카테고리를 생성합니다. */
export async function createCategoryAction(
  _prevState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const user = await requireProgramAccess();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "카테고리 이름을 입력해주세요." };

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("threads_categories")
    .select("sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSortOrder = (last?.sort_order ?? 0) + 1;

  const { error } = await supabase
    .from("threads_categories")
    .insert({ user_id: user.id, name, sort_order: nextSortOrder });

  if (error) return { error: friendlyError(error.message) };

  revalidatePath("/candidates");
  return {};
}

/** 카테고리 이름을 수정합니다. */
export async function renameCategoryAction(
  _prevState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const user = await requireProgramAccess();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return { error: "카테고리 이름을 입력해주세요." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("threads_categories")
    .update({ name })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: friendlyError(error.message) };

  revalidatePath("/candidates");
  return {};
}

/** 카테고리를 삭제합니다. (분류되어 있던 후보는 '카테고리 없음'으로 변경) */
export async function deleteCategoryAction(formData: FormData) {
  const user = await requireProgramAccess();
  const id = String(formData.get("id") ?? "");

  const supabase = await createClient();
  await supabase.from("threads_categories").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/candidates");
}

/** 카테고리 순서를 이동시킵니다. */
export async function moveCategoryAction(formData: FormData) {
  const user = await requireProgramAccess();
  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!id || (direction !== "up" && direction !== "down")) return;

  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("threads_categories")
    .select("id, sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true });

  if (!categories) return;
  const index = categories.findIndex((c) => c.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= categories.length) return;

  const current = categories[index];
  const swapWith = categories[swapIndex];

  await Promise.all([
    supabase
      .from("threads_categories")
      .update({ sort_order: swapWith.sort_order })
      .eq("id", current.id)
      .eq("user_id", user.id),
    supabase
      .from("threads_categories")
      .update({ sort_order: current.sort_order })
      .eq("id", swapWith.id)
      .eq("user_id", user.id),
  ]);

  revalidatePath("/candidates");
}
