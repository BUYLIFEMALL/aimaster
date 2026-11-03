import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { COLLECTIONS_TABLE, parseCollectionName } from "@/lib/collections";

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

// 지우기 — 프로젝트면 곡은 남고 묶음만 풀린다(FK set null), 플레이리스트면 담긴 줄만 지워진다(cascade).
export async function DELETE(_request: Request, { params }: Ctx) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await params;
  const { error } = await createAdminClient().from(COLLECTIONS_TABLE).delete().eq("id", id).eq("user_id", access.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
