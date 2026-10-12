import { createAdminClient } from "./supabase/admin";

export async function getUserGeminiApiKey(userId: string): Promise<string | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("user_api_keys")
    .select("api_key")
    .eq("user_id", userId)
    .eq("provider", "gemini")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.api_key;
}

export async function saveUserGeminiApiKey(userId: string, apiKey: string) {
  const admin = createAdminClient();

  // 기존 키 확인
  const { data: existing } = await admin
    .from("user_api_keys")
    .select("id")
    .eq("user_id", userId)
    .eq("provider", "gemini")
    .maybeSingle();

  if (existing) {
    const { error } = await admin
      .from("user_api_keys")
      .update({
        api_key: apiKey.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await admin.from("user_api_keys").insert({
      user_id: userId,
      provider: "gemini",
      api_key: apiKey.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) return { success: false, error: error.message };
  }

  return { success: true };
}

export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return "••••••••";
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}
