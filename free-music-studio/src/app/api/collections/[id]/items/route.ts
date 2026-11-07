import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { COLLECTIONS_TABLE, PLAYLIST_ITEMS_TABLE, parseTrackOrder, type CollectionKind } from "@/lib/collections";
import { TRACKS_TABLE } from "@/lib/tracks";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Ctx = { params: Promise<{ id: string }> };

/** 본인 묶음이면 종류(프로젝트·플레이리스트), 아니면 null */
async function ownKind(id: string, uid: string): Promise<CollectionKind | null> {
  const { data } = await createAdminClient().from(COLLECTIONS_TABLE).select("kind").eq("id", id).eq("user_id", uid).maybeSingle();
  return (data?.kind as CollectionKind | undefined) ?? null;
}

// 묶음에 든 곡 번호(순서대로). 프로젝트(v1.31)는 회원이 정한 순서 — 아직 자리가 없는 곡(새로 넣은 곡)은 맨 위에 최신순.
export async function GET(_request: Request, { params }: Ctx) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await params;
  const kind = await ownKind(id, access.user.id);
  if (!kind) return NextResponse.json({ error: "찾지 못했습니다." }, { status: 404 });
  const admin = createAdminClient();
  if (kind === "project") {
    const { data, error } = await admin
      .from(TRACKS_TABLE)
      .select("id")
      .eq("project_id", id)
      .eq("user_id", access.user.id)
      .order("project_position", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ track_ids: (data ?? []).map((r) => r.id) });
  }
  const { data, error } = await admin
    .from(PLAYLIST_ITEMS_TABLE)
    .select("track_id, position")
    .eq("playlist_id", id)
    .eq("user_id", access.user.id)
    .order("position");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ track_ids: (data ?? []).map((r) => r.track_id) });
}

// 플레이리스트: 담긴 곡을 통째로 바꾼다(담기·빼기·순서 바꾸기를 모두 이것 하나로). 본인 곡만 남긴다.
// 프로젝트(v1.31): 순서만 바꾼다 — 이미 이 프로젝트에 든 본인 곡의 자리만 적고, 곡을 넣거나 빼지 않는다.
export async function PUT(request: Request, { params }: Ctx) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await params;
  const uid = access.user.id;
  const kind = await ownKind(id, uid);
  if (!kind) return NextResponse.json({ error: "찾지 못했습니다." }, { status: 404 });
  const parsed = parseTrackOrder((await request.json().catch(() => null))?.track_ids);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const admin = createAdminClient();
  let ids = parsed.value;
  if (ids.length) {
    let q = admin.from(TRACKS_TABLE).select("id").eq("user_id", uid).in("id", ids);
    if (kind === "project") q = q.eq("project_id", id);
    const { data: own, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const mine = new Set((own ?? []).map((r) => r.id));
    ids = ids.filter((t) => mine.has(t));
  }
  if (kind === "project") {
    const results = await Promise.all(
      ids.map((track_id, project_position) => admin.from(TRACKS_TABLE).update({ project_position }).eq("id", track_id).eq("user_id", uid).eq("project_id", id)),
    );
    const error = results.find((r) => r.error)?.error;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ track_ids: ids });
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
