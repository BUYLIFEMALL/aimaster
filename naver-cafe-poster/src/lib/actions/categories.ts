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

/** 글감 후보를 분류할 카테고리를 새로 만든다. 새 카테고리는 항상 맨 뒤에 추가된다. */
export async function createCategoryAction(
  _prevState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const user = await requireProgramAccess();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "카테고리 이름을 입력해주세요." };

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("ncafe_categories")
    .select("sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSortOrder = (last?.sort_order ?? 0) + 1;

  const { error } = await supabase
    .from("ncafe_categories")
    .insert({ user_id: user.id, name, sort_order: nextSortOrder });

  if (error) return { error: friendlyError(error.message) };

  revalidatePath("/candidates");
  return {};
}

/** 카테고리 이름을 바꾼다. */
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
    .from("ncafe_categories")
    .update({ name })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: friendlyError(error.message) };

  revalidatePath("/candidates");
  return {};
}

/**
 * 카테고리를 삭제한다. 이 카테고리로 지정돼 있던 게시글 후보는 삭제되지 않고
 * "카테고리 없음"으로 돌아간다(category_id FK의 on delete set null).
 */
export async function deleteCategoryAction(formData: FormData) {
  const user = await requireProgramAccess();
  const id = String(formData.get("id") ?? "");

  const supabase = await createClient();
  await supabase.from("ncafe_categories").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/candidates");
}

/** 카테고리 목록에서 한 칸 위/아래로 순서를 바꾼다(바로 옆 카테고리와 sort_order를 맞바꾼다). */
export async function moveCategoryAction(formData: FormData) {
  const user = await requireProgramAccess();
  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!id || (direction !== "up" && direction !== "down")) return;

  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("ncafe_categories")
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
      .from("ncafe_categories")
      .update({ sort_order: swapWith.sort_order })
      .eq("id", current.id)
      .eq("user_id", user.id),
    supabase
      .from("ncafe_categories")
      .update({ sort_order: current.sort_order })
      .eq("id", swapWith.id)
      .eq("user_id", user.id),
  ]);

  revalidatePath("/candidates");
}
