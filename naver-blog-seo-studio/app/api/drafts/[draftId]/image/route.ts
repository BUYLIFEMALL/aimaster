import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(_request: Request, context: { params: Promise<{ draftId: string }> }) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const { draftId } = await context.params;
  const supabase = await createClient();
  const { data: draft, error } = await supabase.from("naver_blog_seo_drafts")
    .select("image_path, image_mime_type")
    .eq("id", draftId).eq("user_id", access.user.id)
    .maybeSingle();
  if (error || !draft?.image_path) return NextResponse.json({ error: "저장된 대표 이미지가 없습니다." }, { status: 404 });
  const { data: image, error: downloadError } = await supabase.storage.from("naver-blog-seo-images").download(draft.image_path);
  if (downloadError || !image) return NextResponse.json({ error: "저장된 대표 이미지를 불러오지 못했습니다." }, { status: 404 });
  return new NextResponse(image, { headers: { "Content-Type": draft.image_mime_type || image.type || "image/png", "Cache-Control": "private, max-age=300" } });
}
