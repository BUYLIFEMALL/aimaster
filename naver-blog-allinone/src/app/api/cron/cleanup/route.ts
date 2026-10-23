import { NextResponse, type NextRequest } from "next/server";
import { BUCKET, imagePaths } from "@/lib/blog/sanitize";
import { expiredOrphanFiles, retentionCutoff, RETENTION_DAYS } from "@/lib/blog/retention";
import type { ImageSlot } from "@/lib/blog/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { addCleanupCount, logCleanupUsage, ownerFromPath, type CleanupCounts } from "@/lib/cleanupUsageLog";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// BC-05 (2026-10-22): 회원 보관함 30일 정리 — Vercel Cron(vercel.json)이 하루 1번 호출, CRON_SECRET이 맞을 때만 실행(회원 권한 확인 대상이 아닌 시스템 경로).
// 1) 만든 지 30일이 지난 글(aio_posts)과 그 글의 이미지 파일을 지운다.
// 2) allinone-images 버킷에서 30일이 지났고 남은 글 어디에도 쓰이지 않는 이미지(저장하지 않고 올리기만 한 이미지 포함)를 지운다.
// 카테고리는 설정이라 지우지 않는다. ?dry=1이면 지우지 않고 건수만 돌려준다.
const SUPA = () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const dryRun = request.nextUrl.searchParams.get("dry") === "1";
  const cutoff = retentionCutoff();
  const admin = createAdminClient();
  const storage = admin.storage.from(BUCKET);

  const { data: expired, error: expiredError } = await admin.from("aio_posts").select("id, user_id, images").lte("created_at", cutoff).limit(5000);
  if (expiredError) return NextResponse.json({ error: expiredError.message }, { status: 500 });
  const expiredFiles = (expired ?? []).flatMap((p) => imagePaths((p.images as ImageSlot[]) ?? [], SUPA(), p.user_id as string));
  let deletedPosts = 0;
  // 2026-10-23: 실제로 지운 것만 회원별로 세어 usage_logs(cleanup_expired)에 남긴다(관리자 「30일 자동 정리」 표). 미리 보기(dry)는 기록 안 함
  const counts: CleanupCounts = new Map();
  if (!dryRun && expired?.length) {
    const { error, count } = await admin.from("aio_posts").delete({ count: "exact" }).in("id", expired.map((p) => p.id));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    deletedPosts = count ?? 0;
    for (const p of expired) addCleanupCount(counts, p.user_id as string, "posts");
    if (expiredFiles.length && !(await storage.remove(expiredFiles)).error) for (const path of expiredFiles) addCleanupCount(counts, ownerFromPath(path), "images");
  }

  const { data: live, error: liveError } = await admin.from("aio_posts").select("user_id, images").gt("created_at", cutoff).limit(20000);
  if (liveError) return NextResponse.json({ error: liveError.message }, { status: 500 });
  const used = new Set((live ?? []).flatMap((p) => imagePaths((p.images as ImageSlot[]) ?? [], SUPA(), p.user_id as string)));

  const { data: owners, error: ownersError } = await storage.list("", { limit: 1000 });
  if (ownersError) return NextResponse.json({ error: ownersError.message }, { status: 500 });
  let orphanFiles = 0;
  for (const owner of (owners ?? []).filter((o) => o.id === null)) {
    const { data: files } = await storage.list(owner.name, { limit: 1000 });
    const targets = expiredOrphanFiles((files ?? []).filter((f) => f.id !== null).map((f) => ({ path: `${owner.name}/${f.name}`, createdAt: f.created_at })), used);
    if (!targets.length) continue;
    if (dryRun) { orphanFiles += targets.length; continue; }
    const { error } = await storage.remove(targets);
    if (!error) { orphanFiles += targets.length; addCleanupCount(counts, owner.name, "images", targets.length); }
  }
  if (!dryRun) await logCleanupUsage(admin, "naver-blog-allinone", counts);
  return NextResponse.json({ retentionDays: RETENTION_DAYS, cutoff, dryRun, expiredPosts: expired?.length ?? 0, deletedPosts, expiredPostFiles: expiredFiles.length, orphanFiles });
}
