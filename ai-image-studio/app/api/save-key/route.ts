import { checkProgramAccessApi } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(req: Request) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { provider, apiKey } = await req.json();

    if (!provider || !apiKey || typeof apiKey !== "string") {
      return Response.json({ error: "유효하지 않은 파라미터입니다." }, { status: 400 });
    }

    const supabase = await createClient();

    // Upsert into user_api_keys (user_id, provider unique)
    const { error } = await supabase
      .from("user_api_keys")
      .upsert(
        {
          user_id: user.id,
          provider: provider.trim().toLowerCase(),
          api_key: apiKey.trim(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" }
      );

    if (error) {
      console.error("Save API key error:", error);
      throw new Error(error.message);
    }

    return Response.json({ success: true });
  } catch (err: any) {
    return Response.json({ error: err.message || "API 키 저장 중 오류가 발생했습니다." }, { status: 500 });
  }
}
