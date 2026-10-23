import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// 4MB 넘는 문서(L2): 화면이 비공개 버킷에 직접 올리고, 서버가 읽은 뒤 바로 지운다(원본 보관 안 함).
// 경로는 항상 `<회원 id>/<시각>-<무작위>.<확장자>` — 서버는 자기 회원 폴더 경로만 받아들인다.
// Storage 파일은 SQL(pg_cron)로 지울 수 없어(ERROR_LESSONS 2026-10-17), 업로드 주소를 발급할 때마다
// 그 회원 폴더의 1시간 지난 파일(처리 도중 끊긴 것)을 함께 지운다.

export const UPLOAD_BUCKET = "dcb-uploads";
const STALE_MS = 60 * 60 * 1000;

export async function removeUpload(admin: SupabaseClient, path: string): Promise<void> {
  await admin.storage.from(UPLOAD_BUCKET).remove([path]);
}

export async function removeStaleUploads(admin: SupabaseClient, userId: string): Promise<void> {
  const { data } = await admin.storage.from(UPLOAD_BUCKET).list(userId, { limit: 100 });
  const stale = (data ?? []).filter((f) => f.created_at && Date.now() - Date.parse(f.created_at) > STALE_MS).map((f) => `${userId}/${f.name}`);
  if (stale.length) await admin.storage.from(UPLOAD_BUCKET).remove(stale);
}

export function uploadPathFor(userId: string, fileName: string): string {
  const ext = (fileName.toLowerCase().split(".").pop() ?? "bin").replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
  return `${userId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
}
