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

/** 글감 후보를 분류할 카테고리를 새로 만든다. */
export async function createCategoryAction(
  _prevState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const user = await requireProgramAccess();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "카테고리 이름을 입력해주세요." };

  const supabase = await createClient();
  const { error } = await supabase.from("ncafe_categories").insert({ user_id: user.id, name });

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
