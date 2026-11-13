import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { projectThumbPaths, retentionCutoff } from "@/lib/retention";
import { addCleanupCount, logCleanupUsage, type CleanupCounts } from "@/lib/cleanupUsageLog";
import { exemptInFilter, loadRetentionExemptIds } from "@/lib/retentionExempt";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// v1.41 생성 자료 30일 자동 삭제(플랜 docs/PLAN_20261113_RETENTION_30D.md). Vercel cron(vercel.json, 매일 KST 04:20)이 부른다.
// 1) 30일 지난 프로젝트: 썸네일 파일(playlist-thumbs)을 먼저 지우고 행을 지운다(행이 지워지면 파일 위치를 알 수 없어서).
// 2) 30일 지난 유튜브 올리기 기록(uploaded_at 기준). 유튜브 영상 자체는 회원 채널 것이라 건드리지 않는다.
// 관리자·시험 계정(profiles.retention_exempt)은 제외하고, 그 목록을 못 읽으면 아무것도 지우지 않는다. 기준 구현: music/app/api/cron/cleanup.
const BUCKET = "playlist-thumbs";
const BATCH = 100;
const SLUG = "playlist-channel-studio";

export async function GET(request: NextRequest) {
  // 비밀값이 비어 있으면 「Bearer undefined」로 통과되는 사고를 막는다(docs/ERROR_LESSONS.md 2026-10-20).
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const iso = retentionCutoff().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const exempt = exemptInFilter(await loadRetentionExemptIds(db));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const notExempt = (q: any) => (exempt ? q.not("user_id", "in", exempt) : q);
  const result = { projects: 0, uploads: 0, files: 0 };
  const counts: CleanupCounts = new Map();

  const { data: projects, error: projectsErr } = await notExempt(
    db.from("playlist_projects").select("id, user_id, thumb_path").lte("created_at", iso).limit(BATCH),
  );
  if (projectsErr) throw new Error(`project select failed: ${projectsErr.message}`);
  if (projects?.length) {
    const paths = projectThumbPaths(projects);
    const { error } = await db.storage.from(BUCKET).remove(paths);
    if (error) throw new Error(`storage remove failed: ${error.message}`);
    result.files = paths.length;
    const { error: delErr } = await db.from("playlist_projects").delete().in("id", projects.map((p: { id: string }) => p.id));
    if (delErr) throw new Error(`project delete failed: ${delErr.message}`);
    result.projects = projects.length;
    for (const p of projects as { user_id: string }[]) addCleanupCount(counts, p.user_id, "projects");
  }

  const { data: uploads, error: uploadsErr } = await notExempt(
    db.from("playlist_youtube_uploads").select("id, user_id").lte("uploaded_at", iso).limit(BATCH),
  );
  if (uploadsErr) throw new Error(`upload select failed: ${uploadsErr.message}`);
  if (uploads?.length) {
    const { error } = await db.from("playlist_youtube_uploads").delete().in("id", uploads.map((u: { id: string }) => u.id));
    if (error) throw new Error(`upload delete failed: ${error.message}`);
    result.uploads = uploads.length;
    for (const u of uploads as { user_id: string }[]) addCleanupCount(counts, u.user_id, "posts");
  }

  // 30일 정리 기록 — 회원별 지운 개수(공용 기준 코드 cleanup-usage-log 사본, 기록 실패해도 정리는 계속)
  await logCleanupUsage(db, SLUG, counts);
  return NextResponse.json({ ok: true, cutoff: iso, ...result });
}
