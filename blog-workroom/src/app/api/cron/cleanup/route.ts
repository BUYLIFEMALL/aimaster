import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { KEEP_KINDS, orphanJobFolders, retentionCutoff, RETENTION_DAYS } from "@/lib/retention";
import { addCleanupCount, logCleanupUsage, type CleanupCounts } from "@/lib/cleanupUsageLog";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// v1.12 (BC-05, 2026-10-22): 회원 생성물 30일 정리 — Vercel Cron(vercel.json)이 하루 1번 호출, CRON_SECRET이 맞을 때만 실행(회원 권한 확인 대상이 아닌 시스템 경로).
// 1) 설정·내 블로그를 뺀 항목 중 만든 지 30일이 지난 행을 지운다.
// 2) blog-workroom 버킷에서 남아 있는 이미지 작업이 없는 폴더(회원/작업번호)의 파일을 지운다(1번에서 지운 작업, 예전에 글만 지워져 남은 파일 포함).
// ?dry=1이면 지우지 않고 건수만 돌려준다.
const BUCKET = "blog-workroom";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const dryRun = request.nextUrl.searchParams.get("dry") === "1";
  const cutoff = retentionCutoff();
  const admin = createAdminClient();

  const { data: expired, error: expiredError } = await admin
    .from("blog_workroom_items")
    .select("id, user_id, kind")
    .not("kind", "in", `(${KEEP_KINDS.join(",")})`)
    .lte("created_at", cutoff)
    .limit(5000);
  if (expiredError) return NextResponse.json({ error: expiredError.message }, { status: 500 });
  let deletedRows = 0;
  // 2026-10-23: 실제로 지운 것만 회원별로 세어 usage_logs(cleanup_expired)에 남긴다(관리자 「30일 자동 정리」 표). 미리 보기(dry)는 기록 안 함
  const counts: CleanupCounts = new Map();
  if (!dryRun && expired?.length) {
    const { error, count } = await admin.from("blog_workroom_items").delete({ count: "exact" }).in("id", expired.map((r) => r.id));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    deletedRows = count ?? 0;
    for (const row of expired) addCleanupCount(counts, row.user_id as string, row.kind === "image_job" ? "imageJobs" : "items");
  }

  const { data: jobs, error: jobsError } = await admin.from("blog_workroom_items").select("id").eq("kind", "image_job").limit(20000);
  if (jobsError) return NextResponse.json({ error: jobsError.message }, { status: 500 });
  const live = new Set((jobs ?? []).map((j) => j.id as string));
  if (dryRun) for (const row of expired ?? []) live.delete(row.id as string);

  const storage = admin.storage.from(BUCKET);
  const { data: owners, error: ownersError } = await storage.list("", { limit: 1000 });
  if (ownersError) return NextResponse.json({ error: ownersError.message }, { status: 500 });
  let orphanFolders = 0;
  let removedFiles = 0;
  for (const owner of (owners ?? []).filter((o) => o.id === null)) {
    const { data: folders } = await storage.list(owner.name, { limit: 1000 });
    for (const folder of orphanJobFolders((folders ?? []).filter((f) => f.id === null).map((f) => f.name), live)) {
      orphanFolders += 1;
      const { data: files } = await storage.list(`${owner.name}/${folder}`, { limit: 1000 });
      const paths = (files ?? []).filter((f) => f.id !== null).map((f) => `${owner.name}/${folder}/${f.name}`);
      if (!paths.length) continue;
      if (dryRun) { removedFiles += paths.length; continue; }
      const { error } = await storage.remove(paths);
      if (!error) { removedFiles += paths.length; addCleanupCount(counts, owner.name, "images", paths.length); }
    }
  }
  if (!dryRun) await logCleanupUsage(admin, "blog-workroom", counts);
  return NextResponse.json({ retentionDays: RETENTION_DAYS, cutoff, dryRun, expiredRows: expired?.length ?? 0, deletedRows, orphanFolders, removedFiles });
}
