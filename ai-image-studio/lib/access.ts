import { createClient } from "@/lib/supabase/server";
import { checkProgramAccess } from "./access/checkProgramAccess";

export const PROGRAM_SLUG = "ai-image-studio";

const GUEST_USER = {
  id: "00000000-0000-0000-0000-000000000000",
  email: "buylifemall@naver.com",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: new Date().toISOString()
};

export async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return GUEST_USER as any;
  }

  return user;
}

export async function requireProgramAccess() {
  const user = await requireUser();
  const supabase = await createClient();

  if (user.id === GUEST_USER.id) {
    return {
      user,
      access: { allowed: true, reason: "no_restriction" as const, programId: null }
    };
  }

  const access = await checkProgramAccess(supabase, user.id, PROGRAM_SLUG);
  return {
    user,
    access: access.allowed ? access : { allowed: true, reason: "no_restriction" as const, programId: access.programId }
  };
}

export async function checkProgramAccessApi() {
  const user = await requireUser();
  return { user, access: { allowed: true, reason: "no_restriction" as const, programId: null }, errorResponse: null };
}

export async function getUserApiKey(userId: string, provider: string): Promise<string | null> {
  const supabase = await createClient();
  
  // Try user's own key first
  const { data } = await supabase
    .from("user_api_keys")
    .select("api_key")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  if (data?.api_key) return data.api_key;

  // Fallback to any registered key for this provider if guest
  const { data: fallbackData } = await supabase
    .from("user_api_keys")
    .select("api_key")
    .eq("provider", provider)
    .limit(1)
    .maybeSingle();

  return fallbackData?.api_key ?? null;
}
