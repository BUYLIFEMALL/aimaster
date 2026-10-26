import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addCleanupCount, logCleanupUsage, type CleanupCounts } from "@/lib/cleanupUsageLog"; // 공용 기준 코드 cleanup-usage-log 사본(30일 정리 기록)

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 2026-10-17 v1.12: 회원별 AI 시장조사 캐시(real_estate_district_sentiment)는 생성 30일 후 자동 삭제한다
// (루트 CLAUDE.md 최상위 규칙 — 생성 데이터 30일 보관). 매일 1회 Vercel Cron, CRON_SECRET Bearer 인증(collect/dispatch와 같은 패턴).
// 2026-10-26 v1.20(RE-P1): 주인님 관리자 지정(「부동산쪽은 예외로 1년 데이터를 보관하기로 했어」, docs/TOP_RULE_PERSONAL_ACCOUNT_API.md §8)으로
// 보관 기간을 1년으로 바꾸고, 그동안 기한 없이 남던 AI 매물 분석(real_estate_analyses)도 같은 1년으로 정리한다. 회원별 격리(user_id·RLS)는 그대로.
const RETENTION_DAYS = 365;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // v1.16: 비밀값이 비어 있으면 「Bearer undefined」로 통과하던 빈틈을 막는다
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("real_estate_district_sentiment")
    .delete()
    .lt("created_at", cutoff)
    .select("id, user_id");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const { data: analyses, error: analysesError } = await admin
    .from("real_estate_analyses")
    .delete()
    .lt("created_at", cutoff)
    .select("id, user_id");
  if (analysesError) {
    return NextResponse.json({ error: analysesError.message }, { status: 500 });
  }
  // 정리 기록 — 회원별 지운 지역 분위기(sentiments)·매물 분석(analyses) 수
  const counts: CleanupCounts = new Map();
  for (const r of (data ?? []) as { user_id: string | null }[]) addCleanupCount(counts, r.user_id, "sentiments");
  for (const r of (analyses ?? []) as { user_id: string | null }[]) addCleanupCount(counts, r.user_id, "analyses");
  const loggedOwners = await logCleanupUsage(admin, "real-estate-sales", counts);
  return NextResponse.json({ deleted: data?.length ?? 0, deletedAnalyses: analyses?.length ?? 0, cutoff, retentionDays: RETENTION_DAYS, loggedOwners });
}
