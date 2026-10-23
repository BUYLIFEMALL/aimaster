import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { RETENTION_DAYS, retentionCutoff } from "@/lib/retention";
import { checkRankingHealth } from "@/lib/naverRanking";
import { cleanupPrivatePhotos, PrivatePhotoError } from "@/lib/privatePhotos";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// 네이버 블로그 에이전트 생성 콘텐츠(글감, 원고, 이미지) 30일 자동 삭제 Cron 라우트
// 2026-10-08 주인님 지시: "항목은 글감, 본문, 이미지 등 생성된 콘텐츠 자동 삭제 기능 (30일 보관)"
// Vercel Cron 또는 관리자 트리거로 실행되며 CRON_SECRET 인증을 검증합니다.
import { MEDIA_BUCKET, LEGACY_MEDIA_BUCKET } from "@/lib/mediaBucket";

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
    const admin = createAdminClient() as any;
    // 새 사진은 옛 콘텐츠 유예와 관계없이 원래 업로드일부터 30일을 적용한다.
    let privatePhotos: Awaited<ReturnType<typeof cleanupPrivatePhotos>> | { error: string };
    try { privatePhotos = await cleanupPrivatePhotos(admin, dryRun); }
    catch (error) {
      // 새 버킷 장애가 기존 원고·이미지 정리까지 막지는 않지만 실패 상태는 드러낸다.
      privatePhotos = { error: error instanceof PrivatePhotoError ? error.message : "비공개 사진 정리를 완료하지 못했습니다." };
    }
    const privatePhotosFailed = "error" in privatePhotos;
    // 새 자료는 보관 여부와 관계없이 원래 수집일부터 만료. DB count/delete 오류도 실패로 표시한다.
    const sourceNow = new Date().toISOString();
    const sourceQuery = dryRun ? admin.from("nba_collected_materials").select("id", {count: "exact", head: true}).lte("expires_at", sourceNow)
      : admin.from("nba_collected_materials").delete({count: "exact"}).lte("expires_at", sourceNow);
    const {count: sourceCount, error: sourceError} = await sourceQuery;
    const sourceMaterials = sourceError ? {error: "만료 글감 정리를 완료하지 못했습니다."} : {count: sourceCount || 0, dryRun};
    const cleanupFailed = privatePhotosFailed || Boolean(sourceError);

    if (!cutoff) {
      return NextResponse.json({
        success: !cleanupFailed,
        retentionDays: RETENTION_DAYS,
        note: "정책 시작 후 30일 유예 기간이 진행 중이므로 만료 대상이 없습니다.",
        dryRun,
        privatePhotos,
        sourceMaterials,
      }, { status: cleanupFailed ? 503 : 200 });
    }

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

    // 2. 오래된 AI 이미지 파일 삭제 (전용 버킷 + 옛 공용 버킷의 naver-blog-agent/ 폴더 하위, v2.12)
    for (const bucket of [MEDIA_BUCKET, LEGACY_MEDIA_BUCKET]) try {
      const storage = admin.storage.from(bucket);
      // naver-blog-agent 하위 사용자 폴더 탐색
      const { data: userFolders } = await storage.list("naver-blog-agent", { limit: 1000 });
      const imagesToDelete: string[] = [];

      if (userFolders && userFolders.length > 0) {
        for (const uFolder of userFolders) {
          const subPath = `naver-blog-agent/${uFolder.name}`;
          const { data: files } = await storage.list(subPath, { limit: 1000 });
          if (files) {
            for (const file of files) {
              // v2.13: 2026-10-23 옛 버킷에서 옮긴 복사본은 저장 시각이 이관 시점이라, 파일 이름의 생성 시각(ms, `<ms>-…`·`attached-<ms>-…`)이 더 이르면 그것으로 판정(원래 30일 기한 유지)
              const nameMs = Number(file.name.match(/^(?:attached-)?(\d{13})-/)?.[1] ?? NaN);
              const storedMs = file.created_at ? Date.parse(file.created_at) : NaN;
              const bornMs = Math.min(...[nameMs, storedMs].filter((n) => Number.isFinite(n)));
              if (Number.isFinite(bornMs) && bornMs < cutoff.getTime()) {
                imagesToDelete.push(`${subPath}/${file.name}`);
              }
            }
          }
        }
      }

      expiredImagesCount += imagesToDelete.length;
      if (!dryRun && imagesToDelete.length > 0) {
        for (let i = 0; i < imagesToDelete.length; i += 100) {
          const chunk = imagesToDelete.slice(i, i + 100);
          const { error: delImgErr } = await storage.remove(chunk);
          if (!delImgErr) removedImagesCount += chunk.length;
        }
      }
    } catch (e) {
      console.warn(`storage images cleanup error (${bucket}):`, e);
    }

    // 매일 정리 때 랭킹 글감 주소(네이버 비공식)도 함께 점검한다. 실패해도 정리 결과에는 영향 없음.
    const rankingHealth = await checkRankingHealth().catch(() => []);
    for (const item of rankingHealth.filter((h) => !h.ok)) console.error(`[Ranking Health] ${item.kind} 점검 실패: ${item.error}`);

    console.log(
      `[Cleanup Cron] cutoff: ${cutoff.toISOString()}, expiredPosts: ${expiredPostsCount}, removedPosts: ${removedPostsCount}, expiredImages: ${expiredImagesCount}, removedImages: ${removedImagesCount} (dryRun: ${dryRun})`
    );

    return NextResponse.json({
      success: !cleanupFailed,
      retentionDays: RETENTION_DAYS,
      cutoff: cutoff.toISOString(),
      expiredPosts: expiredPostsCount,
      removedPosts: removedPostsCount,
      expiredImages: expiredImagesCount,
      removedImages: removedImagesCount,
      dryRun,
      privatePhotos,
      sourceMaterials,
      rankingHealth,
    }, { status: cleanupFailed ? 503 : 200 });
  } catch (err: any) {
    console.error("Cron Cleanup Error:", err);
    return NextResponse.json({ error: err.message || "정리 작업 중 오류 발생" }, { status: 500 });
  }
}
