import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function DELETE(req: Request) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return Response.json({ error: "id가 필요합니다." }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();

  // 1. Fetch log record to check storage file URL
  const { data: targetLog } = await supabaseAdmin
    .from("usage_logs")
    .select("metadata")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (targetLog?.metadata?.image_url) {
    const imageUrl: string = targetLog.metadata.image_url;
    // If image is stored in Supabase Storage bucket 'ai-image-generations'
    if (imageUrl.includes("/ai-image-generations/")) {
      const fileName = imageUrl.split("/ai-image-generations/").pop();
      if (fileName) {
        await supabaseAdmin.storage.from("ai-image-generations").remove([fileName]);
      }
    }
  }

  // 2. Delete DB record
  const { error } = await supabaseAdmin
    .from("usage_logs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
