import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isInRetentionGrace, retentionCutoff, RETENTION_DAYS, RETENTION_GRACE_END } from "@/lib/retention";
import { exemptInFilter, loadRetentionExemptIds } from "@/lib/retentionExempt";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

const POSTS_PER_RUN = 300;
const CANDIDATES_PER_RUN = 2000;
// 쓰레드(threads·threads-affiliate-poster)와 함께 쓰는 공유 버킷. 폴더 전체를 훑지 않고,
// 지우는 이 프로그램 글(ncafe_posts)의 image_url·video_url이 가리키던 파일만 지운다.
const BUCKET = "post-images";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

// 타입 파일에 없는 칼럼(profiles.retention_exempt)을 다루므로 느슨한 타입으로 쓴다.
type Admin = any; // eslint-disable-line @typescript-eslint/no-explicit-any

/** 공개 주소에서 post-images 버킷 안 경로를 꺼낸다(이 버킷이 아니면 null) */
function bucketPath(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i < 0) return null;
  try {
    return decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
  } catch {
    return null;
  }
}

/**
 * 2026-11-13 생성 자료 30일 자동 정리. 매일 1회(vercel.json).
 * ① 만든 지 30일 지난 글(ncafe_posts, 게시 중 상태 제외)과 그 글이 가리키던 회원 본인 폴더의 이미지·영상 파일을 지운다.
 * ② 만든 지 30일 지난 글감 수집 결과(ncafe_candidates)를 지운다 — 예약발행 후보함에 켜 둔 후보는 제외.
 * 대상 아님: 카페 연결 계정·게시 대상 카페·카테고리·정기 수집 설정(회원 설정).
 * 예외 회원(profiles.retention_exempt)은 지우지 않는다. 로그·응답에는 개수만 남긴다.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isInRetentionGrace()) {
    return NextResponse.json({ skipped: "grace", graceEnd: RETENTION_GRACE_END, retentionDays: RETENTION_DAYS });
  }

  const admin: Admin = createAdminClient();
  const cutoff = retentionCutoff();
  let exempt: Set<string>;
  try {
    exempt = await loadRetentionExemptIds(admin);
  } catch {
    return NextResponse.json({ error: "자동 삭제 예외 회원 목록을 읽지 못해 정리를 멈췄습니다." }, { status: 503 });
  }
  const exemptFilter = exemptInFilter(exempt);
  const errors: string[] = [];
  let postsDeleted = 0;
  let filesDeleted = 0;
  let candidatesDeleted = 0;

  // ① 만료 글 + 그 글의 파일
  try {
    let q = admin
      .from("ncafe_posts")
      .select("id, user_id, image_url, video_url")
      .lt("created_at", cutoff)
      .neq("status", "publishing");
    if (exemptFilter) q = q.not("user_id", "in", exemptFilter);
    const { data, error } = await q.limit(POSTS_PER_RUN);
    if (error) throw new Error(`ncafe_posts: ${error.message}`);
    for (const p of data ?? []) {
      try {
        // 수정 후 재게시는 같은 이미지 주소를 쓰는 새 글을 만든다 — 다른 글이 아직 쓰는 파일은 남긴다.
        const urls = [p.image_url, p.video_url].filter((u: string | null): u is string => Boolean(bucketPath(u)));
        const stillUsed = new Set<string>();
        if (urls.length) {
          const { data: others, error: otherError } = await admin
            .from("ncafe_posts")
            .select("image_url, video_url")
            .eq("user_id", p.user_id)
            .neq("id", p.id)
            .or(urls.flatMap((u: string) => [`image_url.eq."${u}"`, `video_url.eq."${u}"`]).join(","));
          if (otherError) throw new Error(`ncafe_posts 참조 확인: ${otherError.message}`);
          for (const o of others ?? []) {
            for (const u of [o.image_url, o.video_url]) {
              const path = bucketPath(u);
              if (path) stillUsed.add(path);
            }
          }
        }
        const paths = urls
          .map((u: string) => bucketPath(u))
          .filter((path: string | null): path is string =>
            Boolean(path && path.startsWith(`${p.user_id}/`) && !stillUsed.has(path)),
          );
        if (paths.length) {
          const { error: rmError } = await admin.storage.from(BUCKET).remove(paths);
          if (rmError) throw new Error(`파일 삭제 실패: ${rmError.message}`);
        }
        const { error: delError } = await admin.from("ncafe_posts").delete().eq("id", p.id);
        if (delError) throw new Error(`ncafe_posts 삭제: ${delError.message}`);
        postsDeleted += 1;
        filesDeleted += paths.length;
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  // ② 만료 글감
  try {
    // 회원이 「예약발행 후보함」에 켜 둔 후보(use_for_schedule)는 회원이 고른 대기열이라 지우지 않는다(주인님 결정 대기).
    let q = admin.from("ncafe_candidates").select("id").lt("created_at", cutoff).eq("use_for_schedule", false);
    if (exemptFilter) q = q.not("user_id", "in", exemptFilter);
    const { data, error } = await q.limit(CANDIDATES_PER_RUN);
    if (error) throw new Error(`ncafe_candidates: ${error.message}`);
    const ids = (data ?? []).map((r: { id: string }) => r.id);
    for (let i = 0; i < ids.length; i += 200) {
      const { error: delError } = await admin.from("ncafe_candidates").delete().in("id", ids.slice(i, i + 200));
      if (delError) throw new Error(`ncafe_candidates 삭제: ${delError.message}`);
      candidatesDeleted += Math.min(200, ids.length - i);
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const result = { cutoff, retentionDays: RETENTION_DAYS, postsDeleted, filesDeleted, candidatesDeleted };
  console.log("[cleanup-generated]", JSON.stringify(result), errors.length ? `errors=${errors.length}` : "");
  if (errors.length) return NextResponse.json({ ...result, errors }, { status: 500 });
  return NextResponse.json(result);
}
