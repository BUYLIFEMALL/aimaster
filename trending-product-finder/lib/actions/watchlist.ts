"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export interface WatchlistActionState {
  error?: string;
}

export async function createWatchlistAction(formData: FormData): Promise<WatchlistActionState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const categoryName = String(formData.get("categoryName") ?? "").trim();
  const naverCategoryCode = String(formData.get("naverCategoryCode") ?? "").trim();
  const keywordsRaw = String(formData.get("keywords") ?? "").trim();

  if (!categoryName || !naverCategoryCode) {
    return { error: "카테고리를 선택해주세요." };
  }
  const keywords = keywordsRaw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  if (keywords.length === 0) {
    return { error: "추적할 키워드를 1개 이상 입력해주세요 (쉼표로 구분)." };
  }
  if (keywords.length > 10) {
    return { error: "키워드는 한 번에 최대 10개까지 등록할 수 있어요 (데이터랩 API 일일 호출 한도 보호)." };
  }

  const { error } = await supabase.from("trend_watchlist").insert({
    user_id: user.id,
    category_name: categoryName,
    naver_category_code: naverCategoryCode,
    keywords,
  });
  if (error) return { error: error.message };

  revalidatePath("/watchlist");
  return {};
}

export async function toggleWatchlistActiveAction(formData: FormData) {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const nextActive = String(formData.get("nextActive") ?? "true") === "true";

  await supabase
    .from("trend_watchlist")
    .update({ is_active: nextActive })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/watchlist");
}

export async function deleteWatchlistAction(formData: FormData) {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");

  await supabase.from("trend_watchlist").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/watchlist");
}
