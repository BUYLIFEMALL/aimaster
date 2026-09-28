import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(_request: Request, context: { params: Promise<{ draftId: string }> }) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const { draftId } = await context.params;
  const supabase = await createClient();
  const { data: original, error: findError } = await supabase.from("naver_blog_seo_drafts")
    .select("topic, keywords, strategy, title, body, seo_report")
    .eq("id", draftId).eq("user_id", access.user.id)
    .maybeSingle();
  if (findError || !original) return NextResponse.json({ error: "복제할 내 초안을 찾지 못했습니다." }, { status: 404 });

  const copiedTitle = `${original.title} (복사본)`.slice(0, 150);
  const { data, error } = await supabase.from("naver_blog_seo_drafts")
    .insert({
      user_id: access.user.id,
      topic: original.topic,
      keywords: original.keywords,
      strategy: original.strategy,
      title: copiedTitle,
      body: original.body,
      seo_report: original.seo_report ?? {},
      status: "ready",
      naver_input_status: "not_started",
    })
    .select("id, topic, keywords, strategy, title, body, seo_report, created_at, image_path, image_model, image_mime_type, naver_input_status, naver_input_completed_at, naver_input_error")
    .single();
  if (error) return NextResponse.json({ error: "초안을 복제하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ draft: data });
}
