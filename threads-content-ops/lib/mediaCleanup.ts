import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { LEGACY_MEDIA_BUCKET, MEDIA_BUCKET, MEDIA_RETENTION_DAYS, memberMediaFolder, ownedMediaPath, type PostMedia } from "@/threads-content-ops/lib/media";

// 30일 보관 후 자동 삭제 (v1.59). 회원의 이 프로그램 전용 폴더(`<회원id>/threads-content-ops/{ai,up}`)에서
// 올린 지 30일이 지난 파일을 지우고, 그 파일을 쓰던 글(tco_posts.media)에서도 빼 준다. 다른 프로그램의 파일은 건드리지 않는다.
// 호출처: 하루 1회 크론(app/api/threads-content-ops/cleanup-media)과, 회원이 콘텐츠 생성·초안 화면을 열 때의 본인 몫 정리(크론이 안 돌아도 정리됨).

type Result = { removed: number; postsUpdated: number };

export async function cleanupUserMedia(service: SupabaseClient, userId: string, now = new Date()): Promise<Result> {
  const cutoff = now.getTime() - MEDIA_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const expired: string[] = [];

  for (const kind of ["ai", "up"] as const) {
    const folder = memberMediaFolder(userId, kind);
    const { data, error } = await service.storage.from(MEDIA_BUCKET).list(folder, { limit: 1000, sortBy: { column: "created_at", order: "asc" } });
    if (error || !data) continue;
    for (const file of data) {
      if (!file.name || !file.created_at) continue; // 폴더 항목은 건너뜀
      if (new Date(file.created_at).getTime() < cutoff) expired.push(`${folder}/${file.name}`);
    }
  }
  // v2.19: 옛 버킷(ai-image-generations)에 남은 이 프로그램 파일도 30일이 지나면 지운다(글 목록은 손대지 않음 — 이미 주소가 깨진 파일).
  let removed = 0;
  for (const kind of ["ai", "up"] as const) {
    const folder = memberMediaFolder(userId, kind);
    const { data } = await service.storage.from(LEGACY_MEDIA_BUCKET).list(folder, { limit: 1000, sortBy: { column: "created_at", order: "asc" } });
    const old = (data ?? []).filter((file) => file.name && file.created_at && new Date(file.created_at).getTime() < cutoff).map((file) => `${folder}/${file.name}`);
    for (let index = 0; index < old.length; index += 100) {
      const { error } = await service.storage.from(LEGACY_MEDIA_BUCKET).remove(old.slice(index, index + 100));
      if (!error) removed += Math.min(100, old.length - index);
    }
  }
  if (!expired.length) return { removed, postsUpdated: 0 };

  for (let index = 0; index < expired.length; index += 100) {
    const batch = expired.slice(index, index + 100);
    const { error } = await service.storage.from(MEDIA_BUCKET).remove(batch);
    if (!error) removed += batch.length;
  }

  // 지운 파일을 가리키는 글의 미디어 목록에서도 제거
  const gone = new Set(expired);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const { data: posts } = await service.from("tco_posts").select("id, media").eq("user_id", userId).neq("media", "[]");
  let postsUpdated = 0;
  for (const post of posts ?? []) {
    const media = (Array.isArray(post.media) ? post.media : []) as PostMedia[];
    const kept = media.filter((item) => {
      const path = ownedMediaPath(item.url, userId, supabaseUrl);
      return !(path && gone.has(path));
    });
    if (kept.length !== media.length) {
      const { error } = await service.from("tco_posts").update({ media: kept }).eq("id", post.id).eq("user_id", userId);
      if (!error) postsUpdated += 1;
    }
  }
  return { removed, postsUpdated };
}
