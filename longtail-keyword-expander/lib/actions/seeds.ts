"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export interface CreateSeedState {
  error?: string;
}

export async function createSeedAction(formData: FormData): Promise<CreateSeedState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const keyword = String(formData.get("keyword") ?? "").trim();
  if (!keyword) return { error: "키워드를 입력해주세요." };

  const engineInput = String(formData.get("engine") ?? "").trim();
  const engine = engineInput === "google" ? "google" : "naver";

  const { error } = await supabase.from("longtail_seed_keywords").insert({
    user_id: user.id,
    keyword,
    engine,
  });
  if (error) return { error: error.message };

  revalidatePath("/seeds");
  return {};
}

export async function toggleSeedActiveAction(seedId: string, isActive: boolean) {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  await supabase
    .from("longtail_seed_keywords")
    .update({ is_active: isActive })
    .eq("id", seedId)
    .eq("user_id", user.id);

  revalidatePath("/seeds");
}

export async function deleteSeedAction(seedId: string) {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  await supabase.from("longtail_seed_keywords").delete().eq("id", seedId).eq("user_id", user.id);

  revalidatePath("/seeds");
}

/** 실행(run) 1건을 삭제한다. FK on delete cascade는 없으므로(run은 leaf 테이블) 그냥 삭제한다. */
export async function deleteRunAction(seedId: string, runId: string) {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  await supabase.from("longtail_runs").delete().eq("id", runId).eq("user_id", user.id);

  revalidatePath(`/seeds/${seedId}`);
  revalidatePath("/seeds");
  revalidatePath("/runs");
}
