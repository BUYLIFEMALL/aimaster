import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { retentionExemptFilter } from "@/lib/retentionExempt"; // 30일 삭제 예외 회원(관리자·시험 계정)

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const CLEANUP_DAYS = 30;

// 운영 정리: 등록 기록·짧은 이미지 주소를 30일 뒤 지운다(최상위 보관 규칙 — 발행 여부와 상관없이 30일, retention_exempt 회원만 제외).
// 회원 기능이 아니라 운영자 예약(vercel.json crons, CRON_SECRET)으로 돈다. 11번가에 올라간 상품 자체는 건드리지 않는다.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  let exemptFilter: string;
  try {
    exemptFilter = await retentionExemptFilter(admin); // 못 읽으면 정리 전체를 멈춘다(예외 회원 자료를 잘못 지우지 않게)
  } catch {
    return NextResponse.json({ error: "exempt list unavailable" }, { status: 500 });
  }
  const before = new Date(Date.now() - CLEANUP_DAYS * 86400000).toISOString();
  const [jobs, links] = await Promise.all([
    admin.from("elevenst_register_jobs").delete({ count: "exact" }).lt("created_at", before).not("user_id", "in", exemptFilter),
    admin.from("elevenst_register_image_links").delete({ count: "exact" }).lt("expires_at", new Date().toISOString()).not("user_id", "in", exemptFilter),
  ]);
  if (jobs.error || links.error) return NextResponse.json({ error: "cleanup failed" }, { status: 500 });
  return NextResponse.json({ days: CLEANUP_DAYS, jobs: jobs.count ?? 0, imageLinks: links.count ?? 0 });
}
