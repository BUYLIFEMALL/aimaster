import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { createClient } from "@/lib/supabase/server";
import { generateNanoBananaImage } from "@/lib/ai/nanoBanana";
import { resolveGeminiImageModel } from "@/lib/ai/geminiModels";
import { resolveOpenAIContentModel } from "@/lib/ai/openaiModels";
import { selectContentVisuals, type ContentVisual } from "@/lib/ai/contentVisuals";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type SeoReport = Record<string, unknown>;

export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const input = await request.json().catch(() => null) as { draftId?: string; count?: number; model?: unknown } | null;
  const draftId = input?.draftId?.trim();
  const count = input?.count === 3 ? 3 : input?.count === 2 || input?.count === undefined ? 2 : null;
  if (!count) return NextResponse.json({ error: "본문 이미지는 2장 또는 3장만 생성할 수 있습니다." }, { status: 400 });
  if (!draftId) return NextResponse.json({ error: "본문 이미지를 저장할 초안을 먼저 선택해주세요." }, { status: 400 });
  const supabase = await createClient();
  console.info("[generate-content-images] request received", { draftId, userId: access.user.id });
  const [openaiKey, geminiKey] = await Promise.all([
    resolveApiKey(supabase, access.user.id, "openai"),
    resolveApiKey(supabase, access.user.id, "gemini"),
  ]);
  if (!openaiKey) return NextResponse.json({ code: "API_KEY_REQUIRED", error: "본문 핵심 문장 분석을 위해 OpenAI API 키를 먼저 등록해주세요." }, { status: 400 });
  if (!geminiKey) return NextResponse.json({ code: "API_KEY_REQUIRED", error: "본문 매칭 이미지 생성을 위해 Gemini API 키를 먼저 등록해주세요." }, { status: 400 });
  const { data: draft, error: draftError } = await supabase.from("naver_blog_seo_drafts")
    .select("id, topic, title, body, keywords, seo_report")
    .eq("id", draftId).eq("user_id", access.user.id).maybeSingle();
  if (draftError || !draft) return NextResponse.json({ error: "본문 이미지를 저장할 내 초안을 찾지 못했습니다." }, { status: 404 });
  try {
    const visuals = await selectContentVisuals({ apiKey: openaiKey, topic: draft.topic, title: draft.title, body: draft.body, count, model: resolveOpenAIContentModel(access.user.user_metadata?.naver_blog_seo_openai_model as string | undefined) });
    const imageModel = resolveGeminiImageModel(input?.model);
    const generated: ContentVisual[] = [];
    for (const visual of visuals) {
      console.info("[generate-content-images] generating image", { draftId, slot: visual.slot });
      const image = await generateNanoBananaImage({ apiKey: geminiKey, topic: draft.topic, title: draft.title, keywords: Array.isArray(draft.keywords) ? draft.keywords.join(", ") : "", model: imageModel, sceneDescription: visual.prompt });
      const extension = image.mimeType === "image/jpeg" ? "jpg" : "png";
      const path = `${access.user.id}/${draftId}/${visual.slot}-${Date.now()}.${extension}`;
      const bytes = Uint8Array.from(Buffer.from(image.base64, "base64"));
      const { error: uploadError } = await supabase.storage.from("naver-blog-seo-images").upload(path, bytes, { contentType: image.mimeType, upsert: false });
      if (uploadError) throw new Error("생성한 본문 이미지를 저장하지 못했습니다.");
      generated.push({ ...visual, path, mimeType: image.mimeType, model: image.model });
    }
    const report: SeoReport = typeof draft.seo_report === "object" && draft.seo_report !== null ? draft.seo_report as SeoReport : {};
    const previous = Array.isArray(report.contentImages) ? report.contentImages as ContentVisual[] : [];
    const { error: updateError } = await supabase.from("naver_blog_seo_drafts").update({ seo_report: { ...report, contentImages: generated } }).eq("id", draftId).eq("user_id", access.user.id);
    if (updateError) throw new Error("본문 이미지 정보를 초안에 저장하지 못했습니다.");
    const stalePaths = previous.map((item) => item.path).filter((path): path is string => Boolean(path));
    if (stalePaths.length) await supabase.storage.from("naver-blog-seo-images").remove(stalePaths);
    console.info("[generate-content-images] completed", { draftId, count: generated.length });
    return NextResponse.json({ images: generated.map((item) => ({ ...item, dataUrl: undefined })) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "본문 매칭 이미지 생성에 실패했습니다.";
    console.error("[generate-content-images] failed", { draftId, message, stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
