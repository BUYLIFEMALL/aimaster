import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseSongInput, SONGS_TABLE } from "@/lib/songs";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const COLUMNS = "id, title, style_prompt, lyrics, duration_sec, created_at, updated_at";

// 내 곡 목록 — 서비스 키로 읽으므로 user_id를 코드에서 직접 건다(멀티테넌시 원칙 2).
export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const { data, error } = await createAdminClient()
    .from(SONGS_TABLE)
    .select(COLUMNS)
    .eq("user_id", access.user.id)
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ songs: data ?? [] });
}

export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const parsed = parseSongInput(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { data, error } = await createAdminClient()
    .from(SONGS_TABLE)
    .insert({ ...parsed.value, user_id: access.user.id })
    .select(COLUMNS)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ song: data });
}
