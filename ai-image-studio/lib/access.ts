import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkProgramAccess } from "../../lib/access/checkProgramAccess";

export const PROGRAM_SLUG = "ai-image-studio";

export async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const mainAppUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.buylife.xyz";
    redirect(`${mainAppUrl}/login?next=${encodeURIComponent("https://ai-image-studio.vercel.app/dashboard")}`);
  }

  return user;
}

export async function requireProgramAccess() {
  const user = await requireUser();
  const supabase = await createClient();

  const access = await checkProgramAccess(supabase, user.id, PROGRAM_SLUG);
  if (!access.allowed) {
    const mainAppUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.buylife.xyz";
    redirect(`${mainAppUrl}/programs/${PROGRAM_SLUG}?error=no_access`);
  }

  return { user, access };
}

export async function checkProgramAccessApi() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, access: null, errorResponse: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const access = await checkProgramAccess(supabase, user.id, PROGRAM_SLUG);
  if (!access.allowed) {
    return { user, access, errorResponse: Response.json({ error: "Forbidden: No Program Access" }, { status: 403 }) };
  }

  return { user, access, errorResponse: null };
}

export async function getUserApiKey(userId: string, provider: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_api_keys")
    .select("api_key")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  return (data as { api_key: string } | null)?.api_key ?? null;
}
