"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { generateInstagramCaption } from "@/lib/ai/posting";
import { getInstagramAuthorizeUrl, publishInstagramReel } from "@/lib/instagram/client";

export async function connectInstagramAction() {
  const user = await requireUser();
  // CSRF 방지 및 콜백에서 사용자를 식별하기 위한 state 값 (user.id를 그대로 사용).
  // 인스타그램은 유튜브와 달리 buylife 소유의 Meta 앱 하나로 모든 사용자를 받는다
  // (threads와 동일한 방식 — Meta는 유튜브와 달리 앱 하나로 여러 사용자를 받는 게 정상 허용됨).
  redirect(getInstagramAuthorizeUrl(user.id));
}

export async function disconnectInstagramAction() {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase.from("instagram_accounts").delete().eq("user_id", user.id);
  revalidatePath("/scripts");
}

export interface GenerateCaptionState {
  error?: string;
  caption?: string;
}

/** 제목/스크립트로 인스타그램 캡션을 생성해 저장한다. 게시 전 화면에서 수정할 수 있다. */
export async function generateInstagramCaptionAction(
  _prevState: GenerateCaptionState,
  formData: FormData,
): Promise<GenerateCaptionState> {
  const user = await requireUser();
  const videoId = String(formData.get("videoId") ?? "");
  if (!videoId) return { error: "videoId가 없습니다." };

  const supabase = await createClient();
  const { data: video } = await supabase
    .from("shorts_videos")
    .select("title, full_script")
    .eq("user_id", user.id)
    .eq("id", videoId)
    .single();
  if (!video) return { error: "영상을 찾을 수 없습니다." };

  const apiKey = await resolveApiKey(supabase, user.id, "openai");
  try {
    const caption = await generateInstagramCaption(video.title, video.full_script, apiKey ?? "");
    await supabase.from("shorts_videos").update({ instagram_caption: caption }).eq("id", videoId);
    revalidatePath(`/scripts/${videoId}`);
    return { caption };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "캡션 생성 중 오류가 발생했습니다." };
  }
}

export interface PostInstagramState {
  error?: string;
  success?: boolean;
}

/** 렌더링된 영상을 인스타그램 릴스로 게시한다 (피드 공유 없음, 릴스만). */
export async function postToInstagramAction(
  _prevState: PostInstagramState,
  formData: FormData,
): Promise<PostInstagramState> {
  const user = await requireUser();
  const videoId = String(formData.get("videoId") ?? "");
  const caption = String(formData.get("caption") ?? "").trim();
  if (!videoId) return { error: "videoId가 없습니다." };
  if (!caption) return { error: "캡션을 먼저 생성하거나 입력해주세요." };

  const supabase = await createClient();

  const { data: video } = await supabase
    .from("shorts_videos")
    .select("id, rendered_video_url, render_status")
    .eq("user_id", user.id)
    .eq("id", videoId)
    .single();
  if (!video) return { error: "영상을 찾을 수 없습니다." };
  if (video.render_status !== "ready" || !video.rendered_video_url) {
    return { error: "먼저 영상 생성을 완료해주세요." };
  }

  const { data: account } = await supabase
    .from("instagram_accounts")
    .select("ig_user_id, access_token")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!account) return { error: "인스타그램 계정이 연결되어 있지 않습니다." };

  await supabase
    .from("shorts_videos")
    .update({ instagram_status: "posting", instagram_caption: caption })
    .eq("id", videoId);

  try {
    const result = await publishInstagramReel({
      accessToken: account.access_token,
      igUserId: account.ig_user_id,
      videoUrl: video.rendered_video_url,
      caption,
    });

    await supabase
      .from("shorts_videos")
      .update({ instagram_status: "posted", instagram_post_url: result.permalink })
      .eq("id", videoId);

    revalidatePath(`/scripts/${videoId}`);
    return { success: true };
  } catch (err) {
    await supabase.from("shorts_videos").update({ instagram_status: "failed" }).eq("id", videoId);
    revalidatePath(`/scripts/${videoId}`);
    return { error: err instanceof Error ? err.message : "인스타그램 게시 중 오류가 발생했습니다." };
  }
}
