import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseSongInput, SONGS_TABLE } from "@/lib/songs";
import { isOwnProject } from "@/lib/ownProject";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const COLUMNS = "id, title, style_prompt, lyrics, duration_sec, art_prompt, project_id, created_at, updated_at";

type Ctx = { params: Promise<{ id: string }> };

// 수정·삭제는 id와 함께 user_id를 걸어 본인 곡만 바뀌게 한다.
export async function PATCH(request: Request, { params }: Ctx) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await params;
  const parsed = parseSongInput(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const admin = createAdminClient();
  if (!(await isOwnProject(admin, access.user.id, parsed.value.project_id))) return NextResponse.json({ error: "프로젝트를 찾지 못했습니다." }, { status: 404 });
  const { data, error } = await admin
    .from(SONGS_TABLE)
    .update({ ...parsed.value, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", access.user.id)
    .select(COLUMNS)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "곡을 찾지 못했습니다." }, { status: 404 });
  return NextResponse.json({ song: data });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await params;
  const { error } = await createAdminClient().from(SONGS_TABLE).delete().eq("id", id).eq("user_id", access.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
