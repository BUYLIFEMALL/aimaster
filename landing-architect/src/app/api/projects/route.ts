import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { EMPTY_DOC, MAX_BODY_BYTES, MAX_PROJECTS, cleanName, sanitizeDoc, stageOf } from "@/lib/projects";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status, headers: NO_STORE });
  const { data, error } = await createAdminClient()
    .from("landing_architect_projects")
    .select("id, name, stage, created_at, updated_at")
    .eq("user_id", access.user.id)
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: "프로젝트 목록을 불러오지 못했습니다." }, { status: 500, headers: NO_STORE });
  return NextResponse.json({ projects: data ?? [] }, { headers: NO_STORE });
}

export async function POST(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status, headers: NO_STORE });
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: "프로젝트 크기가 너무 큽니다." }, { status: 413, headers: NO_STORE });
  let body: { name?: unknown; doc?: unknown } = {};
  try { body = raw ? JSON.parse(raw) : {}; } catch { return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400, headers: NO_STORE }); }
  const doc = body.doc === undefined ? EMPTY_DOC : sanitizeDoc(body.doc);
  if (!doc) return NextResponse.json({ error: "프로젝트 데이터가 올바르지 않습니다." }, { status: 400, headers: NO_STORE });
  const admin = createAdminClient();
  const { count } = await admin.from("landing_architect_projects").select("id", { count: "exact", head: true }).eq("user_id", access.user.id);
  if ((count ?? 0) >= MAX_PROJECTS) {
    return NextResponse.json({ error: `프로젝트는 최대 ${MAX_PROJECTS}개까지 저장할 수 있습니다. 쓰지 않는 프로젝트를 삭제해 주세요.` }, { status: 409, headers: NO_STORE });
  }
  const { data, error } = await admin
    .from("landing_architect_projects")
    .insert({ user_id: access.user.id, name: cleanName(body.name), inputs: doc.inputs, plan: doc.plan, html: doc.html, stage: stageOf(doc) })
    .select("id, name, updated_at")
    .single();
  if (error || !data) return NextResponse.json({ error: "프로젝트를 만들지 못했습니다." }, { status: 500, headers: NO_STORE });
  return NextResponse.json({ project: data }, { status: 201, headers: NO_STORE });
}
