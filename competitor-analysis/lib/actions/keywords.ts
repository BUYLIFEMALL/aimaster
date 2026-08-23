"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export interface CreateKeywordState {
  error?: string;
}

export async function createKeywordAction(formData: FormData): Promise<CreateKeywordState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const keyword = String(formData.get("keyword") ?? "").trim();
  if (!keyword) return { error: "키워드를 입력해주세요." };

  const location = String(formData.get("location") ?? "").trim() || "South Korea";
  const googleDomain = String(formData.get("googleDomain") ?? "").trim() || "google.com";
  const lang = String(formData.get("lang") ?? "").trim() || "ko";
  const engineInput = String(formData.get("engine") ?? "").trim();
  const engine = engineInput === "naver" ? "naver" : "google";

  const { error } = await supabase.from("competitor_keywords").insert({
    user_id: user.id,
    keyword,
    location,
    google_domain: googleDomain,
    lang,
    engine,
  });
  if (error) return { error: error.message };

  revalidatePath("/keywords");
  return {};
}

export async function toggleKeywordActiveAction(keywordId: string, isActive: boolean) {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  await supabase
    .from("competitor_keywords")
    .update({ is_active: isActive })
    .eq("id", keywordId)
    .eq("user_id", user.id);

  revalidatePath("/keywords");
}

export async function deleteKeywordAction(keywordId: string) {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  await supabase.from("competitor_keywords").delete().eq("id", keywordId).eq("user_id", user.id);

  revalidatePath("/keywords");
}

/** 분석 회차(job) 하나를 삭제한다. FK on delete cascade로 해당 SERP 결과/분석도 함께 지워진다. */
export async function deleteJobAction(keywordId: string, jobId: string) {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  await supabase.from("competitor_serp_jobs").delete().eq("id", jobId).eq("user_id", user.id);

  revalidatePath(`/keywords/${keywordId}`);
  revalidatePath("/keywords");
}
