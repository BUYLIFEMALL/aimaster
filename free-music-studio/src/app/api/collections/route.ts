import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { COLLECTIONS_TABLE, PLAYLIST_ITEMS_TABLE, parseCollectionName, parseKind } from "@/lib/collections";
import { TRACKS_TABLE } from "@/lib/tracks";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 내 프로젝트·플레이리스트 목록(곡 수 포함). 서비스 키로 읽으므로 user_id를 코드에서 직접 건다.
export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const admin = createAdminClient();
  const uid = access.user.id;
  const [cols, tracks, items] = await Promise.all([
    admin.from(COLLECTIONS_TABLE).select("id, kind, name, created_at").eq("user_id", uid).order("created_at").limit(200),
    admin.from(TRACKS_TABLE).select("id, project_id, trashed_at").eq("user_id", uid).limit(5000),
    admin.from(PLAYLIST_ITEMS_TABLE).select("playlist_id, track_id").eq("user_id", uid).limit(20000),
  ]);
  const error = cols.error || tracks.error || items.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // 곡 수에는 휴지통 곡을 넣지 않는다(2026-11-06 휴지통)
  const trashed = new Set((tracks.data ?? []).filter((t) => t.trashed_at).map((t) => t.id));
  const count = new Map<string, number>();
  for (const t of tracks.data ?? []) if (t.project_id && !t.trashed_at) count.set(t.project_id, (count.get(t.project_id) ?? 0) + 1);
  for (const i of items.data ?? []) if (!trashed.has(i.track_id)) count.set(i.playlist_id, (count.get(i.playlist_id) ?? 0) + 1);
  const all = (cols.data ?? []).map((c) => ({ ...c, count: count.get(c.id) ?? 0 }));
  return NextResponse.json({ projects: all.filter((c) => c.kind === "project"), playlists: all.filter((c) => c.kind === "playlist"), trashCount: trashed.size });
}

export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const body = await request.json().catch(() => null);
  const kind = parseKind(body?.kind);
  const name = parseCollectionName(body?.name);
  if (!kind) return NextResponse.json({ error: "종류가 올바르지 않습니다." }, { status: 400 });
  if (!name.ok) return NextResponse.json({ error: name.error }, { status: 400 });
  const { data, error } = await createAdminClient()
    .from(COLLECTIONS_TABLE)
    .insert({ user_id: access.user.id, kind, name: name.value })
    .select("id, kind, name, created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ collection: { ...data, count: 0 } });
}
