import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { clampValues, trimField } from "@/lib/persona/prompt";
import { LIMITS } from "@/lib/persona/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const MAX_DRAFTS = 200;

/** GET — 내 저장 초안 목록(최근순, 본문 포함) */
export async function GET() {
  const auth = await checkProgramAccessApi();
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { data, error } = await createAdminClient()
    .from("persona_style_drafts")
    .select("id, title, content, eq_values, persona_key, created_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(MAX_DRAFTS);
  if (error) return NextResponse.json({ error: "초안을 불러오지 못했습니다." }, { status: 500 });
  return NextResponse.json({ drafts: data });
}

/** POST — 초안 저장 */
export async function POST(req: NextRequest) {
  const auth = await checkProgramAccessApi();
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = await req.json().catch(() => null);
  const content = trimField(body?.content, LIMITS.text);
  if (!content) return NextResponse.json({ error: "저장할 글이 없습니다." }, { status: 400 });
  const admin = createAdminClient();
  const { count } = await admin
    .from("persona_style_drafts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", auth.user.id);
  if ((count ?? 0) >= MAX_DRAFTS) {
    return NextResponse.json({ error: `초안은 ${MAX_DRAFTS}개까지 저장할 수 있습니다. 오래된 초안을 삭제해 주세요.` }, { status: 400 });
  }
  const { data, error } = await admin
    .from("persona_style_drafts")
    .insert({
      user_id: auth.user.id,
      title: trimField(body?.title, 80) || content.slice(0, 30),
      content,
      eq_values: body?.values ? clampValues(body.values) : null,
      persona_key: trimField(body?.personaKey, 60) || null,
    })
    .select("id, title, created_at")
    .single();
  if (error) return NextResponse.json({ error: "저장하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ draft: data });
}

/** DELETE ?id= — 내 초안 삭제 */
export async function DELETE(req: NextRequest) {
  const auth = await checkProgramAccessApi();
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  const { error } = await createAdminClient().from("persona_style_drafts").delete().eq("user_id", auth.user.id).eq("id", id);
  if (error) return NextResponse.json({ error: "삭제하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ success: true });
}
