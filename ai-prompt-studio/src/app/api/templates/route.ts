import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_TEMPLATES, TABLE, cleanTemplate, countTemplates, importTemplates, isUuid, listTemplates, toTemplate } from "@/lib/templates";

// 「📁 내 템플릿」 저장 API(2026-10-21 병합 C) — 로그인 + 프로그램 권한, 본인 행만 다룬다.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const COLS = "id, title, description, content, category, created_at";

/** GET — 내 템플릿 목록 */
export async function GET() {
  const auth = await checkProgramAccessApi();
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    return NextResponse.json({ templates: await listTemplates(auth.user.id), max: MAX_TEMPLATES });
  } catch {
    return NextResponse.json({ error: "템플릿을 불러오지 못했습니다." }, { status: 500 });
  }
}

/** POST {template} — 새로 저장 / POST {items, replace?} — 백업 파일 가져오기 */
export async function POST(req: NextRequest) {
  const auth = await checkProgramAccessApi();
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = await req.json().catch(() => null);
  try {
    if (Array.isArray(body?.items)) {
      const r = await importTemplates(auth.user.id, body.items.slice(0, MAX_TEMPLATES), body.replace === true);
      return NextResponse.json({ ...r, templates: await listTemplates(auth.user.id) });
    }
    const t = cleanTemplate(body?.template);
    if (!t) return NextResponse.json({ error: "제목과 프롬프트 본문을 입력해 주세요." }, { status: 400 });
    if ((await countTemplates(auth.user.id)) >= MAX_TEMPLATES) {
      return NextResponse.json({ error: `템플릿은 ${MAX_TEMPLATES}개까지 저장할 수 있습니다. 쓰지 않는 템플릿을 지운 뒤 저장해 주세요.` }, { status: 400 });
    }
    const { data, error } = await createAdminClient().from(TABLE).insert({ ...t, user_id: auth.user.id }).select(COLS).single();
    if (error || !data) throw error;
    return NextResponse.json({ template: toTemplate(data) });
  } catch {
    return NextResponse.json({ error: "저장하지 못했습니다." }, { status: 500 });
  }
}

/** PUT {id, template} — 내 템플릿 수정 */
export async function PUT(req: NextRequest) {
  const auth = await checkProgramAccessApi();
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = await req.json().catch(() => null);
  const t = cleanTemplate(body?.template);
  if (!isUuid(body?.id) || !t) return NextResponse.json({ error: "제목과 프롬프트 본문을 입력해 주세요." }, { status: 400 });
  const { data, error } = await createAdminClient()
    .from(TABLE)
    .update({ ...t, updated_at: new Date().toISOString() })
    .eq("user_id", auth.user.id)
    .eq("id", body.id)
    .select(COLS)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "수정하지 못했습니다." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "템플릿을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ template: toTemplate(data) });
}

/** DELETE ?id= — 내 템플릿 삭제 */
export async function DELETE(req: NextRequest) {
  const auth = await checkProgramAccessApi();
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const id = req.nextUrl.searchParams.get("id");
  if (!isUuid(id)) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  const { error } = await createAdminClient().from(TABLE).delete().eq("user_id", auth.user.id).eq("id", id);
  if (error) return NextResponse.json({ error: "삭제하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ success: true });
}
