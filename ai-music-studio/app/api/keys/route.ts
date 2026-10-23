import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 공용 user_api_keys(회원별, 모든 프로그램 공용) — 이 프로그램이 쓰는 이름만 다룬다. 키 값은 화면으로 돌려주지 않는다.
// mureka: 2026-10-23 코드 준비(화면에는 MUREKA_ENABLED일 때만 보임)
const ALLOWED = ["gemini", "elevenlabs", "suno", "fal", "replicate", "openai", "mureka"] as const;
type Allowed = (typeof ALLOWED)[number];
const isAllowed = (v: unknown): v is Allowed => typeof v === "string" && (ALLOWED as readonly string[]).includes(v);

export async function GET() {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  const { data } = await createAdminClient().from("user_api_keys").select("provider").eq("user_id", user.id).in("provider", ALLOWED as unknown as string[]);
  return NextResponse.json({ registered: (data ?? []).map((r) => r.provider) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  const body = (await request.json().catch(() => ({}))) as { provider?: unknown; apiKey?: unknown };
  if (!isAllowed(body.provider)) return NextResponse.json({ error: "알 수 없는 항목입니다." }, { status: 400 });
  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  if (apiKey.length < 8 || apiKey.length > 400) return NextResponse.json({ error: "API 키를 확인해 주세요." }, { status: 400 });
  const { error } = await createAdminClient()
    .from("user_api_keys")
    .upsert({ user_id: user.id, provider: body.provider, api_key: apiKey }, { onConflict: "user_id,provider" });
  if (error) return NextResponse.json({ error: "저장하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  const provider = new URL(request.url).searchParams.get("provider");
  if (!isAllowed(provider)) return NextResponse.json({ error: "알 수 없는 항목입니다." }, { status: 400 });
  await createAdminClient().from("user_api_keys").delete().eq("user_id", user.id).eq("provider", provider);
  return NextResponse.json({ ok: true });
}
