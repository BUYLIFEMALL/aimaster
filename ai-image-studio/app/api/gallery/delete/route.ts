import { checkProgramAccessApi } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function DELETE(req: Request) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse || !user) return errorResponse;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return Response.json({ error: "id가 필요합니다." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("user_image_generations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
