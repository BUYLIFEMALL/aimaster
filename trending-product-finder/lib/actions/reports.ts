"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { generateReportForWatchlist } from "@/lib/reportEngine";

export interface GenerateReportState {
  error?: string;
}

export async function generateReportAction(formData: FormData): Promise<GenerateReportState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const watchlistId = String(formData.get("watchlistId") ?? "");

  const { data: watchlist } = await supabase
    .from("trend_watchlist")
    .select("id, user_id, category_name, naver_category_code, keywords")
    .eq("id", watchlistId)
    .eq("user_id", user.id)
    .single();

  if (!watchlist) return { error: "관심 목록을 찾을 수 없습니다." };

  const result = await generateReportForWatchlist(supabase, watchlist);
  if (!result.ok) {
    if (result.error === "네이버 API 키 미등록") {
      return { error: "네이버 API 키가 등록되어 있지 않습니다. 설정 페이지에서 본인 키를 등록해주세요." };
    }
    return { error: result.error };
  }

  await logProgramUsage({
    userId: user.id,
    action: "generate_report",
    quantity: watchlist.keywords.length,
    metadata: { watchlistId: watchlist.id },
  });

  revalidatePath("/reports");
  return {};
}
