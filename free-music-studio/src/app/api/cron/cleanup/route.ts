import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exemptInFilter, loadRetentionExemptIds } from "@/lib/retentionExempt";
import { SONGS_TABLE } from "@/lib/songs";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 30일 자동 삭제(최상위 규칙: 생성 데이터는 생성일 기준 30일 뒤 삭제). Vercel cron 매일 03:40 KST.
// 관리자·시험 계정(profiles.retention_exempt)은 빼고 지운다. 예외 목록을 못 읽으면 정리 전체를 멈춘다.
const RETENTION_DAYS = 30;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  let exempt: string | null;
  try {
    exempt = exemptInFilter(await loadRetentionExemptIds(admin));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString();
  let query = admin.from(SONGS_TABLE).delete({ count: "exact" }).lt("created_at", cutoff);
  if (exempt) query = query.not("user_id", "in", exempt);
  const { error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, removed: count ?? 0 });
}
