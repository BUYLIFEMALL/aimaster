import { checkAdminApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/server";
import SEED_PROMPTS_DATA from "@/lib/prompts/stylePresetPrompts.json";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(req: Request) {
  const { user, errorResponse } = await checkAdminApi();
  if (errorResponse) return errorResponse;
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabaseAdmin = createAdminClient();

    // Register the 160 editorial examples; existing rows are not replaced by this endpoint.
    const { count, error } = await supabaseAdmin
      .from("style_preset_prompts")
      .insert(SEED_PROMPTS_DATA);

    if (error) {
      console.error("Failed to seed style_preset_prompts:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, count: SEED_PROMPTS_DATA.length });
  } catch (err: any) {
    console.error("POST /api/prompts/seed error:", err);
    return Response.json({ error: err.message || "Failed to seed prompts" }, { status: 500 });
  }
}
