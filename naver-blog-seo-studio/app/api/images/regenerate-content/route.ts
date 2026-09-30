import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { generateNanoBananaImage } from "@/lib/ai/nanoBanana";
import { getUserGeminiImageModel } from "@/lib/ai/geminiModels";
import { CONTENT_IMAGE_SLOTS, type ContentVisual } from "@/lib/ai/contentVisuals";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

  const input = await request.json().catch(() => null) as { draftId?: string; slot?: string } | null;
  const draftId = input?.draftId?.trim() ?? "";
  const slot = input?.slot ?? "";
  if (!draftId || !CONTENT_IMAGE_SLOTS.includes(slot as typeof CONTENT_IMAGE_SLOTS[number])) {
    return NextResponse.json({ error: "다시 생성할 본문 이미지를 확인해주세요." }, { status: 400 });
  }

  const supabase = await createClient();
  const apiKey = await resolveApiKey(supabase, access.user.id, "gemini");
  if (!apiKey) return NextResponse.json({ code: "API_KEY_REQUIRED", error: "본문 이미지를 다시 생성하려면 Gemini API 키를 먼저 등록해주세요." }, { status: 400 });

  const { data: draft, error: draftError } = await supabase.from("naver_blog_seo_drafts")
    .select("id, topic, title, keywords, seo_report")
    .eq("id", draftId).eq("user_id", access.user.id).maybeSingle();
  if (draftError || !draft) return NextResponse.json({ error: "이미지를 다시 생성할 내 블로그(원문)을 찾지 못했습니다." }, { status: 404 });

  const report = typeof draft.seo_report === "object" && draft.seo_report !== null ? draft.seo_report as Record<string, unknown> : {};
  const contentImages = Array.isArray(report.contentImages) ? report.contentImages as ContentVisual[] : [];
  const current = contentImages.find((image) => image.slot === slot);
  if (!current?.sentence || !current.prompt) return NextResponse.json({ error: "이 이미지의 기준 문장을 찾지 못했습니다. 본문 이미지를 다시 생성해주세요." }, { status: 400 });

  try {
    const image = await generateNanoBananaImage({
      apiKey,
      topic: draft.topic,
      title: draft.title,
      keywords: Array.isArray(draft.keywords) ? draft.keywords.join(", ") : "",
      model: getUserGeminiImageModel(access.user.user_metadata),
      sceneDescription: current.prompt,
    });
    const extension = image.mimeType === "image/jpeg" ? "jpg" : "png";
    const path = `${access.user.id}/${draftId}/${slot}-${Date.now()}.${extension}`;
    const bytes = Uint8Array.from(Buffer.from(image.base64, "base64"));
    const { error: uploadError } = await supabase.storage.from("naver-blog-seo-images").upload(path, bytes, { contentType: image.mimeType, upsert: false });
    if (uploadError) throw new Error("생성한 본문 이미지를 저장하지 못했습니다.");

    const replacement: ContentVisual = { ...current, path, mimeType: image.mimeType, model: image.model };
    const updatedImages = contentImages.map((item) => item.slot === slot ? replacement : item);
    const { error: updateError } = await supabase.from("naver_blog_seo_drafts")
      .update({ seo_report: { ...report, contentImages: updatedImages } })
      .eq("id", draftId).eq("user_id", access.user.id);
    if (updateError) {
      await supabase.storage.from("naver-blog-seo-images").remove([path]);
      throw new Error("새 본문 이미지 정보를 저장하지 못했습니다.");
    }
    if (current.path) await supabase.storage.from("naver-blog-seo-images").remove([current.path]);
    return NextResponse.json({ image: replacement });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "본문 이미지를 다시 생성하지 못했습니다." }, { status: 502 });
  }
}
