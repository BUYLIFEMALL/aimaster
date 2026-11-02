import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

const IMAGE_BUCKET = "naver-blog-seo-images";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(_request: Request, context: { params: Promise<{ draftId: string }> }) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const { draftId } = await context.params;
  const supabase = await createClient();
  const { data: original, error: findError } = await supabase.from("naver_blog_seo_drafts")
    .select("topic, keywords, strategy, title, body, seo_report, category_id, naver_category, created_at, image_path, image_model, image_mime_type, image_created_at")
    .eq("id", draftId).eq("user_id", access.user.id)
    .maybeSingle();
  if (findError || !original) return NextResponse.json({ error: "복제할 내 초안을 찾지 못했습니다." }, { status: 404 });

  const copiedTitle = `${original.title} (복사본)`.slice(0, 150);
  const sourceReport = typeof original.seo_report === "object" && original.seo_report !== null ? original.seo_report as Record<string, unknown> : {};
  const copiedReport: Record<string, unknown> = Object.fromEntries(Object.entries(sourceReport).filter(([key]) => !["contentImages", "autoPublish", "saveRevision", "grounding", "style"].includes(key)));
  // 2026-11-02: 대표·본문 이미지도 함께 복제한다. 파일은 원고마다 지워지므로 같은 파일을 가리키지 않고 새 원고 폴더로 복사한다.
  // 복사하지 못한 이미지는 그 칸만 빼고(문단의 이미지 자리는 화면·확장이 빈 칸으로 처리) 빠진 장수를 알린다.
  const draftCopyId = randomUUID();
  const bucket = supabase.storage.from(IMAGE_BUCKET);
  const copiedPaths: string[] = [];
  const copyImage = async (path: unknown) => {
    if (typeof path !== "string" || !path.startsWith(`${access.user.id}/`)) return null;
    const target = `${access.user.id}/${draftCopyId}/${path.split("/").pop()}`;
    const { error: copyError } = await bucket.copy(path, target);
    if (copyError) return null;
    copiedPaths.push(target);
    return target;
  };
  const coverPath = original.image_path ? await copyImage(original.image_path) : null;
  const sourceImages = Array.isArray(sourceReport.contentImages) ? sourceReport.contentImages as Array<Record<string, unknown>> : [];
  const contentImages: Array<Record<string, unknown>> = [];
  for (const image of sourceImages) {
    if (!image || typeof image !== "object" || typeof image.path !== "string") continue;
    const path = await copyImage(image.path);
    if (path) contentImages.push({ ...image, path });
  }
  if (contentImages.length) copiedReport.contentImages = contentImages;
  const missingImages = (original.image_path && !coverPath ? 1 : 0) + sourceImages.filter((image) => typeof image?.path === "string").length - contentImages.length;
  const { data, error } = await supabase.from("naver_blog_seo_drafts")
    .insert({
      id: draftCopyId,
      user_id: access.user.id,
      topic: original.topic,
      keywords: original.keywords,
      strategy: original.strategy,
      title: copiedTitle,
      body: original.body,
      seo_report: copiedReport,
      created_at: original.created_at,
      status: "ready",
      naver_input_status: "not_started",
      category_id: original.category_id ?? null,
      naver_category: original.naver_category ?? null,
      ...(coverPath ? { image_path: coverPath, image_model: original.image_model, image_mime_type: original.image_mime_type, image_created_at: original.image_created_at } : {}),
    })
    .select("id, topic, keywords, strategy, title, body, seo_report, created_at, image_path, image_model, image_mime_type, naver_input_status, naver_input_completed_at, naver_input_error, category_id, naver_category")
    .single();
  if (error && copiedPaths.length) await bucket.remove(copiedPaths);
  if (error) return NextResponse.json({ error: "초안을 복제하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ draft: data, missingImages });
}
