import { NextResponse } from "next/server";
import { verifyExtensionToken } from "@/lib/extensionAuth";
import { createServiceClient } from "@/lib/supabase/service";

const IMAGE_BUCKET = "naver-blog-seo-images";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: Request, context: { params: Promise<{ draftId: string }> }) {
  const user = await verifyExtensionToken(request);
  if (!user) return NextResponse.json({ error: "유효하지 않은 연결 토큰이거나 이용 권한이 없습니다." }, { status: 401 });

  const { draftId } = await context.params;
  const supabase = createServiceClient();
  const { data: draft, error } = await supabase
    .from("naver_blog_seo_drafts")
    .select("image_path, image_mime_type")
    .eq("id", draftId)
    .eq("user_id", user.userId)
    .not("extension_handoff_at", "is", null)
    .maybeSingle();

  if (error || !draft) return NextResponse.json({ error: "불러올 수 없는 웹 초안입니다." }, { status: 404 });
  if (!draft.image_path) return NextResponse.json({ error: "저장된 대표 이미지가 없습니다." }, { status: 404 });

  const { data: image, error: imageError } = await supabase.storage.from(IMAGE_BUCKET).download(draft.image_path);
  if (imageError || !image) return NextResponse.json({ error: "저장된 대표 이미지를 불러오지 못했습니다." }, { status: 404 });

  return new NextResponse(image, {
    headers: {
      "Content-Type": draft.image_mime_type || image.type || "image/png",
      "Cache-Control": "private, no-store",
    },
  });
}