import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  try {
    const user = await requireUser();
    const admin = createAdminClient() as any;

    const { data, error } = await admin
      .from("user_api_keys")
      .select("provider, updated_at")
      .eq("user_id", user.id);

    if (error) throw error;

    const registered = (data || []).map((row: any) => row.provider);
    return NextResponse.json({ registered });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { provider, apiKey } = await req.json();

    if (!provider || !apiKey) {
      return NextResponse.json({ error: "제공자와 API 키를 모두 입력해주세요." }, { status: 400 });
    }

    const admin = createAdminClient() as any;

    const { error } = await admin.from("user_api_keys").upsert(
      {
        user_id: user.id,
        provider,
        api_key: apiKey.trim(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    );

    if (error) throw error;

    return NextResponse.json({ success: true, message: "API 키가 안전하게 등록되었습니다." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
