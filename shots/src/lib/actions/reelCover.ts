"use server";

import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { REEL_COVER_BUCKET, REEL_COVER_MAX_BYTES, reelCoverFolder, reelCoverPath } from "@/lib/instagram/reelCover";

// v1.35 릴스 표지 이미지 — 브라우저가 일회용 주소로 저장소에 바로 올리고(영상 올리기와 같은 방식), 서버는 주소 발급·확인·삭제만 한다.
// 경로는 항상 `<회원 id>/covers/<영상 id>.jpg`라 다른 회원 파일에 쓸 수 없다.

async function ownVideo(videoId: string) {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { data: video } = await supabase.from("shorts_videos").select("id").eq("user_id", user.id).eq("id", videoId).maybeSingle();
  return video ? user : null;
}

/** 저장된 표지의 공개 주소(JPG·8MB 이하만, 없으면 null). 주소 끝의 ?v=는 다시 올렸을 때 예전 그림이 쓰이지 않게 하려는 값 */
export async function findReelCoverUrl(userId: string, videoId: string): Promise<string | null> {
  const storage = createAdminClient().storage.from(REEL_COVER_BUCKET);
  const { data } = await storage.list(reelCoverFolder(userId), { limit: 10, search: `${videoId}.jpg` });
  const file = data?.find((f) => f.name === `${videoId}.jpg` && f.id !== null);
  if (!file) return null;
  const meta = (file.metadata ?? {}) as { mimetype?: string; size?: number };
  if (meta.mimetype !== "image/jpeg" || !meta.size || meta.size > REEL_COVER_MAX_BYTES) return null;
  const url = storage.getPublicUrl(reelCoverPath(userId, videoId)).data.publicUrl;
  return `${url}?v=${encodeURIComponent(file.updated_at ?? file.created_at ?? "")}`;
}

export async function getReelCoverAction(videoId: string): Promise<{ url: string | null }> {
  const user = await ownVideo(videoId);
  return { url: user ? await findReelCoverUrl(user.id, videoId) : null };
}

export async function createReelCoverUploadAction(videoId: string): Promise<{ path?: string; token?: string; error?: string }> {
  const user = await ownVideo(videoId);
  if (!user) return { error: "영상을 찾을 수 없습니다." };
  const path = reelCoverPath(user.id, videoId);
  const { data, error } = await createAdminClient().storage.from(REEL_COVER_BUCKET).createSignedUploadUrl(path, { upsert: true });
  if (error || !data) return { error: "업로드 주소를 만들지 못했습니다. 잠시 후 다시 시도해 주세요." };
  return { path, token: data.token };
}

export async function removeReelCoverAction(videoId: string): Promise<{ error?: string }> {
  const user = await ownVideo(videoId);
  if (!user) return { error: "영상을 찾을 수 없습니다." };
  const { error } = await createAdminClient().storage.from(REEL_COVER_BUCKET).remove([reelCoverPath(user.id, videoId)]);
  return error ? { error: "표지를 지우지 못했습니다. 잠시 후 다시 시도해 주세요." } : {};
}
