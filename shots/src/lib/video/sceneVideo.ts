import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// v1.32 장면 AI 영상 저장 위치(Shots 연결 코드): 공개 읽기 버킷 shots-videos의 `<회원>/<영상>-scenes/<장면 id>.mp4`.
// 표 구조를 바꾸지 않고 파일이 있는지로 판단한다. 완성 영상 폴더(`<회원>/<영상>/`)와 따로 둬서 「브라우저에서 만들기」의
// 이전 파일 정리에 지워지지 않게 하고, 30일 정리(/api/cron/cleanup-videos)는 `<회원>/<폴더>/<파일>`을 모두 훑으므로 함께 지워진다.
export const SCENE_BUCKET = "shots-videos";
export const MAX_SCENE_VIDEO_BYTES = 30 * 1024 * 1024;
const folder = (userId: string, videoId: string) => `${userId}/${videoId}-scenes`;

/** 장면 id → 공개 주소(바뀌면 새로 받도록 ?v=저장 시각) */
export async function listSceneVideos(userId: string, videoId: string): Promise<Record<string, string>> {
  const store = createAdminClient().storage.from(SCENE_BUCKET);
  const { data } = await store.list(folder(userId, videoId), { limit: 100 });
  const out: Record<string, string> = {};
  for (const f of data ?? []) {
    if (!f.id || !f.name.endsWith(".mp4")) continue;
    const url = store.getPublicUrl(`${folder(userId, videoId)}/${f.name}`).data.publicUrl;
    out[f.name.replace(/\.mp4$/, "")] = `${url}?v=${Date.parse(f.updated_at ?? f.created_at ?? "") || 0}`;
  }
  return out;
}

export async function saveSceneVideo(userId: string, videoId: string, segmentId: string, bytes: Buffer): Promise<string> {
  const store = createAdminClient().storage.from(SCENE_BUCKET);
  const path = `${folder(userId, videoId)}/${segmentId}.mp4`;
  const { error } = await store.upload(path, bytes, { contentType: "video/mp4", upsert: true });
  if (error) throw new Error("영상을 저장하지 못했습니다.");
  return `${store.getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
}

export async function deleteSceneVideo(userId: string, videoId: string, segmentId: string): Promise<void> {
  await createAdminClient().storage.from(SCENE_BUCKET).remove([`${folder(userId, videoId)}/${segmentId}.mp4`]);
}
