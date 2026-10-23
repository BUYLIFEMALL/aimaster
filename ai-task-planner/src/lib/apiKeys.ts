import "server-only";
import { createAdminClient } from "./supabase/admin";
import { PlannerError } from "./planner/engine";

export async function resolveApiKey(userId: string): Promise<string | null> {
  const { data, error } = await createAdminClient().from("user_api_keys").select("api_key").eq("user_id", userId).eq("provider", "gemini").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new PlannerError("본인 키 등록 상태를 확인하지 못했습니다. 다시 시도해주세요.", 503);
  return typeof data?.api_key === "string" && data.api_key.trim() ? data.api_key.trim() : null;
}
