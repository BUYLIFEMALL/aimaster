import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomUUID } from "node:crypto";
import { COLLECTIONS_TABLE, parseCollectionName } from "@/lib/collections";
import { TRACKS_TABLE } from "@/lib/tracks";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Ctx = { params: Promise<{ id: string }> };

// 이름 바꾸기 — id와 user_id를 함께 걸어 본인 것만.
export async function PATCH(request: Request, { params }: Ctx) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await params;
  const name = parseCollectionName((await request.json().catch(() => null))?.name);
  if (!name.ok) return NextResponse.json({ error: name.error }, { status: 400 });
  const { data, error } = await createAdminClient()
    .from(COLLECTIONS_TABLE)
    .update({ name: name.value })
    .eq("id", id)
    .eq("user_id", access.user.id)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "찾지 못했습니다." }, { status: 404 });
  return NextResponse.json({ success: true });
}

// 지우기 — 프로젝트면 그 곡들은 휴지통으로(원본 boks-music deleteProject, 2026-11-06) 간 뒤 묶음이 풀린다(FK set null),
// 플레이리스트면 담긴 줄만 지워진다(cascade).
export async function DELETE(_request: Request, { params }: Ctx) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await params;
  const admin = createAdminClient();
  const { data: own } = await admin.from(COLLECTIONS_TABLE).select("id, kind").eq("id", id).eq("user_id", access.user.id).maybeSingle();
  if (!own) return NextResponse.json({ error: "찾지 못했습니다." }, { status: 404 });
  let trashed = 0;
  if (own.kind === "project") {
    const { data, error } = await admin
      .from(TRACKS_TABLE)
      .update({ trashed_at: new Date().toISOString(), trash_batch_id: randomUUID() })
      .eq("user_id", access.user.id)
      .eq("project_id", id)
      .is("trashed_at", null)
      .select("id");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    trashed = data?.length ?? 0;
  }
  const { error } = await admin.from(COLLECTIONS_TABLE).delete().eq("id", id).eq("user_id", access.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, trashed });
}
