import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function maskSecret(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 7)}${"•".repeat(8)}${key.slice(-4)}`;
}

export async function GET() {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
    const user = { id: access.userId };
    const admin = createAdminClient() as any;

    const { data, error } = await admin
      .from("user_api_keys")
      .select("provider, api_key, updated_at")
      .eq("user_id", user.id);

    if (error) throw error;

    const registered = (data || []).map((row: any) => row.provider);
    const details = (data || []).map((row: any) => ({
      provider: row.provider,
      maskedKey: maskSecret(row.api_key || ""),
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ registered, details });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
    const user = { id: access.userId };
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

export async function DELETE(req: Request) {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
    const user = { id: access.userId };
    const { provider } = await req.json();

    if (!provider) {
      return NextResponse.json({ error: "삭제할 제공자를 지정해주세요." }, { status: 400 });
    }

    const admin = createAdminClient() as any;
    const { error } = await admin
      .from("user_api_keys")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", provider);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "API 키가 삭제되었습니다." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
