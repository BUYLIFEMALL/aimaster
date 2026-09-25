import { NextResponse } from "next/server";
import { verifyExtensionToken } from "@/lib/extensionAuth";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: Request, context: { params: Promise<{ draftId: string }> }) {
  const user = await verifyExtensionToken(request);
  if (!user) return NextResponse.json({ error: "유효하지 않은 연동 토큰이거나 이용 권한이 없습니다." }, { status: 401 });
  const { draftId } = await context.params;
  const { data, error } = await createServiceClient().from("naver_blog_seo_drafts")
    .update({ extension_imported_at: new Date().toISOString() })
    .eq("id", draftId).eq("user_id", user.userId).not("extension_handoff_at", "is", null)
    .select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "확장 불러오기 상태 저장에 실패했습니다." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "불러올 수 없는 초안입니다." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
