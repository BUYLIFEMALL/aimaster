import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { createClient } from "@/lib/supabase/server";
import { generateNanoBananaImage } from "@/lib/ai/nanoBanana";
import { getUserGeminiImageModel } from "@/lib/ai/geminiModels";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const input = await request.json().catch(() => null) as { draftId?: string; topic?: string; title?: string; keywords?: string; model?: string } | null;
  const topic = input?.topic?.trim() ?? "";
  const draftId = input?.draftId?.trim() ?? "";
  if (!topic || topic.length > 300) return NextResponse.json({ error: "이미지 주제를 1~300자로 입력해주세요." }, { status: 400 });
  if (!draftId) return NextResponse.json({ error: "이미지를 저장할 초안을 먼저 선택해주세요." }, { status: 400 });
  const supabase = await createClient();
  const apiKey = await resolveApiKey(supabase, access.user.id, "gemini");
  if (!apiKey) return NextResponse.json({ code: "API_KEY_REQUIRED", error: "나노바나나 이미지 생성을 위해 Gemini API 키를 먼저 등록해주세요." }, { status: 400 });
  try {
    const { data: draft, error: draftError } = await supabase.from("naver_blog_seo_drafts")
      .select("id, image_path")
      .eq("id", draftId).eq("user_id", access.user.id)
      .maybeSingle();
    if (draftError || !draft) return NextResponse.json({ error: "이미지를 저장할 내 초안을 찾지 못했습니다." }, { status: 404 });
    const image = await generateNanoBananaImage({ apiKey, topic, title: input?.title, keywords: input?.keywords, model: input?.model ?? getUserGeminiImageModel(access.user.user_metadata) });
    const extension = image.mimeType === "image/jpeg" ? "jpg" : "png";
    const imagePath = `${access.user.id}/${draftId}/${Date.now()}.${extension}`;
    const bytes = Uint8Array.from(Buffer.from(image.base64, "base64"));
    const { error: uploadError } = await supabase.storage.from("naver-blog-seo-images").upload(imagePath, bytes, { contentType: image.mimeType, upsert: false });
    if (uploadError) return NextResponse.json({ error: "생성한 대표 이미지를 저장하지 못했습니다." }, { status: 500 });
    const { error: updateError } = await supabase.from("naver_blog_seo_drafts")
      .update({ image_path: imagePath, image_model: image.model, image_mime_type: image.mimeType, image_created_at: new Date().toISOString() })
      .eq("id", draftId).eq("user_id", access.user.id);
    if (updateError) {
      await supabase.storage.from("naver-blog-seo-images").remove([imagePath]);
      return NextResponse.json({ error: "대표 이미지 정보를 초안에 저장하지 못했습니다." }, { status: 500 });
    }
    if (draft.image_path) await supabase.storage.from("naver-blog-seo-images").remove([draft.image_path]);
    return NextResponse.json({ image: { dataUrl: `data:${image.mimeType};base64,${image.base64}`, mimeType: image.mimeType, model: image.model, path: imagePath } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "이미지 생성에 실패했습니다." }, { status: 502 });
  }
}
