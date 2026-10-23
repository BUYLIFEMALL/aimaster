import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { BUCKET, RETENTION_DAYS, type GenerationRow } from "@/lib/generations";
import { addCleanupCount, logCleanupUsage, type CleanupCounts } from "@/lib/cleanupUsageLog";
import { PROGRAM_SLUG } from "@/lib/access";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// 30일 자동 삭제(최상위 규칙: 생성 데이터는 회원별 보관, 생성일 기준 30일 후 삭제). Vercel cron 매일 03:30 KST.
// 진행 중(running)인 행은 건드리지 않는다. 파일을 먼저 지우고 행을 지운다. 한 번에 최대 200건.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString();
  const { data, error } = await admin
    .from("avs_generations")
    .select("id, user_id, outputs, status, start_image, end_image")
    .lt("created_at", cutoff)
    .neq("status", "running")
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as Pick<GenerationRow, "id" | "user_id" | "outputs" | "status" | "start_image" | "end_image">[];
  const counts: CleanupCounts = new Map();
  let removed = 0;
  for (const row of rows) {
    const paths = [...(row.outputs ?? []).map((o) => o.path), row.start_image, row.end_image].filter((p): p is string => !!p);
    if (paths.length) {
      const { error: e } = await admin.storage.from(BUCKET).remove(paths);
      if (e) continue;
    }
    const { error: d } = await admin.from("avs_generations").delete().eq("id", row.id);
    if (d) continue;
    removed++;
    addCleanupCount(counts, row.user_id, "videos", Math.max(1, paths.length));
  }
  // v1.05 영상 합치기 편집본(avs_edits): 음성·완성 영상 파일을 먼저 지우고 행을 지운다
  const { data: edits } = await admin
    .from("avs_edits")
    .select("id, user_id, voice_paths, output_path")
    .lt("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(200);
  let removedEdits = 0;
  for (const e of (edits ?? []) as { id: string; user_id: string; voice_paths: string[] | null; output_path: string | null }[]) {
    const paths = [...(e.voice_paths ?? []), e.output_path].filter((p): p is string => !!p);
    if (paths.length) {
      const { error: re } = await admin.storage.from(BUCKET).remove(paths);
      if (re) continue;
    }
    const { error: de } = await admin.from("avs_edits").delete().eq("id", e.id);
    if (de) continue;
    removedEdits++;
    addCleanupCount(counts, e.user_id, "videos", Math.max(1, paths.length));
  }
  const loggedUsers = await logCleanupUsage(admin, PROGRAM_SLUG, counts);
  return NextResponse.json({ ok: true, scanned: rows.length, removed, removedEdits, loggedUsers });
}
