import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRESETS_TABLE, PRESET_LIMITS, parsePresetInput } from "@/lib/presets";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 내 프리셋 목록. 서비스 키로 읽으므로 user_id를 코드에서 직접 건다.
export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const { data, error } = await createAdminClient()
    .from(PRESETS_TABLE)
    .select("id, name, prompt, mode, created_at")
    .eq("user_id", access.user.id)
    .order("created_at")
    .limit(PRESET_LIMITS.perUser);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ presets: data ?? [] });
}

export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const input = parsePresetInput(await request.json().catch(() => null));
  if (!input.ok) return NextResponse.json({ error: input.error }, { status: 400 });
  const admin = createAdminClient();
  const { count, error: countError } = await admin.from(PRESETS_TABLE).select("id", { count: "exact", head: true }).eq("user_id", access.user.id);
  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });
  if ((count ?? 0) >= PRESET_LIMITS.perUser) {
    return NextResponse.json({ error: `내 프리셋은 ${PRESET_LIMITS.perUser}개까지 저장할 수 있습니다. 안 쓰는 프리셋을 지워 주세요.` }, { status: 400 });
  }
  const { data, error } = await admin
    .from(PRESETS_TABLE)
    .insert({ user_id: access.user.id, ...input.value })
    .select("id, name, prompt, mode, created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ preset: data });
}
