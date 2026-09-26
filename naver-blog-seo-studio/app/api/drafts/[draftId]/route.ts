import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function PATCH(request: Request, context: { params: Promise<{ draftId: string }> }) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

  const { draftId } = await context.params;
  const input = await request.json().catch(() => null) as { title?: string; body?: string } | null;
  const title = input?.title?.trim() ?? "";
  const body = input?.body?.trim() ?? "";
  if (!title || title.length > 150) return NextResponse.json({ error: "제목을 1~150자로 입력해주세요." }, { status: 400 });
  if (body.length < 120 || body.length > 30000) return NextResponse.json({ error: "본문을 120~30,000자로 입력해주세요." }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.from("naver_blog_seo_drafts")
    .update({ title, body })
    .eq("id", draftId).eq("user_id", access.user.id)
    .select("id, topic, keywords, strategy, title, body, seo_report, created_at, naver_input_status, naver_input_completed_at, naver_input_error")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "초안 저장에 실패했습니다." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "수정할 내 초안을 찾지 못했습니다." }, { status: 404 });
  return NextResponse.json({ draft: data });
}
