import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addCleanupCount, logCleanupUsage, type CleanupCounts } from "@/lib/cleanupUsageLog"; // 공용 기준 코드 cleanup-usage-log 사본(30일 정리 기록)

import { ONSITE_BUCKET } from "@/lib/onsite/types";

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
  // 임장 노트(2026-11-01): 사진을 먼저 지우고 기록을 지운다. 사진 삭제가 실패하면 기록을 남겨 다음 날 다시 시도한다
  const { data: onsite } = await admin
    .from("real_estate_onsite_properties" as never)
    .select("id, user_id, real_estate_onsite_photos(storage_path)")
    .lt("created_at", cutoff)
    .limit(500);
  const onsiteRows = (onsite ?? []) as unknown as { id: string; user_id: string; real_estate_onsite_photos: { storage_path: string }[] }[];
  const onsitePaths = onsiteRows.flatMap((r) => r.real_estate_onsite_photos.map((p) => p.storage_path));
  const removeResult = onsitePaths.length ? await admin.storage.from(ONSITE_BUCKET).remove(onsitePaths) : { error: null };
  if (!removeResult.error && onsiteRows.length) {
    await admin.from("real_estate_onsite_properties" as never).delete().in("id" as never, onsiteRows.map((r) => r.id) as never);
  }
  // B2 저장한 주소 리포트(2026-11-03): 1년 지난 것. 관리자·시험 계정(profiles.retention_exempt)은 빼고 지운다
  const { data: exemptRows } = await admin.from("profiles").select("id").eq("retention_exempt" as never, true as never);
  const exemptIds = ((exemptRows ?? []) as { id: string }[]).map((p) => p.id);
  let savedQuery = admin.from("real_estate_saved_reports" as never).delete().lt("created_at" as never, cutoff as never);
  if (exemptIds.length) savedQuery = savedQuery.not("user_id" as never, "in", `(${exemptIds.join(",")})`);
  const { data: savedReports } = await savedQuery.select("id, user_id");
  // 정리 기록 — 회원별 지운 지역 분위기(sentiments)·매물 분석(analyses) 수
  const counts: CleanupCounts = new Map();
  for (const r of (savedReports ?? []) as unknown as { user_id: string | null }[]) addCleanupCount(counts, r.user_id, "saved_reports");
  for (const r of (data ?? []) as { user_id: string | null }[]) addCleanupCount(counts, r.user_id, "sentiments");
  for (const r of (analyses ?? []) as { user_id: string | null }[]) addCleanupCount(counts, r.user_id, "analyses");
  if (!removeResult.error) for (const r of onsiteRows) addCleanupCount(counts, r.user_id, "onsite");
  const loggedOwners = await logCleanupUsage(admin, "real-estate-sales", counts);
  return NextResponse.json({ deleted: data?.length ?? 0, deletedAnalyses: analyses?.length ?? 0, deletedOnsite: removeResult.error ? 0 : onsiteRows.length, cutoff, retentionDays: RETENTION_DAYS, loggedOwners });
}
