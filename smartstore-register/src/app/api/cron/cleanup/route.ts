import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// 등록 작업 기록 30일 자동 정리(최상위 규칙: 생성 데이터 30일). Vercel Cron이 CRON_SECRET으로 부른다.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await createAdminClient()
    .from("smartstore_register_jobs")
    .delete({ count: "exact" })
    .lt("created_at", cutoff);
  if (error) {
    console.error("[smartstore-register] cleanup", error.code);
    return NextResponse.json({ error: "cleanup failed" }, { status: 500 });
  }
  return NextResponse.json({ deleted: count ?? 0 });
}
