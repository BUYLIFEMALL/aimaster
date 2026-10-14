import "server-only";
import { createAdminClient } from "./supabase/admin";
import { AppError } from "./translation/api";
export async function resolveApiKey(userId: string) {
  const { data, error } = await createAdminClient()
    .from("user_api_keys")
    .select("api_key")
    .eq("user_id", userId)
    .eq("provider", "gemini")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error)
    throw new AppError("본인 Gemini 키 등록 상태를 확인하지 못했습니다.", 503);
  return typeof data?.api_key === "string" && data.api_key.trim()
    ? data.api_key.trim()
    : null;
}
