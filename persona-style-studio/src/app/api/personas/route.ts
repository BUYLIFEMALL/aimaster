import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { clampValues, trimField } from "@/lib/persona/prompt";
import { LIMITS, type Persona } from "@/lib/persona/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const KEY_RE = /^(persona-[a-z-]{1,40}|custom-[A-Za-z0-9-]{1,40})$/;
const MAX_CUSTOM = 100;

interface Row {
  persona_key: string;
  name: string;
  role: string;
  description: string;
  avatar: string;
  lore: string;
  voice: string;
  style: string;
  eq_values: Record<string, unknown>;
}
const toPersona = (r: Row): Persona => ({
  id: r.persona_key,
  name: r.name,
  role: r.role,
  description: r.description,
  avatar: r.avatar,
  context: { lore: r.lore, voice: r.voice, style: r.style },
  values: clampValues(r.eq_values),
});

/** GET — 내 페르소나(기본 페르소나를 수정한 값 + 직접 만든 것) */
export async function GET() {
  const auth = await checkProgramAccessApi();
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { data, error } = await createAdminClient()
    .from("persona_style_personas")
    .select("persona_key, name, role, description, avatar, lore, voice, style, eq_values")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: "페르소나를 불러오지 못했습니다." }, { status: 500 });
  return NextResponse.json({ personas: ((data ?? []) as Row[]).map(toPersona) });
}

/** POST — 페르소나 저장(새로 만들기 또는 수정). 본인 것만 저장한다. */
export async function POST(req: NextRequest) {
  const auth = await checkProgramAccessApi();
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = await req.json().catch(() => null);
  const p = body?.persona;
  const key = typeof p?.id === "string" ? p.id : "";
  const name = trimField(p?.name, LIMITS.name);
  const role = trimField(p?.role, LIMITS.role);
  if (!KEY_RE.test(key) || !name || !role) return NextResponse.json({ error: "이름과 역할은 필수입니다." }, { status: 400 });

  const admin = createAdminClient();
  if (key.startsWith("custom-")) {
    const { count } = await admin
      .from("persona_style_personas")
      .select("id", { count: "exact", head: true })
      .eq("user_id", auth.user.id)
      .like("persona_key", "custom-%");
    const { data: existing } = await admin
      .from("persona_style_personas")
      .select("id")
      .eq("user_id", auth.user.id)
      .eq("persona_key", key)
      .maybeSingle();
    if (!existing && (count ?? 0) >= MAX_CUSTOM) {
      return NextResponse.json({ error: `직접 만든 페르소나는 ${MAX_CUSTOM}개까지 저장할 수 있습니다.` }, { status: 400 });
    }
  }
  const { error } = await admin.from("persona_style_personas").upsert(
    {
      user_id: auth.user.id,
      persona_key: key,
      name,
      role,
      description: trimField(p?.description, LIMITS.description) || role,
      avatar: trimField(p?.avatar, 8) || "👤",
      lore: trimField(p?.context?.lore, LIMITS.field),
      voice: trimField(p?.context?.voice, LIMITS.field),
      style: trimField(p?.context?.style, LIMITS.field),
      eq_values: clampValues(p?.values),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,persona_key" },
  );
  if (error) return NextResponse.json({ error: "저장하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ success: true });
}

/** DELETE ?id= — 직접 만든 페르소나 삭제 또는 기본 페르소나의 수정값 초기화 */
export async function DELETE(req: NextRequest) {
  const auth = await checkProgramAccessApi();
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const key = req.nextUrl.searchParams.get("id") ?? "";
  if (!KEY_RE.test(key)) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  const { error } = await createAdminClient()
    .from("persona_style_personas")
    .delete()
    .eq("user_id", auth.user.id)
    .eq("persona_key", key);
  if (error) return NextResponse.json({ error: "삭제하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ success: true });
}
