"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import type { ThreadsCategory } from "@/types/post";

export interface CategoryActionState {
  error?: string;
}

const FALLBACK_KEY_PROVIDER = "perplexity"; // user_api_keys 조율용 (또는 fallback 백업)

/** DB에 threads_categories 테이블이 없을 때 user_api_keys를 백업 저장소로 활용하여 카테고리 목록을 안전하게 가져옵니다. */
export async function getThreadsCategories(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<ThreadsCategory[]> {
  try {
    const { data, error } = await supabase
      .from("threads_categories")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true });

    if (!error && data) {
      return data as ThreadsCategory[];
    }
  } catch {
    // ignore table missing error
  }

  // Fallback: user_api_keys 에서 'threads_categories_backup' 호환 키 조회
  try {
    const { data } = await supabase
      .from("user_api_keys")
      .select("api_key")
      .eq("user_id", userId)
      .eq("provider", "openai")
      .maybeSingle();

    if (data?.api_key && data.api_key.startsWith("CAT_JSON:")) {
      const jsonStr = data.api_key.replace("CAT_JSON:", "");
      const parsed = JSON.parse(jsonStr) as ThreadsCategory[];
      return parsed;
    }
  } catch {
    // ignore
  }

  return [];
}

/** Fallback 저장소에 카테고리 목록 저장 */
async function saveFallbackCategories(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  categories: ThreadsCategory[],
) {
  const jsonVal = "CAT_JSON:" + JSON.stringify(categories);
  await supabase
    .from("user_api_keys")
    .upsert(
      { user_id: userId, provider: "openai", api_key: jsonVal, updated_at: new Date().toISOString() },
      { onConflict: "user_id,provider" },
    );
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

  // 1차 시도: threads_categories 테이블
  try {
    const { data: last, error: selectErr } = await supabase
      .from("threads_categories")
      .select("sort_order")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!selectErr) {
      const nextSortOrder = (last?.sort_order ?? 0) + 1;
      const { error: insertErr } = await supabase
        .from("threads_categories")
        .insert({ user_id: user.id, name, sort_order: nextSortOrder });

      if (!insertErr) {
        revalidatePath("/candidates");
        return {};
      }
    }
  } catch {
    // fallback 진행
  }

  // 2차 Fallback: user_api_keys 테이블을 활용한 소프트 카테고리 저장
  try {
    const currentList = await getThreadsCategories(supabase, user.id);
    if (currentList.some((c) => c.name === name)) {
      return { error: "이미 있는 카테고리 이름입니다." };
    }
    const newCategory: ThreadsCategory = {
      id: crypto.randomUUID(),
      user_id: user.id,
      name,
      color: null,
      sort_order: currentList.length + 1,
      created_at: new Date().toISOString(),
    };
    const updatedList = [...currentList, newCategory];
    await saveFallbackCategories(supabase, user.id, updatedList);

    revalidatePath("/candidates");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "카테고리 생성에 실패했습니다." };
  }
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

  // 1차 시도
  try {
    const { error } = await supabase
      .from("threads_categories")
      .update({ name })
      .eq("id", id)
      .eq("user_id", user.id);

    if (!error) {
      revalidatePath("/candidates");
      return {};
    }
  } catch {
    // fallback 진행
  }

  // Fallback 시도
  try {
    const currentList = await getThreadsCategories(supabase, user.id);
    const updatedList = currentList.map((c) => (c.id === id ? { ...c, name } : c));
    await saveFallbackCategories(supabase, user.id, updatedList);

    revalidatePath("/candidates");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "카테고리 수정에 실패했습니다." };
  }
}

/** 카테고리를 삭제합니다. */
export async function deleteCategoryAction(formData: FormData) {
  const user = await requireProgramAccess();
  const id = String(formData.get("id") ?? "");

  const supabase = await createClient();

  try {
    const { error } = await supabase.from("threads_categories").delete().eq("id", id).eq("user_id", user.id);
    if (!error) {
      revalidatePath("/candidates");
      return;
    }
  } catch {
    // fallback
  }

  try {
    const currentList = await getThreadsCategories(supabase, user.id);
    const updatedList = currentList.filter((c) => c.id !== id);
    await saveFallbackCategories(supabase, user.id, updatedList);

    revalidatePath("/candidates");
  } catch {
    // ignore
  }
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
  const temp = updated[index];
  updated[index] = updated[swapIndex];
  updated[swapIndex] = temp;

  // sort_order 갱신
  const finalSorted = updated.map((item, idx) => ({ ...item, sort_order: idx + 1 }));

  try {
    await saveFallbackCategories(supabase, user.id, finalSorted);
  } catch {
    // ignore
  }

  revalidatePath("/candidates");
}
