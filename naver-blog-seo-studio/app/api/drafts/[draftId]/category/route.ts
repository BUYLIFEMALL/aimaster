import { draftReport, draftLocked, nextDraftReport, writableDraft } from "@/lib/draftWriteGuard";
import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { readNaverCategory } from "@/lib/naverCategory";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 글(초안)의 분류만 바꾼다. 본문·이미지는 건드리지 않는다.
//  - categoryId: 생성 기록 분류 id(빈 문자열이면 미분류). 키가 없으면 그대로 둔다.
//  - naverCategory: 네이버 발행 카테고리 {id, name}(null이면 지정 안 함). 키가 없으면 그대로 둔다.
export async function PATCH(request: Request, context: { params: Promise<{ draftId: string }> }) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const { draftId } = await context.params;
  const input = await request.json().catch(() => null) as { categoryId?: unknown; naverCategory?: unknown } | null;
  if (!input || typeof input !== "object") return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });

  const update: { category_id?: string | null; naver_category?: { id: string; name: string } | null } = {};
  if ("categoryId" in input) {
    const id = typeof input.categoryId === "string" ? input.categoryId.trim().slice(0, 80) : "";
    update.category_id = id || null;
  }
  if ("naverCategory" in input) {
    if (input.naverCategory === null) update.naver_category = null;
    else {
      const parsed = readNaverCategory(input.naverCategory);
      if (!parsed) return NextResponse.json({ error: "실제 네이버 카테고리 목록에서 선택해 주세요." }, { status: 400 });
      update.naver_category = parsed;
    }
  }
  if (Object.keys(update).length === 0) return NextResponse.json({ error: "바꿀 항목이 없습니다." }, { status: 400 });

  const supabase = await createClient();
  const { data: original } = await supabase.from("naver_blog_seo_drafts").select("seo_report").eq("id", draftId).eq("user_id", access.user.id).maybeSingle();
  if (!original) return NextResponse.json({ error: "본인 초안을 찾지 못했습니다." }, { status: 404 });
  const report = draftReport(original.seo_report);
  if (draftLocked(report)) return NextResponse.json({ error: "자동 발행이 시작된 원고의 발행 대상은 바꿀 수 없습니다." }, { status: 409 });
  const { data, error } = await writableDraft(supabase.from("naver_blog_seo_drafts")
    .update({ ...update, seo_report: nextDraftReport(report), updated_at: new Date().toISOString() }).eq("id", draftId).eq("user_id", access.user.id), report)
    .select("id, category_id, naver_category").maybeSingle();
  if (error) return NextResponse.json({ error: "카테고리를 바꾸지 못했습니다." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "본인 초안을 찾지 못했습니다." }, { status: 404 });
  return NextResponse.json({ draft: data });
}
