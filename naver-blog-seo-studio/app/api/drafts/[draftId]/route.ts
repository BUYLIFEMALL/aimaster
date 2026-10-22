import { draftReport, draftLocked, nextDraftReport, writableDraft } from "@/lib/draftWriteGuard";
import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function PATCH(request: Request, context: { params: Promise<{ draftId: string }> }) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

  const { draftId } = await context.params;
  const input = await request.json().catch(() => null) as { title?: string; body?: string; contentBlocks?: unknown; baseTitle?: unknown; baseBody?: unknown } | null;
  const title = input?.title?.trim() ?? "";
  const body = input?.body?.trim() ?? "";
  if (!title || title.length > 150) return NextResponse.json({ error: "제목을 1~150자로 입력해주세요." }, { status: 400 });
  if (body.length < 120 || body.length > 30000) return NextResponse.json({ error: "본문을 120~30,000자로 입력해주세요." }, { status: 400 });

  const contentBlocks = Array.isArray(input?.contentBlocks) ? input.contentBlocks : null;
  if (contentBlocks && (contentBlocks.length === 0 || contentBlocks.length > 150 || contentBlocks.some((block) => {
    if (typeof block !== "object" || block === null) return true;
    const item = block as { id?: unknown; type?: unknown; text?: unknown; slot?: unknown; alt?: unknown };
    if (typeof item.id !== "string" || item.id.length > 80) return true;
    if (item.type === "text") return typeof item.text !== "string" || item.text.length > 30000;
    return item.type !== "image" || !(item.slot === "cover" || /^content-[1-6]$/.test(String(item.slot))) || (item.alt !== undefined && typeof item.alt !== "string");
  }))) return NextResponse.json({ error: "Invalid content editor blocks." }, { status: 400 });

  const supabase = await createClient();
  const { data: original } = await supabase.from("naver_blog_seo_drafts")
    .select("title, body, seo_report").eq("id", draftId).eq("user_id", access.user.id).maybeSingle();
  if (!original) return NextResponse.json({ error: "수정할 내 초안을 찾지 못했습니다." }, { status: 404 });
  const bodyChanged = original.body !== body;
  const report = draftReport(original.seo_report);
  if (draftLocked(report)) return NextResponse.json({ error: "자동 발행을 시작한 원고입니다. 결과 확인 후 새 원고로 복제해 주세요." }, { status: 409 });
  // BLC-09 (2026-10-22): 화면이 불러온 시점의 제목·본문과 지금 DB가 다르면 다른 창·탭에서 먼저 저장한 것 — 덮어쓰지 않는다.
  // 이미지·카테고리 변경은 제목·본문을 바꾸지 않으므로 막지 않는다. 값을 보내지 않는 옛 화면·확장은 기존 동작 그대로.
  if (typeof input?.baseTitle === "string" && typeof input?.baseBody === "string" && (input.baseTitle !== original.title || input.baseBody !== original.body)) {
    return NextResponse.json({ code: "REVISION_CONFLICT", error: "다른 창이나 탭에서 이 원고를 먼저 저장했습니다. 지금 내용을 따로 복사해 두고 새로고침한 뒤 다시 저장해 주세요." }, { status: 409 });
  }
  // Block-aware edits preserve the user's explicit image placement. Legacy textarea
  // edits retain the established behavior of clearing sentence-matched images.
  const staleImages = bodyChanged && !contentBlocks && Array.isArray(report.contentImages) ? report.contentImages as Array<{ path?: string }> : [];
  const nextReport = contentBlocks
    ? { ...report, contentBlocks }
    : bodyChanged ? Object.fromEntries(Object.entries(report).filter(([key]) => key !== "contentImages" && key !== "contentBlocks")) : report;
  const { data, error } = await writableDraft(supabase.from("naver_blog_seo_drafts")
    .update({ title, body, seo_report: nextDraftReport(nextReport), updated_at: new Date().toISOString() })
    .eq("id", draftId).eq("user_id", access.user.id), report)
    .select("id, topic, keywords, strategy, title, body, seo_report, created_at, image_path, image_model, image_mime_type, naver_input_status, naver_input_completed_at, naver_input_error, category_id, naver_category")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "초안 저장에 실패했습니다." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "수정할 내 초안을 찾지 못했습니다." }, { status: 404 });
  const stalePaths = staleImages.map((image) => image.path).filter((path): path is string => Boolean(path));
  if (stalePaths.length) await supabase.storage.from("naver-blog-seo-images").remove(stalePaths);
  return NextResponse.json({ draft: data });
}

export async function DELETE(_request: Request, context: { params: Promise<{ draftId: string }> }) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const { draftId } = await context.params;
  const supabase = await createClient();
  const { data: draft, error: findError } = await supabase.from("naver_blog_seo_drafts")
    .select("image_path, seo_report")
    .eq("id", draftId).eq("user_id", access.user.id)
    .maybeSingle();
  if (findError || !draft) return NextResponse.json({ error: "삭제할 내 초안을 찾지 못했습니다." }, { status: 404 });
  const report = draftReport(draft.seo_report);
  if (draftLocked(report)) return NextResponse.json({ error: "자동 발행 기록이 있는 원고는 삭제할 수 없습니다. 발행 결과를 확인해 주세요." }, { status: 409 });
  const contentImages = typeof draft.seo_report === "object" && draft.seo_report !== null && Array.isArray((draft.seo_report as { contentImages?: unknown }).contentImages)
    ? (draft.seo_report as { contentImages: Array<{ path?: string }> }).contentImages : [];
  const imagePaths = [draft.image_path, ...contentImages.map((item) => item.path)].filter((path): path is string => Boolean(path));
  const { data: removed, error } = await writableDraft(supabase.from("naver_blog_seo_drafts").delete().eq("id", draftId).eq("user_id", access.user.id), report).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "초안을 삭제하지 못했습니다." }, { status: 500 });
  if (!removed) return NextResponse.json({ error: "원고가 변경되거나 발행이 시작되어 삭제하지 않았습니다." }, { status: 409 });
  if (imagePaths.length) await supabase.storage.from("naver-blog-seo-images").remove(imagePaths);
  return NextResponse.json({ deletedId: draftId });
}
