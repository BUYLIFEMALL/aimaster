import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { SONGS_TABLE } from "@/lib/songs";
import { parseTrackInput, TRACKS_TABLE } from "@/lib/tracks";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const COLUMNS = "id, song_id, project_id, title, style_prompt, lyrics, duration_sec, device, kind, created_at";

// 「모든 음악」 목록 — 서비스 키로 읽으므로 user_id를 코드에서 직접 건다(멀티테넌시 원칙 2).
export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const { data, error } = await createAdminClient()
    .from(TRACKS_TABLE)
    .select(COLUMNS)
    .eq("user_id", access.user.id)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tracks: data ?? [] });
}

// 생성 직후 기록 한 줄. 연결한 가사 초안이 본인 것이 아니면 연결만 뺀다.
export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const parsed = parseTrackInput(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const admin = createAdminClient();
  const value = { ...parsed.value };
  if (value.song_id) {
    const { data: own } = await admin.from(SONGS_TABLE).select("id").eq("id", value.song_id).eq("user_id", access.user.id).maybeSingle();
    if (!own) value.song_id = null;
  }
  const { data, error } = await admin
    .from(TRACKS_TABLE)
    .insert({ ...value, user_id: access.user.id })
    .select(COLUMNS)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ track: data });
}
