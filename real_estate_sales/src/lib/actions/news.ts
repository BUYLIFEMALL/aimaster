"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runNewsForUser } from "@/lib/news/runner";

export interface NewsActionState {
  error?: string;
  success?: boolean;
  message?: string;
}

/** RQ-C(2026-11-09): 지역 뉴스 받기·AI 요약 켜기(둘 다 기본 꺼짐 — 결정 2) */
export async function saveNewsSettingsAction(_prev: NewsActionState, formData: FormData): Promise<NewsActionState> {
  const user = await requireProgramAccess();
  const enabled = formData.get("newsEnabled") === "on";
  const aiSummary = formData.get("newsAiSummary") === "on";
  const supabase = await createClient();
  const { error } = await (supabase as unknown as { from: (t: string) => any }) // eslint-disable-line @typescript-eslint/no-explicit-any
    .from("real_estate_user_preferences")
    .upsert({ user_id: user.id, news_enabled: enabled, news_ai_summary: aiSummary, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return { error: error.message };
  revalidatePath("/news");
  return { success: true, message: enabled ? "저장했어요. 내일 아침 8시 이후부터 알림이 와요." : "저장했어요. 지역 뉴스 알림을 껐어요." };
}

/** 「지금 받아 보기」: 알림·AI 요약 없이 지금 새 기사만 찾아 저장한다(네이버 검색은 회원 본인 키, 무료) */
export async function fetchNewsNowAction(_prev: NewsActionState): Promise<NewsActionState> {
  const user = await requireProgramAccess();
  const result = await runNewsForUser(createAdminClient(), user.id, { notify: false });
  revalidatePath("/news");
  if (result.error) return { error: result.error };
  return { success: true, message: `관심 지역 ${result.regions}곳에서 새 기사 ${result.saved}건을 찾았어요.` };
}
