import { NextResponse } from "next/server";
import { verifyExtensionToken } from "@/lib/extensionAuth";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const allowedStatuses = new Set(["in_progress", "completed", "failed"]);

export async function POST(request: Request, context: { params: Promise<{ draftId: string }> }) {
  const user = await verifyExtensionToken(request);
  if (!user) return NextResponse.json({ error: "유효하지 않은 확장 토큰이거나 이용 권한이 없습니다." }, { status: 401 });
  const { draftId } = await context.params;
  const input = await request.json().catch(() => null) as { status?: string; error?: string; paragraphCount?: number } | null;
  const status = input?.status?.trim() ?? "";
  if (!allowedStatuses.has(status)) return NextResponse.json({ error: "지원하지 않는 입력 상태입니다." }, { status: 400 });
  const error = input?.error?.trim().slice(0, 500) || null;
  const completedAt = status === "completed" ? new Date().toISOString() : null;
  const { data, error: updateError } = await createServiceClient().from("naver_blog_seo_drafts")
    .update({ naver_input_status: status, naver_input_completed_at: completedAt, naver_input_error: error })
    .eq("id", draftId).eq("user_id", user.userId).not("extension_handoff_at", "is", null)
    .select("id, naver_input_status, naver_input_completed_at").maybeSingle();
  if (updateError) return NextResponse.json({ error: "입력 결과 기록에 실패했습니다." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "기록할 수 있는 내 전송 초안을 찾지 못했습니다." }, { status: 404 });
  return NextResponse.json({ result: data });
}
