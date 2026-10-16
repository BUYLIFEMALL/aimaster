import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 2026-10-17 v1.12: 회원별 AI 시장조사 캐시(real_estate_district_sentiment)는 생성 30일 후 자동 삭제한다
// (루트 CLAUDE.md 최상위 규칙 — 생성 데이터 30일 보관). 매일 1회 Vercel Cron, CRON_SECRET Bearer 인증(collect/dispatch와 같은 패턴).
const RETENTION_DAYS = 30;

function isAuthorized(request: NextRequest): boolean {
  return request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await createAdminClient()
    .from("real_estate_district_sentiment")
    .delete()
    .lt("created_at", cutoff)
    .select("id");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ deleted: data?.length ?? 0, cutoff });
}
