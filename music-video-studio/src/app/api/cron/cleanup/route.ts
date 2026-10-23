import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { RENDER_BUCKET, RETENTION_DAYS } from "@/lib/music/renderArchive";
import { addCleanupCount, logCleanupUsage, type CleanupCounts } from "@/lib/cleanupUsageLog";
import { THIS_PROGRAM_SLUG } from "@/lib/access";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// v1.22 30일 자동 삭제(최상위 규칙: 생성 데이터는 회원별 보관, 생성일 기준 30일 후 삭제). Vercel cron 매일 03:40 KST.
// 대상: 30일 지난 완성본 + 하루 넘게 업로드를 끝내지 못한 행. 파일을 먼저 지우고 행을 지운다. 한 번에 최대 200건.
// 기준: ai-video-studio /api/cron/cleanup.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString();
  const stale = new Date(Date.now() - 86_400_000).toISOString();
  const { data, error } = await admin
    .from("mvs_renders")
    .select("id, user_id, output_path, uploaded")
    .or(`created_at.lt.${cutoff},and(uploaded.eq.false,created_at.lt.${stale})`)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as { id: string; user_id: string; output_path: string; uploaded: boolean }[];
  const counts: CleanupCounts = new Map();
  let removed = 0;
  for (const row of rows) {
    const { error: e } = await admin.storage.from(RENDER_BUCKET).remove([row.output_path]);
    if (e) continue;
    const { error: d } = await admin.from("mvs_renders").delete().eq("id", row.id);
    if (d) continue;
    removed++;
    if (row.uploaded) addCleanupCount(counts, row.user_id, "videos", 1);
  }
  const loggedUsers = await logCleanupUsage(admin, THIS_PROGRAM_SLUG, counts);
  return NextResponse.json({ ok: true, scanned: rows.length, removed, loggedUsers });
}
