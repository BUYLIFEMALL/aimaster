import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { COLLECTIONS_TABLE, PLAYLIST_ITEMS_TABLE, parseTrackOrder } from "@/lib/collections";
import { TRACKS_TABLE } from "@/lib/tracks";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Ctx = { params: Promise<{ id: string }> };

async function ownPlaylist(id: string, uid: string) {
  const { data } = await createAdminClient()
    .from(COLLECTIONS_TABLE)
    .select("id")
    .eq("id", id)
    .eq("user_id", uid)
    .eq("kind", "playlist")
    .maybeSingle();
  return !!data;
}

// 플레이리스트에 담긴 곡 번호(순서대로)
export async function GET(_request: Request, { params }: Ctx) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await params;
  if (!(await ownPlaylist(id, access.user.id))) return NextResponse.json({ error: "찾지 못했습니다." }, { status: 404 });
  const { data, error } = await createAdminClient()
    .from(PLAYLIST_ITEMS_TABLE)
    .select("track_id, position")
    .eq("playlist_id", id)
    .eq("user_id", access.user.id)
    .order("position");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ track_ids: (data ?? []).map((r) => r.track_id) });
}

// 담긴 곡을 통째로 바꾼다(담기·빼기·순서 바꾸기를 모두 이것 하나로). 본인 곡만 남긴다.
export async function PUT(request: Request, { params }: Ctx) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await params;
  const uid = access.user.id;
  if (!(await ownPlaylist(id, uid))) return NextResponse.json({ error: "찾지 못했습니다." }, { status: 404 });
  const parsed = parseTrackOrder((await request.json().catch(() => null))?.track_ids);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const admin = createAdminClient();
  let ids = parsed.value;
  if (ids.length) {
    const { data: own, error } = await admin.from(TRACKS_TABLE).select("id").eq("user_id", uid).in("id", ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const mine = new Set((own ?? []).map((r) => r.id));
    ids = ids.filter((t) => mine.has(t));
  }
  const del = await admin.from(PLAYLIST_ITEMS_TABLE).delete().eq("playlist_id", id).eq("user_id", uid);
  if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 });
  if (ids.length) {
    const ins = await admin
      .from(PLAYLIST_ITEMS_TABLE)
      .insert(ids.map((track_id, position) => ({ playlist_id: id, track_id, user_id: uid, position })));
    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });
  }
  return NextResponse.json({ track_ids: ids });
}
