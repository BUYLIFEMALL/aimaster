"use server";

import { revalidatePath } from "next/cache";
import { logProgramUsage, requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// 「브라우저에서 만들기(무료)」 완성 MP4 저장 — 브라우저가 저장소(버킷 shots-videos)에 직접 올리고(Vercel 4.5MB 한도 회피),
// 서버는 일회용 업로드 주소 발급과 영상 주소 저장만 한다. 경로는 항상 `<회원 id>/<영상 id>/…`.
// 같은 영상을 다시 만들면 이전 파일은 바로 지운다. 30일 지난 파일은 /api/cron/cleanup-videos가 지운다.
const VIDEO_BUCKET = "shots-videos";

async function ownVideo(videoId: string) {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { data: video } = await supabase.from("shorts_videos").select("id").eq("user_id", user.id).eq("id", videoId).maybeSingle();
  return video ? { user, supabase } : null;
}

export async function createBrowserRenderUploadAction(videoId: string): Promise<{ path?: string; token?: string; error?: string }> {
  const own = await ownVideo(videoId);
  if (!own) return { error: "영상을 찾을 수 없습니다." };
  const path = `${own.user.id}/${videoId}/${Date.now()}.mp4`;
  const { data, error } = await createAdminClient().storage.from(VIDEO_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: "업로드 주소를 만들지 못했습니다. 잠시 후 다시 시도해 주세요." };
  return { path, token: data.token };
}

export async function saveBrowserRenderAction(videoId: string, path: string): Promise<{ error?: string }> {
  const own = await ownVideo(videoId);
  if (!own) return { error: "영상을 찾을 수 없습니다." };
  const folder = `${own.user.id}/${videoId}`;
  const name = path.startsWith(`${folder}/`) ? path.slice(folder.length + 1) : "";
  if (!/^\d+\.mp4$/.test(name)) return { error: "잘못된 파일 경로입니다." };

  const storage = createAdminClient().storage.from(VIDEO_BUCKET);
  const { data: files } = await storage.list(folder, { limit: 100 });
  if (!files?.some((f) => f.name === name)) return { error: "올린 영상 파일을 찾지 못했습니다. 다시 만들어 주세요." };
  const old = files.filter((f) => f.id !== null && f.name !== name).map((f) => `${folder}/${f.name}`);
  if (old.length) await storage.remove(old);

  const url = storage.getPublicUrl(path).data.publicUrl;
  const { error } = await own.supabase
    .from("shorts_videos")
    .update({ rendered_video_url: url, render_status: "ready", j2v_project_id: null })
    .eq("user_id", own.user.id)
    .eq("id", videoId);
  if (error) return { error: "영상 주소를 저장하지 못했습니다." };
  await logProgramUsage({ userId: own.user.id, action: "video_browser", metadata: { videoId } });
  revalidatePath(`/scripts/${videoId}`);
  return {};
}
