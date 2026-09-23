import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("user_api_keys")
    .select("provider")
    .eq("user_id", user.id);

  const registeredProviders = (data || []).map((row: any) => row.provider);
  return Response.json({ registeredProviders });
}
