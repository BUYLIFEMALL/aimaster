// v1.30 — 글 이미지(post-images/<회원>/) 30일 정리. 주인님 결정(2026-10-23): 「어떤 글에도 쓰이지 않는 파일만」 지운다.
// 글(posts.image_url, 상태와 상관없이)이 가리키는 파일과 30일이 안 된 파일은 남긴다 — 예약 게시·게시글 관리 미리보기가 깨지지 않게.
// 저장하지 않고 나간 업로드·무료 사진, 다시 만들기 전 AI 이미지가 대상. 호출처: 하루 1회 자동 실행 /api/cleanup-images.
import type { SupabaseClient } from "@supabase/supabase-js";
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

/** 지울 파일: 30일 지남 + 어떤 글도 가리키지 않음 */
export function expiredUnreferenced(files: { path: string; createdAt: string | null }[], used: Set<string>, now = Date.now()): string[] {
  const cutoff = now - POST_IMAGE_RETENTION_DAYS * DAY;
  return files.filter((f) => f.createdAt && new Date(f.createdAt).getTime() < cutoff && !used.has(f.path)).map((f) => f.path);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 모든 회원 폴더를 돌며 정리한다. admin = 서비스 키 클라이언트 */
export async function cleanupPostImages(admin: SupabaseClient, now = Date.now()): Promise<{ members: number; removed: number; kept: number }> {
  const { data: posts, error: postsError } = await admin.from("posts").select("image_url");
  // 글 목록을 못 읽으면 무엇이 쓰이는지 모르므로 아무것도 지우지 않는다
  if (postsError) throw new Error(`posts 읽기 실패: ${postsError.message}`);
  const used = referencedPaths((posts ?? []).map((p: { image_url: string | null }) => p.image_url));

  const { data: dirs } = await admin.storage.from(POST_IMAGE_BUCKET).list("", { limit: 1000 });
  const counts: CleanupCounts = new Map();
  let members = 0;
  let removed = 0;
  let kept = 0;
  for (const dir of dirs ?? []) {
    if (dir.id || !UUID.test(dir.name)) continue; // 회원 폴더만
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
  return { members, removed, kept };
}
