import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 2026-10-17 v1.12: 회원별 AI 시장조사 캐시(real_estate_district_sentiment)는 생성 30일 후 자동 삭제한다
// (루트 CLAUDE.md 최상위 규칙 — 생성 데이터 30일 보관). 매일 1회 Vercel Cron, CRON_SECRET Bearer 인증(collect/dispatch와 같은 패턴).
// cleanup-usage-log: 회원 데이터 아님(2026-10-23) — 이 표에는 user_id가 없어(지역+날짜로 하나) 회원별 정리 기록을 남길 수 없다. 관리자 「30일 정리 기록」 진행률 분모에서 뺀다(scripts/program-info.mjs).
// ⚠ 위 주석은 「회원별 캐시」라고 하지만 실제 표는 회원 구분이 없다 — 회원 키로 만든 AI 결과를 여러 회원이 함께 쓰는 공용 캐시인지 확인 필요(docs/IMPROVEMENTS.md 2026-10-23).
const RETENTION_DAYS = 30;

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
