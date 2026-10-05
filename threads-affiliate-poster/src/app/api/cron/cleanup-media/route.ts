import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  MEDIA_RETENTION_DAYS,
  getMediaRetentionCutoff,
  extractStoragePathFromUrl,
} from "@/lib/mediaRetention";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

/**
 * 30일(한 달) 경과 미디어 데이터 자동 정리 Cron 작업
 * - Vercel Cron 또는 수동 호출로 등록 시점 기준 30일이 지난 미디어 및 게시글 정리
 */
async function handleCleanup(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cutoff = getMediaRetentionCutoff();
  const supabase = createAdminClient();
  const storage = supabase.storage.from("post-images");

  // 1) 30일 이상 지난 게시글 목록 조회
  const { data: expiredPosts, error: fetchError } = await supabase
    .from("tap_posts")
    .select("id, image_url, video_url, created_at")
    .lt("created_at", cutoff.toISOString());

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const storagePathsToDelete = new Set<string>();

  for (const post of expiredPosts ?? []) {
    // 다중 이미지 URL 파싱
    if (post.image_url) {
      const urls = post.image_url.split(",").map((u) => u.trim());
      for (const u of urls) {
        const path = extractStoragePathFromUrl(u);
        if (path) storagePathsToDelete.add(path);
      }
    }
    // 동영상 URL 파싱
    if (post.video_url) {
      const urls = post.video_url.split(",").map((u) => u.trim());
      for (const u of urls) {
        const path = extractStoragePathFromUrl(u);
        if (path) storagePathsToDelete.add(path);
      }
    }
  }

  // 2) Storage 파일 실제 삭제
  const pathsArray = Array.from(storagePathsToDelete);
  let removedFilesCount = 0;

  if (pathsArray.length > 0) {
    // Supabase storage remove는 한 번에 여러 개 삭제 가능
    for (let i = 0; i < pathsArray.length; i += 100) {
      const chunk = pathsArray.slice(i, i + 100);
      const { error: removeError } = await storage.remove(chunk);
      if (!removeError) {
        removedFilesCount += chunk.length;
      }
    }
  }

  // 3) 30일 경과한 오래된 게시글 삭제
  const { error: deleteError, count } = await supabase
    .from("tap_posts")
    .delete({ count: "exact" })
    .lt("created_at", cutoff.toISOString());

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    retentionDays: MEDIA_RETENTION_DAYS,
    cutoff: cutoff.toISOString(),
    expiredPostsCount: expiredPosts?.length ?? 0,
    deletedPostsCount: count ?? 0,
    deletedFilesCount: removedFilesCount,
  });
}

export async function GET(request: NextRequest) {
  return handleCleanup(request);
}

export async function POST(request: NextRequest) {
  return handleCleanup(request);
}
