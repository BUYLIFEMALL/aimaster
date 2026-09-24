import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(req: Request) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { provider } = await req.json();

    if (!provider || typeof provider !== "string") {
      return Response.json({ error: "유효하지 않은 파라미터입니다." }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("user_api_keys")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", provider.trim().toLowerCase());

    if (error) {
      console.error("Delete API key error:", error);
      throw new Error(error.message);
    }

    return Response.json({ success: true });
  } catch (err: any) {
    return Response.json({ error: err.message || "API 키 삭제 중 오류가 발생했습니다." }, { status: 500 });
  }
}
