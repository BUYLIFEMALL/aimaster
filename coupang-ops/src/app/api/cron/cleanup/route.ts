import { NextRequest, NextResponse } from "next/server";
import { CLEANUP_DAYS, cleanupBefore } from "@/lib/coupang/summary";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// C1-15 운영 정리: 등록 기록·짧은 이미지 주소를 30일 뒤 지운다(최상위 규칙). 회원 기능이 아니라 운영자 예약(vercel.json, CRON_SECRET)으로 돈다.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const before = cleanupBefore(Date.now());
  const [jobs, links] = await Promise.all([
    admin.from("coupang_ops_jobs").delete({ count: "exact" }).lt("created_at", before),
    admin.from("coupang_ops_image_links").delete({ count: "exact" }).lt("expires_at", new Date().toISOString()),
  ]);
  if (jobs.error || links.error) return NextResponse.json({ error: "cleanup failed" }, { status: 500 });
  return NextResponse.json({ days: CLEANUP_DAYS, jobs: jobs.count ?? 0, imageLinks: links.count ?? 0 });
}
