"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import type { ThreadsCategory } from "@/types/post";

export interface CategoryActionState {
  error?: string;
}

export async function getThreadsCategories(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<ThreadsCategory[]> {
  const { data } = await supabase
    .from("threads_categories")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });
  return (data ?? []) as ThreadsCategory[];
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
  const current = await getThreadsCategories(supabase, user.id);
  if (current.some((c) => c.name === name)) return { error: "이미 있는 카테고리 이름입니다." };

  const nextSortOrder = (current.at(-1)?.sort_order ?? 0) + 1;
  const { error } = await supabase
    .from("threads_categories")
    .insert({ user_id: user.id, name, sort_order: nextSortOrder });
  if (error) return { error: `카테고리 생성에 실패했습니다: ${error.message}` };

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
  if (error) return { error: `카테고리 수정에 실패했습니다: ${error.message}` };

  revalidatePath("/candidates");
  return {};
}

/** 카테고리를 삭제합니다. (후보의 category_id는 FK의 ON DELETE SET NULL로 해제됨) */
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
  const currentList = await getThreadsCategories(supabase, user.id);
  const index = currentList.findIndex((c) => c.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= currentList.length) return;

  const updated = [...currentList];
  [updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]];

  await Promise.all(
    updated.map((cat, idx) =>
      supabase
        .from("threads_categories")
        .update({ sort_order: idx + 1 })
        .eq("id", cat.id)
        .eq("user_id", user.id),
    ),
  );

  revalidatePath("/candidates");
}

/** 특정 수집 후보 게시글의 카테고리를 지정/변경합니다. */
export async function updateCandidateCategoryAction(formData: FormData) {
  const user = await requireProgramAccess();
  const candidateId = String(formData.get("candidateId") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "");
  if (!candidateId) return;

  const supabase = await createClient();
  await supabase
    .from("threads_candidates")
    .update({ category_id: categoryId || null })
    .eq("id", candidateId)
    .eq("user_id", user.id);
  revalidatePath("/candidates");
}
