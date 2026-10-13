import { json } from "@/lib/aiRoute";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  const { data, error } = await createAdminClient()
    .from("reverse_prompt_history")
    .select("id, title, media_type, file_name, prompt, model_used, thumb, favorite, created_at")
    .eq("user_id", access.user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return json({ error: "기록을 불러오지 못했습니다." }, 500);
  return json({ items: data ?? [] });
}
