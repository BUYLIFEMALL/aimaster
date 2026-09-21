import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const allowedProviders = new Set(["openai", "gemini"]);

export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const input = await request.json().catch(() => null) as { provider?: string; apiKey?: string } | null;
  if (!input?.provider || !allowedProviders.has(input.provider) || !input.apiKey?.trim()) return NextResponse.json({ error: "지원하지 않는 API 키 요청입니다." }, { status: 400 });
  const supabase = await createClient();
  const { error } = await supabase.from("user_api_keys").upsert({ user_id: access.user.id, provider: input.provider, api_key: input.apiKey.trim() }, { onConflict: "user_id,provider" });
  if (error) return NextResponse.json({ error: "API 키 저장에 실패했습니다." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const provider = new URL(request.url).searchParams.get("provider");
  if (!provider || !allowedProviders.has(provider)) return NextResponse.json({ error: "지원하지 않는 API 키 요청입니다." }, { status: 400 });
  const supabase = await createClient();
  const { error } = await supabase.from("user_api_keys").delete().eq("user_id", access.user.id).eq("provider", provider);
  if (error) return NextResponse.json({ error: "API 키 해제에 실패했습니다." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
