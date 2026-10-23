"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export interface TrackCompetitorState {
  error?: string;
}

/** "이 도메인을 내 경쟁사로 표시" 토글. */
export async function trackCompetitorAction(domain: string, note?: string): Promise<TrackCompetitorState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { error } = await supabase
    .from("user_tracked_competitors")
    .upsert({ user_id: user.id, domain, note: note ?? null }, { onConflict: "user_id,domain" });
  if (error) return { error: error.message };

  revalidatePath("/competitors");
  return {};
}

export async function untrackCompetitorAction(domain: string) {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  await supabase.from("user_tracked_competitors").delete().eq("user_id", user.id).eq("domain", domain);

  revalidatePath("/competitors");
}
