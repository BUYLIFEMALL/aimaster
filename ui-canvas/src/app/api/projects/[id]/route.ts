import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_DOC_BYTES, cleanName, sanitizeDoc } from "@/lib/projects";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const NO_STORE = { "Cache-Control": "private, no-store" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Ctx = { params: Promise<{ id: string }> };

async function guard(ctx: Ctx) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return { error: NextResponse.json({ error: access.error }, { status: access.status, headers: NO_STORE }) };
  const { id } = await ctx.params;
  if (!UUID.test(id)) return { error: NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404, headers: NO_STORE }) };
  return { user: access.user, id };
}

export async function GET(_request: NextRequest, ctx: Ctx) {
  const g = await guard(ctx);
  if (g.error) return g.error;
  const { data } = await createAdminClient()
    .from("ui_canvas_projects")
    .select("id, name, doc, updated_at")
    .eq("id", g.id)
    .eq("user_id", g.user.id)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404, headers: NO_STORE });
  return NextResponse.json({ project: data }, { headers: NO_STORE });
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  const g = await guard(ctx);
  if (g.error) return g.error;
  const raw = await request.text();
  if (raw.length > MAX_DOC_BYTES) return NextResponse.json({ error: "프로젝트 크기가 너무 큽니다." }, { status: 413, headers: NO_STORE });
  let body: { name?: unknown; doc?: unknown; expectedUpdatedAt?: unknown };
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400, headers: NO_STORE }); }
  const admin = createAdminClient();
  const { data: current } = await admin
    .from("ui_canvas_projects")
    .select("id, updated_at")
    .eq("id", g.id)
    .eq("user_id", g.user.id)
    .maybeSingle();
  if (!current) return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404, headers: NO_STORE });
  if (typeof body.expectedUpdatedAt === "string" && new Date(body.expectedUpdatedAt).getTime() !== new Date(current.updated_at).getTime()) {
    return NextResponse.json({ error: "다른 창에서 이 프로젝트가 먼저 저장되었습니다. 새로고침 후 다시 시도해 주세요.", conflict: true }, { status: 409, headers: NO_STORE });
  }
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) patch.name = cleanName(body.name);
  if (body.doc !== undefined) {
    const doc = sanitizeDoc(body.doc);
    if (!doc) return NextResponse.json({ error: "프로젝트 데이터가 올바르지 않습니다." }, { status: 400, headers: NO_STORE });
    patch.doc = doc;
    patch.component_count = doc.components.length;
  }
  const { data, error } = await admin
    .from("ui_canvas_projects")
    .update(patch)
    .eq("id", g.id)
    .eq("user_id", g.user.id)
    .select("id, name, updated_at")
    .single();
  if (error || !data) return NextResponse.json({ error: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500, headers: NO_STORE });
  return NextResponse.json({ project: data }, { headers: NO_STORE });
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const g = await guard(ctx);
  if (g.error) return g.error;
  const { error } = await createAdminClient().from("ui_canvas_projects").delete().eq("id", g.id).eq("user_id", g.user.id);
  if (error) return NextResponse.json({ error: "삭제하지 못했습니다." }, { status: 500, headers: NO_STORE });
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
