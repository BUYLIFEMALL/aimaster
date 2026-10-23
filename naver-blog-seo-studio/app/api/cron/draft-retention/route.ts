import { NextResponse } from "next/server";
import { purgeExpiredSeoStudioData } from "@/lib/draftRetention";
import { createServiceClient } from "@/lib/supabase/service";
import { logCleanupUsage, type CleanupCounts } from "@/lib/cleanupUsageLog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // 2026-10-23: 지운 것을 회원별로 세어 usage_logs(cleanup_expired)에 남긴다(관리자 「30일 자동 정리」 표)
  const counts: CleanupCounts = new Map();
  const service = createServiceClient();
  const result = await purgeExpiredSeoStudioData(service, undefined, counts);
  await logCleanupUsage(service, "naver-blog-seo-studio", counts);
  if (result.error) return NextResponse.json({ error: "보관 기한이 지난 초안을 정리하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ deleted: result.deleted });
}
