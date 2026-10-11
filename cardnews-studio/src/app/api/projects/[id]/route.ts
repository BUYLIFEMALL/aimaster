import { NextResponse } from "next/server";
import { authorize } from "@/lib/cardnews/apiGuard";
import { collectImagePaths, removedImagePaths, sanitizeProject } from "@/lib/cardnews/sanitize";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProjectData } from "@/lib/cardnews/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const MAX_BODY = 300_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Ctx = { params: Promise<{ id: string }> };

async function idOf(ctx: Ctx): Promise<string | null> {
  const { id } = await ctx.params;
  return UUID.test(id) ? id : null;
}

export async function GET(_req: Request, ctx: Ctx) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const id = await idOf(ctx);
  if (!id) return NextResponse.json({ error: "프로젝트 주소가 올바르지 않습니다." }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.from("cns_projects").select("id, data, updated_at").eq("id", id).eq("user_id", gate.auth.user.id).maybeSingle();
  if (error) return NextResponse.json({ error: "프로젝트를 불러오지 못했습니다." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ id: data.id, data: data.data, updatedAt: data.updated_at });
}

export async function PUT(request: Request, ctx: Ctx) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const userId = gate.auth.user.id;
  const id = await idOf(ctx);
  if (!id) return NextResponse.json({ error: "프로젝트 주소가 올바르지 않습니다." }, { status: 400 });

  const text = await request.text();
  if (text.length > MAX_BODY) return NextResponse.json({ error: "프로젝트 데이터가 너무 큽니다." }, { status: 413 });
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }
  const checked = sanitizeProject(raw, { supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!, userId });
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });

  const supabase = await createClient();
  const { data: previous } = await supabase.from("cns_projects").select("data").eq("id", id).eq("user_id", userId).maybeSingle();
  const { data, error } = await supabase
    .from("cns_projects")
    .update({ title: checked.data.title, data: checked.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id, updated_at")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "프로젝트를 저장하지 못했습니다." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });

  // 이력(최대 6개)에서 밀려나 더 이상 쓰이지 않는 내 이미지 파일을 저장소에서 지운다(실패해도 저장은 완료).
  try {
    if (previous?.data) {
      const paths = removedImagePaths(previous.data as ProjectData, checked.data, process.env.NEXT_PUBLIC_SUPABASE_URL!, userId);
      if (paths.length) await createAdminClient().storage.from("cardnews-images").remove(paths);
    }
  } catch {
    /* 정리 실패는 무시 */
  }
  return NextResponse.json({ id: data.id, updatedAt: data.updated_at });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const userId = gate.auth.user.id;
  const id = await idOf(ctx);
  if (!id) return NextResponse.json({ error: "프로젝트 주소가 올바르지 않습니다." }, { status: 400 });

  const supabase = await createClient();
  const { data: row } = await supabase.from("cns_projects").select("data").eq("id", id).eq("user_id", userId).maybeSingle();
  if (!row) return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });

  const { error } = await supabase.from("cns_projects").delete().eq("id", id).eq("user_id", userId);
  if (error) return NextResponse.json({ error: "프로젝트를 삭제하지 못했습니다." }, { status: 500 });

  // 이 프로젝트가 쓰던 내 이미지 파일을 정리한다(실패해도 삭제는 완료된 것으로 본다).
  try {
    const paths = collectImagePaths(row.data as ProjectData, process.env.NEXT_PUBLIC_SUPABASE_URL!, userId);
    if (paths.length) await createAdminClient().storage.from("cardnews-images").remove(paths);
  } catch {
    /* 이미지 정리 실패는 무시 */
  }
  return NextResponse.json({ success: true });
}
