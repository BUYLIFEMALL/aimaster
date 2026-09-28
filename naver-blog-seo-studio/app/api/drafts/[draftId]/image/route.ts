import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: Request, context: { params: Promise<{ draftId: string }> }) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const { draftId } = await context.params;
  const supabase = await createClient();
  const { data: draft, error } = await supabase.from("naver_blog_seo_drafts")
    .select("image_path, image_mime_type, seo_report")
    .eq("id", draftId).eq("user_id", access.user.id)
    .maybeSingle();
  if (error || !draft) return NextResponse.json({ error: "저장된 초안 이미지를 찾지 못했습니다." }, { status: 404 });
  const slot = new URL(request.url).searchParams.get("slot");
  const contentImages = typeof draft.seo_report === "object" && draft.seo_report !== null && Array.isArray((draft.seo_report as { contentImages?: unknown }).contentImages)
    ? (draft.seo_report as { contentImages: Array<{ slot?: string; path?: string; mimeType?: string }> }).contentImages : [];
  const contentImage = slot ? contentImages.find((item) => item.slot === slot) : null;
  const path = contentImage?.path ?? draft.image_path;
  const mimeType = contentImage?.mimeType ?? draft.image_mime_type;
  if (!path) return NextResponse.json({ error: slot ? "저장된 본문 이미지가 없습니다." : "저장된 대표 이미지가 없습니다." }, { status: 404 });
  const { data: image, error: downloadError } = await supabase.storage.from("naver-blog-seo-images").download(path);
  if (downloadError || !image) return NextResponse.json({ error: "저장된 대표 이미지를 불러오지 못했습니다." }, { status: 404 });
  return new NextResponse(image, { headers: { "Content-Type": mimeType || image.type || "image/png", "Cache-Control": "private, max-age=300" } });
}
