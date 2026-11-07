import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { ALBUMS_TABLE, parseAlbumTitle } from "@/lib/albums";
import { isUuid } from "@/lib/collections";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Ctx = { params: Promise<{ id: string }> };

// 앨범 이름 바꾸기·지우기(v1.35) — id와 user_id를 함께 걸어 본인 앨범만. 그림 파일은 화면이 엔진에 따로 지우라고 보낸다.
export async function PATCH(request: Request, { params }: Ctx) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "앨범을 찾지 못했습니다." }, { status: 404 });
  const title = parseAlbumTitle((await request.json().catch(() => null))?.title);
  if (!title.ok) return NextResponse.json({ error: title.error }, { status: 400 });
  const { data, error } = await createAdminClient()
    .from(ALBUMS_TABLE)
    .update({ title: title.value })
    .eq("id", id)
    .eq("user_id", access.user.id)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "앨범을 찾지 못했습니다." }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "앨범을 찾지 못했습니다." }, { status: 404 });
  const { error } = await createAdminClient().from(ALBUMS_TABLE).delete().eq("id", id).eq("user_id", access.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
