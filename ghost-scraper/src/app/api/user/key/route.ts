import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ key: null, error: access.error }, { status: access.status });
  const user = access.user;

  const adminSupabase = createAdminClient();
  const { data } = await adminSupabase
    .from("user_api_keys")
    .select("api_key")
    .eq("user_id", user.id)
    .eq("provider", "gemini")
    .maybeSingle();

  return NextResponse.json({ key: data?.api_key || null });
}

export async function POST(req: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const user = access.user;

  const { apiKey } = await req.json();
  if (!apiKey || typeof apiKey !== "string") {
    return NextResponse.json({ error: "유효한 API 키가 아닙니다." }, { status: 400 });
  }

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase.from("user_api_keys").upsert(
    {
      user_id: user.id,
      provider: "gemini",
      api_key: apiKey.trim(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
