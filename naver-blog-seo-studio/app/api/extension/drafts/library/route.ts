import { NextResponse } from "next/server";
import { verifyExtensionToken } from "@/lib/extensionAuth";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: Request) {
  const user = await verifyExtensionToken(request);
  if (!user) return NextResponse.json({ error: "유효하지 않은 연동 토큰이거나 이용 권한이 없습니다." }, { status: 401 });
  const { data, error } = await createServiceClient().from("naver_blog_seo_drafts")
    .select("id, topic, keywords, strategy, title, body, image_path, image_model, image_mime_type, seo_report, extension_handoff_at, naver_input_status")
    .eq("user_id", user.userId).not("extension_handoff_at", "is", null)
    .order("extension_handoff_at", { ascending: false }).limit(20);
  if (error) return NextResponse.json({ error: "웹 초안 목록을 불러오지 못했습니다." }, { status: 500 });
  const drafts = (data ?? []).map((draft) => {
    const report = typeof draft.seo_report === "object" && draft.seo_report !== null ? draft.seo_report as { contentImages?: unknown } : {};
    const contentImages = Array.isArray(report.contentImages) ? report.contentImages
      .filter((item): item is { slot?: string; sentence?: string } => typeof item === "object" && item !== null)
      .map((item) => ({ slot: item.slot, sentence: item.sentence })) : [];
    return {
      id: draft.id, topic: draft.topic, keywords: draft.keywords, strategy: draft.strategy, title: draft.title, body: draft.body,
      image_path: draft.image_path, image_model: draft.image_model, image_mime_type: draft.image_mime_type,
      extension_handoff_at: draft.extension_handoff_at, naver_input_status: draft.naver_input_status, content_images: contentImages,
    };
  });
  return NextResponse.json({ drafts });
}
