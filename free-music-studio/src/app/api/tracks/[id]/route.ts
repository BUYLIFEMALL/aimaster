import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { TRACKS_TABLE, parseTrackPatch } from "@/lib/tracks";
import { COLLECTIONS_TABLE, isUuid } from "@/lib/collections";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Ctx = { params: Promise<{ id: string }> };

// 곡 기록 고치기 — { project_id?: uuid | null, title?, lyrics? } 보낸 칸만. 프로젝트는 본인 것만 받는다.
export async function PATCH(request: Request, { params }: Ctx) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await params;
  const parsed = parseTrackPatch(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const projectId = parsed.value.project_id ?? null;
  const admin = createAdminClient();
  if (projectId !== null) {
    if (!isUuid(projectId)) return NextResponse.json({ error: "프로젝트가 올바르지 않습니다." }, { status: 400 });
    const { data: own } = await admin
      .from(COLLECTIONS_TABLE)
      .select("id")
      .eq("id", projectId)
      .eq("user_id", access.user.id)
      .eq("kind", "project")
      .maybeSingle();
    if (!own) return NextResponse.json({ error: "프로젝트를 찾지 못했습니다." }, { status: 404 });
  }
  const { data, error } = await admin
    .from(TRACKS_TABLE)
    // 프로젝트를 바꾸면 그 프로젝트 안 자리(v1.31)는 비운다 — 새 프로젝트에서는 맨 위에 보인다
    .update("project_id" in parsed.value ? { ...parsed.value, project_position: null } : parsed.value)
    .eq("id", id)
    .eq("user_id", access.user.id)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "곡을 찾지 못했습니다." }, { status: 404 });
  return NextResponse.json({ success: true });
}

// 기록 지우기 — id와 user_id를 함께 걸어 본인 곡만. 내 PC 음원 파일은 화면이 엔진에 따로 지우라고 보낸다.
export async function DELETE(_request: Request, { params }: Ctx) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await params;
  const { error } = await createAdminClient().from(TRACKS_TABLE).delete().eq("id", id).eq("user_id", access.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
