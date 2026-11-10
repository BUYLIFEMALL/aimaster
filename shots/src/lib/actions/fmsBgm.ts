"use server";

// v1.46 AI 무료음악 자동화에서 받은 곡을 영상의 배경음악으로(백로그 D-6). 설명: src/lib/fmsBgm.ts
// 파일은 서버를 거치지 않고 브라우저가 일회용 주소로 shots-bgm 회원 폴더에 바로 올린다(요청 한도 4.5MB 때문).
// 배경음악 곡 파일은 다른 곡과 같이 30일 정리 대상이 아니다(cleanup-videos 설명 참고 — 영상에서 곡을 지우면 함께 지워짐).
import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FMS_MAX_BYTES, findSameFmsTrack, fmsBgmPath, fmsFileName, fmsTrackTitle, isOwnFmsBgmPath } from "@/lib/fmsBgm";

const BUCKET = "shots-bgm";

async function ownVideo(userId: string, videoId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("shorts_videos").select("id, bgm_selected_track_id").eq("user_id", userId).eq("id", videoId).maybeSingle();
  return { supabase, video: data };
}

export async function startFmsBgmUploadAction(input: { videoId: string; name: string; size: number }): Promise<{ path?: string; token?: string; error?: string }> {
  const user = await requireProgramAccess();
  const name = fmsFileName(input.name);
  if (!(input.size > 0 && input.size <= FMS_MAX_BYTES)) return { error: "음악 파일은 15MB 이하만 넣을 수 있습니다. 짧은 곡을 골라 주세요." };
  const { video } = await ownVideo(user.id, input.videoId);
  if (!video) return { error: "넣을 영상을 찾지 못했습니다. 목록을 새로 고친 뒤 다시 골라 주세요." };
  const path = fmsBgmPath(user.id, video.id, crypto.randomUUID(), name);
  const { data, error } = await createAdminClient().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: "업로드 주소를 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  return { path, token: data.token };
}

export async function finishFmsBgmUploadAction(input: { videoId: string; path: string; name: string; seconds: number | null }): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireProgramAccess();
  if (!isOwnFmsBgmPath(input.path, user.id, input.videoId)) return { error: "잘못된 요청입니다." };
  const { supabase, video } = await ownVideo(user.id, input.videoId);
  if (!video) return { error: "넣을 영상을 찾지 못했습니다." };
  const storage = createAdminClient().storage.from(BUCKET);
  // 실제로 올라간 파일인지(회원 폴더) 확인
  const fileName = input.path.slice(user.id.length + 1);
  const { data: files } = await storage.list(user.id, { search: fileName, limit: 5 });
  const file = (files ?? []).find((f) => f.name === fileName);
  const bytes = Number((file?.metadata as { size?: number } | undefined)?.size ?? 0);
  if (!file || !(bytes > 0) || bytes > FMS_MAX_BYTES) {
    if (file) await storage.remove([input.path]);
    return { error: "올린 음악 파일을 찾지 못했습니다. 무료음악에서 다시 보내 주세요." };
  }
  const seconds = typeof input.seconds === "number" && input.seconds > 0 && input.seconds < 3600 ? Math.round(input.seconds) : null;
  const title = fmsTrackTitle(input.name);
  // 같은 영상에 같은 곡(제목·길이 같음)이 이미 있으면 새로 넣지 않고 그 곡을 고른다 — 다시 보낼 때 목록·저장 공간이 쌓이지 않게(2026-11-10)
  const { data: sameTracks } = await supabase
    .from("shorts_bgm_tracks")
    .select("id, title, duration_seconds")
    .eq("user_id", user.id)
    .eq("video_id", video.id)
    .eq("title", title);
  const existing = findSameFmsTrack(sameTracks ?? [], title, seconds);
  let trackId: string;
  if (existing) {
    await storage.remove([input.path]);
    trackId = existing.id;
  } else {
    const { data: inserted, error } = await supabase
      .from("shorts_bgm_tracks")
      .insert({
        video_id: video.id,
        user_id: user.id,
        audio_url: storage.getPublicUrl(input.path).data.publicUrl,
        image_url: null,
        title,
        duration_seconds: seconds,
      })
      .select("id")
      .single();
    if (error || !inserted) {
      await storage.remove([input.path]);
      return { error: "배경음악으로 저장하지 못했습니다. 잠시 뒤 다시 보내 주세요." };
    }
    trackId = inserted.id;
  }
  // 회원이 이 곡을 골라 보낸 것이므로 바로 선택한다(다른 곡은 그대로 남아 다시 고를 수 있음)
  await supabase.from("shorts_videos").update({ bgm_status: "ready", bgm_selected_track_id: trackId }).eq("user_id", user.id).eq("id", video.id);
  revalidatePath(`/scripts/${video.id}`);
  revalidatePath("/music");
  return { ok: true };
}
