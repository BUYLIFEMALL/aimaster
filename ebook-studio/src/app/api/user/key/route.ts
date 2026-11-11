import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";

// v1.15: 글 생성 플랫폼 3종(OpenAI·Claude·Gemini). 공용 user_api_keys provider 이름 그대로.
const PROVIDERS = ["openai", "anthropic", "gemini"] as const;
type Provider = (typeof PROVIDERS)[number];
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const isProvider = (v: unknown): v is Provider => typeof v === "string" && (PROVIDERS as readonly string[]).includes(v);

export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ key: null, providers: { openai: false, anthropic: false, gemini: false }, error: access.error }, { status: access.status });
  const user = access.user;

  const adminSupabase = createAdminClient();
  const { data } = await adminSupabase
    .from("user_api_keys")
    .select("provider, api_key")
    .eq("user_id", user.id)
    .in("provider", [...PROVIDERS]);

  const rows = data ?? [];
  const has = (p: Provider) => rows.some((r) => r.provider === p && typeof r.api_key === "string" && r.api_key.trim() !== "");
  // Gemini 키는 화면(표지 이미지·연결 시험)이 직접 쓰므로 값을 돌려주고, OpenAI·Claude 키는 등록 여부만 알린다.
  const gemini = rows.find((r) => r.provider === "gemini")?.api_key || null;
  return NextResponse.json({ key: gemini, providers: { openai: has("openai"), anthropic: has("anthropic"), gemini: has("gemini") } });
}

export async function POST(req: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const user = access.user;

  const { apiKey, provider: providerInput } = await req.json();
  const provider: Provider = providerInput === undefined ? "gemini" : isProvider(providerInput) ? providerInput : ("" as Provider);
  if (!provider) return NextResponse.json({ error: "지원하지 않는 플랫폼입니다." }, { status: 400 });
  if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
    return NextResponse.json({ error: "유효한 API 키가 아닙니다." }, { status: 400 });
  }

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase.from("user_api_keys").upsert(
    {
      user_id: user.id,
      provider,
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
