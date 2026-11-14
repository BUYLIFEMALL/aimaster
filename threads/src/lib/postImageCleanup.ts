// v1.30 — 글 이미지(post-images/<회원>/) 30일 정리. 주인님 결정(2026-10-23): 「어떤 글에도 쓰이지 않는 파일만」 지운다.
// 글(posts.image_url, 상태와 상관없이)이 가리키는 파일과 30일이 안 된 파일은 남긴다 — 예약 게시·게시글 관리 미리보기가 깨지지 않게.
// 저장하지 않고 나간 업로드·무료 사진, 다시 만들기 전 AI 이미지가 대상. 호출처: 하루 1회 자동 실행 /api/cleanup-images.
// v1.31(주인님 결정 2026-10-23): 게시 완료 후 30일 지난 글은 사진 칸에서 이 버킷 주소를 빼고(본문·Threads 링크·게시 기록은 남김),
// 그 뒤 같은 「안 쓰이는 파일」 규칙으로 파일을 지운다. 초안·예약·게시 중·실패 글은 손대지 않는다.
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadRetentionExemptIds } from "@/lib/retentionExempt";
import { addCleanupCount, logCleanupUsage, type CleanupCounts } from "@/lib/cleanupUsageLog";

export const POST_IMAGE_BUCKET = "post-images";
export const POST_IMAGE_RETENTION_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

/** 공개 주소에서 버킷 안 경로를 꺼낸다(post-images가 아니면 null) */
export function postImagePath(url: string): string | null {
  const marker = `/${POST_IMAGE_BUCKET}/`;
  const i = url.indexOf(marker);
  if (i < 0) return null;
  try {
    return decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
  } catch {
    return null;
  }
}

/** 글들의 image_url(쉼표로 이은 주소)에서 쓰이는 경로 모음 */
export function referencedPaths(imageUrls: (string | null | undefined)[]): Set<string> {
  const out = new Set<string>();
  for (const value of imageUrls) {
    for (const url of (value ?? "").split(",")) {
      const path = postImagePath(url.trim());
      if (path) out.add(path);
    }
  }
  return out;
}

/** 게시 완료 30일 지난 글의 새 image_url — 이 버킷 주소만 빼고 다른 주소는 남김(남는 게 없으면 null). 바뀌지 않으면 undefined */
export function strippedImageUrl(post: { status: string; created_at: string; image_url: string | null }, now = Date.now()): string | null | undefined {
  if (post.status !== "published" || !post.image_url) return undefined;
  if (new Date(post.created_at).getTime() >= now - POST_IMAGE_RETENTION_DAYS * DAY) return undefined;
  const all = post.image_url.split(",").map((u) => u.trim()).filter(Boolean);
  const kept = all.filter((u) => !postImagePath(u));
  if (kept.length === all.length) return undefined;
  return kept.length ? kept.join(",") : null;
}

/** 지울 파일: 30일 지남 + 어떤 글도 가리키지 않음 */
export function expiredUnreferenced(files: { path: string; createdAt: string | null }[], used: Set<string>, now = Date.now()): string[] {
  const cutoff = now - POST_IMAGE_RETENTION_DAYS * DAY;
  return files.filter((f) => f.createdAt && new Date(f.createdAt).getTime() < cutoff && !used.has(f.path)).map((f) => f.path);
}

/** 같은 post-images 버킷·같은 회원 폴더를 쓰는 다른 프로그램의 글 표(image_url·video_url 칸) */
export const SHARED_BUCKET_TABLES = ["tap_posts", "ncafe_posts"] as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 모든 회원 폴더를 돌며 정리한다. admin = 서비스 키 클라이언트 */
export async function cleanupPostImages(admin: SupabaseClient, now = Date.now()): Promise<{ members: number; removed: number; kept: number; postsCleared: number }> {
  // 1단계: 게시 완료 30일 지난 글의 사진 칸에서 이 버킷 주소를 뺀다(실패한 글은 그대로 → 그 파일은 아래에서 안 지워짐)
  // 30일 삭제 예외 회원(관리자·시험 계정, 2026-11-03)은 사진 칸·파일 모두 손대지 않는다. 목록을 못 읽으면 오류로 멈춘다.
  const exempt = await loadRetentionExemptIds(admin);
  const { data: oldPosts, error: oldError } = await admin.from("posts").select("id, user_id, status, created_at, image_url").eq("status", "published").not("image_url", "is", null);
  if (oldError) throw new Error(`posts 읽기 실패: ${oldError.message}`);
  let postsCleared = 0;
  for (const post of (oldPosts ?? []) as { id: string; user_id: string; status: string; created_at: string; image_url: string | null }[]) {
    if (exempt.has(post.user_id)) continue;
    const next = strippedImageUrl(post, now);
    if (next === undefined) continue;
    const { error } = await admin.from("posts").update({ image_url: next }).eq("id", post.id).eq("status", "published");
    if (!error) postsCleared += 1;
  }

  // 2단계: 지금 글들이 가리키는 파일을 다시 읽어, 어떤 글에도 쓰이지 않는 30일 지난 파일만 지운다
  const { data: posts, error: postsError } = await admin.from("posts").select("image_url");
  // 글 목록을 못 읽으면 무엇이 쓰이는지 모르므로 아무것도 지우지 않는다
  if (postsError) throw new Error(`posts 읽기 실패: ${postsError.message}`);
  const used = referencedPaths((posts ?? []).map((p: { image_url: string | null }) => p.image_url));
  // 2026-11-14: 이 버킷은 쓰레드 쇼핑제휴(tap_posts)·네이버 카페(ncafe_posts)도 같은 <회원>/ 폴더에 쓴다.
  // 그 글들이 가리키는 파일도 「쓰이는 파일」로 보고 남긴다(그 파일은 각 프로그램의 30일 정리가 지운다). 못 읽으면 아무것도 지우지 않는다.
  for (const table of SHARED_BUCKET_TABLES) {
    const { data: rows, error } = await admin.from(table).select("image_url, video_url");
    if (error) throw new Error(`${table} 읽기 실패: ${error.message}`);
    for (const path of referencedPaths((rows ?? []).flatMap((r: { image_url: string | null; video_url: string | null }) => [r.image_url, r.video_url]))) used.add(path);
  }

  const { data: dirs } = await admin.storage.from(POST_IMAGE_BUCKET).list("", { limit: 1000 });
  const counts: CleanupCounts = new Map();
  let members = 0;
  let removed = 0;
  let kept = 0;
  for (const dir of dirs ?? []) {
    if (dir.id || !UUID.test(dir.name) || exempt.has(dir.name)) continue; // 회원 폴더만(예외 회원 제외)
    members += 1;
    const { data: files } = await admin.storage.from(POST_IMAGE_BUCKET).list(dir.name, { limit: 1000, sortBy: { column: "created_at", order: "asc" } });
    const list = (files ?? []).filter((f) => f.id).map((f) => ({ path: `${dir.name}/${f.name}`, createdAt: f.created_at ?? null }));
    const expired = expiredUnreferenced(list, used, now);
    kept += list.length - expired.length;
    for (let i = 0; i < expired.length; i += 100) {
      const batch = expired.slice(i, i + 100);
      const { error } = await admin.storage.from(POST_IMAGE_BUCKET).remove(batch);
      if (!error) {
        removed += batch.length;
        addCleanupCount(counts, dir.name, "images", batch.length);
      }
    }
  }
  await logCleanupUsage(admin, "auto-threads-posting", counts);
  return { members, removed, kept, postsCleared };
}
