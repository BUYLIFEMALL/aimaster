import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { SONGS_TABLE } from "@/lib/songs";
import { parseTrackInput, TRACKS_TABLE } from "@/lib/tracks";
import { isRetentionExempt } from "@/lib/retentionExempt";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const COLUMNS = "id, song_id, project_id, title, style_prompt, lyrics, duration_sec, device, kind, license, parent_id, created_at, trashed_at, lyric_timing";

// 「모든 음악」 목록 — 서비스 키로 읽으므로 user_id를 코드에서 직접 건다(멀티테넌시 원칙 2).
// 휴지통 곡은 빼고, ?trash=1이면 휴지통 곡만(넣은 순서 최신부터, 2026-11-06).
export async function GET(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const admin = createAdminClient();
  const inTrash = new URL(request.url).searchParams.get("trash") === "1";
  const base = admin.from(TRACKS_TABLE).select(COLUMNS).eq("user_id", access.user.id);
  const list = inTrash ? base.not("trashed_at", "is", null).order("trashed_at", { ascending: false }) : base.is("trashed_at", null).order("created_at", { ascending: false });
  const [{ data, error }, retentionExempt] = await Promise.all([
    list.limit(500),
    isRetentionExempt(admin, access.user.id),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tracks: data ?? [], retentionExempt });
}

// 생성 직후 기록 한 줄. 연결한 가사 초안이 본인 것이 아니면 연결만 뺀다.
export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const parsed = parseTrackInput(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const admin = createAdminClient();
  const value: typeof parsed.value & { project_id?: string | null } = { ...parsed.value };
  if (value.song_id) {
    const { data: own } = await admin.from(SONGS_TABLE).select("id, project_id").eq("id", value.song_id).eq("user_id", access.user.id).maybeSingle();
    if (!own) value.song_id = null;
    // 초안이 프로젝트에 속해 있으면 만든 곡도 그 프로젝트로(2026-11-06, 원본 boks-music 프로젝트 안에서 만들기)
    else if (own.project_id) value.project_id = own.project_id;
  }
  // 원곡도 본인 곡일 때만 연결한다
  if (value.parent_id) {
    const { data: own } = await admin.from(TRACKS_TABLE).select("id").eq("id", value.parent_id).eq("user_id", access.user.id).maybeSingle();
    if (!own) value.parent_id = null;
  }
  const { data, error } = await admin
    .from(TRACKS_TABLE)
    .insert({ ...value, user_id: access.user.id })
    .select(COLUMNS)
    .single();
  // 대기열 기록은 같은 곡 번호로 다시 올 수 있다(기록 뒤 엔진 표시가 실패한 경우) — 이미 있으면 그대로 성공
  if (error?.code === "23505") {
    const { data: existing } = await admin.from(TRACKS_TABLE).select(COLUMNS).eq("id", value.id).eq("user_id", access.user.id).maybeSingle();
    if (existing) return NextResponse.json({ track: existing });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ track: data });
}
