import "server-only";
// 30일 자동 정리 — DB 함수 wba_cleanup(관리자·시험 계정 profiles.retention_exempt 제외)이
// 만료 원고를 지우고 그 이미지 경로를 돌려주면 저장소에서도 지운다.
// 구글 블로그에 발행·예약된 글(keep_images)은 본문만 비우고 기록·이미지를 남긴다(주인님 2026-11-11 「발행이미지만 보관」).
import { BUCKET } from "./image/service";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminDb = { rpc: (fn: string) => any; storage: { from: (bucket: string) => any } };

export async function runCleanup(admin: AdminDb): Promise<{ removedImages: number; failedBatches: number }> {
  const { data, error } = await admin.rpc("wba_cleanup");
  if (error) throw new Error("cleanup_failed");
  const paths = (Array.isArray(data) ? data : []).map((r: { image_path?: string }) => r?.image_path).filter((p: unknown): p is string => typeof p === "string" && p.length > 0);
  let failedBatches = 0;
  for (let i = 0; i < paths.length; i += 100) {
    const { error: rmErr } = await admin.storage.from(BUCKET).remove(paths.slice(i, i + 100));
    if (rmErr) failedBatches++;
  }
  return { removedImages: paths.length, failedBatches };
}
