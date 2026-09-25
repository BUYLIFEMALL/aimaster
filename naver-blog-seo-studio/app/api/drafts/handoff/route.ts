import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const input = await request.json().catch(() => null) as { draftId?: string } | null;
  const draftId = input?.draftId?.trim();
  if (!draftId) return NextResponse.json({ error: "전송할 초안을 선택해주세요." }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.from("naver_blog_seo_drafts")
    .update({ extension_handoff_at: new Date().toISOString(), extension_imported_at: null })
    .eq("id", draftId).eq("user_id", access.user.id)
    .select("id, title, extension_handoff_at").maybeSingle();
  if (error) return NextResponse.json({ error: "확장 프로그램 전송 준비에 실패했습니다." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "본인 초안을 찾지 못했습니다." }, { status: 404 });
  return NextResponse.json({ handoff: data });
}
