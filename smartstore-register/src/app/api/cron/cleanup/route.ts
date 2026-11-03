import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { retentionExemptFilter } from "@/lib/retentionExempt"; // 30일 삭제 예외 회원(2026-11-03)

// 등록 작업 기록 30일 자동 정리(최상위 규칙: 생성 데이터 30일). Vercel Cron이 CRON_SECRET으로 부른다.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const admin = createAdminClient();
  const exemptFilter = await retentionExemptFilter(admin); // 예외 회원(관리자·시험 계정)은 지우지 않는다. 못 읽으면 오류로 멈춤
  const { count, error } = await admin
    .from("smartstore_register_jobs")
    .delete({ count: "exact" })
    .lt("created_at", cutoff).not("user_id", "in", exemptFilter);
  // 상품속성 불러오기 결과도 30일(v1.21)
  const attr = await admin
    .from("smartstore_register_attr_lookups")
    .delete({ count: "exact" })
    .lt("created_at", cutoff).not("user_id", "in", exemptFilter);
  // 판매자센터 화면 점검 결과도 30일(v1.23)
  const health = await admin
    .from("smartstore_register_health")
    .delete({ count: "exact" })
    .lt("created_at", cutoff).not("user_id", "in", exemptFilter);
  if (error || attr.error || health.error) {
    console.error("[smartstore-register] cleanup", error?.code ?? attr.error?.code ?? health.error?.code);
    return NextResponse.json({ error: "cleanup failed" }, { status: 500 });
  }
  return NextResponse.json({ deleted: count ?? 0, attrDeleted: attr.count ?? 0, healthDeleted: health.count ?? 0 });
}
