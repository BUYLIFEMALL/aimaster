import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { RETENTION_DAYS, retentionCutoff } from "@/lib/retention";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// 네이버 블로그 에이전트 생성 콘텐츠(글감, 원고, 이미지) 30일 자동 삭제 Cron 라우트
// 2026-10-08 주인님 지시: "항목은 글감, 본문, 이미지 등 생성된 콘텐츠 자동 삭제 기능 (30일 보관)"
// Vercel Cron 또는 관리자 트리거로 실행되며 CRON_SECRET 인증을 검증합니다.
const MEDIA_BUCKET = "ai-image-generations";

export async function GET(request: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");
    const querySecret = request.nextUrl.searchParams.get("key");

    // Vercel Cron 헤더 또는 쿼리 파라미터 시크릿 검증
    const isAuthorized =
      (secret && authHeader === `Bearer ${secret}`) ||
      (secret && querySecret === secret) ||
      process.env.NODE_ENV === "development";

    if (!isAuthorized) {
      return NextResponse.json({ error: "인증되지 않은 요청입니다." }, { status: 401 });
    }

    const dryRun = request.nextUrl.searchParams.get("dry") === "1";
    const cutoff = retentionCutoff();

    if (!cutoff) {
      return NextResponse.json({
        retentionDays: RETENTION_DAYS,
        note: "정책 시작 후 30일 유예 기간이 진행 중이므로 만료 대상이 없습니다.",
        dryRun,
      });
    }

    const admin = createAdminClient() as any;
    let expiredPostsCount = 0;
    let removedPostsCount = 0;
    let expiredImagesCount = 0;
    let removedImagesCount = 0;

    // 1. 오래된 원고 삭제 (nba_posts)
    try {
      const { data: oldNbaPosts, error: nbaErr } = await admin
        .from("nba_posts")
        .select("id")
        .lt("created_at", cutoff.toISOString());

      if (!nbaErr && oldNbaPosts && oldNbaPosts.length > 0) {
        expiredPostsCount += oldNbaPosts.length;
        if (!dryRun) {
          const ids = oldNbaPosts.map((p: any) => p.id);
          const { error: delErr } = await admin.from("nba_posts").delete().in("id", ids);
          if (!delErr) removedPostsCount += ids.length;
        }
      }
    } catch (e) {
      console.warn("nba_posts cleanup error:", e);
    }

    // naver_blog_seo_drafts는 다른 프로그램(네이버 블로그 SEO 스튜디오)의 원고 테이블이라 여기서 지우지 않는다.
    // (v1.49 이전에는 nba_posts가 없어 이 에이전트도 그 테이블에 임시 저장했지만, 이제 nba_posts가 생겨 해당 없음)

    // 2. 오래된 AI 이미지 파일 삭제 (ai-image-generations 버킷의 naver-blog-agent/ 폴더 하위)
    try {
      const storage = admin.storage.from(MEDIA_BUCKET);
      // naver-blog-agent 하위 사용자 폴더 탐색
      const { data: userFolders } = await storage.list("naver-blog-agent", { limit: 1000 });
      const imagesToDelete: string[] = [];

      if (userFolders && userFolders.length > 0) {
        for (const uFolder of userFolders) {
          const subPath = `naver-blog-agent/${uFolder.name}`;
          const { data: files } = await storage.list(subPath, { limit: 1000 });
          if (files) {
            for (const file of files) {
              if (file.created_at && new Date(file.created_at) < cutoff) {
                imagesToDelete.push(`${subPath}/${file.name}`);
              }
            }
          }
        }
      }

      expiredImagesCount = imagesToDelete.length;
      if (!dryRun && imagesToDelete.length > 0) {
        for (let i = 0; i < imagesToDelete.length; i += 100) {
          const chunk = imagesToDelete.slice(i, i + 100);
          const { error: delImgErr } = await storage.remove(chunk);
          if (!delImgErr) removedImagesCount += chunk.length;
        }
      }
    } catch (e) {
      console.warn("storage images cleanup error:", e);
    }

    console.log(
      `[Cleanup Cron] cutoff: ${cutoff.toISOString()}, expiredPosts: ${expiredPostsCount}, removedPosts: ${removedPostsCount}, expiredImages: ${expiredImagesCount}, removedImages: ${removedImagesCount} (dryRun: ${dryRun})`
    );

    return NextResponse.json({
      success: true,
      retentionDays: RETENTION_DAYS,
      cutoff: cutoff.toISOString(),
      expiredPosts: expiredPostsCount,
      removedPosts: removedPostsCount,
      expiredImages: expiredImagesCount,
      removedImages: removedImagesCount,
      dryRun,
    });
  } catch (err: any) {
    console.error("Cron Cleanup Error:", err);
    return NextResponse.json({ error: err.message || "정리 작업 중 오류 발생" }, { status: 500 });
  }
}
