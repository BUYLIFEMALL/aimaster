"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import {
  generateVideoScript,
  generateScriptSegments,
  generateBgmPrompt,
  generateSegmentImage,
  type NanoBananaModelType,
} from "@/lib/ai/script";

const SEGMENT_COUNT = 6;

/**
 * 수집된 쇼츠 후보로 전체 스크립트 + 6개 장면(내레이션/이미지 프롬프트) + BGM 프롬프트를 생성하고
 * 검토/수정 화면으로 이동한다. 이미지 생성은 여기서 하지 않는다 (검토 후 별도 버튼으로 진행).
 */
export async function generateScriptAction(formData: FormData) {
  const user = await requireUser();
  const candidateId = String(formData.get("candidateId") ?? "");
  if (!candidateId) throw new Error("candidateId가 없습니다.");

  const supabase = await createClient();
  const { data: candidate } = await supabase
    .from("shorts_candidates")
    .select("id, title, content")
    .eq("user_id", user.id)
    .eq("id", candidateId)
    .single();
  if (!candidate) throw new Error("쇼츠 후보를 찾을 수 없습니다.");

  const [geminiKey, openaiKey] = await Promise.all([
    resolveApiKey(supabase, user.id, "gemini"),
    resolveApiKey(supabase, user.id, "openai"),
  ]);

  const story = `${candidate.title}\n\n${candidate.content}`;
  const { title, script } = await generateVideoScript(story, geminiKey ?? "");
  const [segments, bgm] = await Promise.all([
    generateScriptSegments(script, openaiKey ?? ""),
    generateBgmPrompt(script, openaiKey ?? ""),
  ]);

  const { data: video, error: videoError } = await supabase
    .from("shorts_videos")
    .upsert(
      {
        user_id: user.id,
        candidate_id: candidateId,
        title,
        full_script: script,
        bgm_prompt: bgm.bgmPrompt,
        bgm_style: bgm.styleDescription,
        bgm_exclude: bgm.excludeStyles,
        status: "script_ready",
      },
      { onConflict: "candidate_id" },
    )
    .select("id")
    .single();
  if (videoError || !video) throw new Error(videoError?.message ?? "영상 레코드 생성에 실패했습니다.");

  // 재생성인 경우를 대비해 기존 장면을 지우고 새로 만든다.
  await supabase.from("shorts_video_segments").delete().eq("video_id", video.id);
  const { error: segmentsError } = await supabase.from("shorts_video_segments").insert(
    segments.map((s, i) => ({
      video_id: video.id,
      user_id: user.id,
      segment_index: i + 1,
      narration: s.narration,
      image_prompt: s.imagePrompt,
    })),
  );
  if (segmentsError) throw new Error(segmentsError.message);

  await supabase.from("shorts_candidates").update({ status: "requested" }).eq("id", candidateId);

  revalidatePath("/candidates");
  revalidatePath("/scripts");
  redirect(`/scripts/${video.id}`);
}

export interface SaveScriptEditsState {
  error?: string;
  success?: boolean;
}

/** 검토 화면에서 수정한 제목/쇼츠 스토리를 저장한다. 쇼츠 스토리는 유튜브 설명·인스타 캡션 생성에 그대로 쓰인다. */
export async function saveScriptEditsAction(
  _prevState: SaveScriptEditsState,
  formData: FormData,
): Promise<SaveScriptEditsState> {
  const user = await requireUser();
  const videoId = String(formData.get("videoId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const fullScript = String(formData.get("fullScript") ?? "").trim();
  if (!videoId || !title || !fullScript) return { error: "제목과 쇼츠 스토리를 입력해주세요." };

  const supabase = await createClient();

  const { error: updateError } = await supabase
    .from("shorts_videos")
    .update({ title, full_script: fullScript })
    .eq("user_id", user.id)
    .eq("id", videoId);
  if (updateError) return { error: updateError.message };

  revalidatePath(`/scripts/${videoId}`);
  return { success: true };
}

export interface SaveSegmentState {
  error?: string;
  success?: boolean;
}

/** 장면 하나의 대사·이미지 프롬프트만 저장한다. */
export async function saveSegmentAction(
  _prevState: SaveSegmentState,
  formData: FormData,
): Promise<SaveSegmentState> {
  const user = await requireUser();
  const segmentId = String(formData.get("segmentId") ?? "");
  const videoId = String(formData.get("videoId") ?? "");
  const narration = String(formData.get("narration") ?? "").trim();
  const imagePrompt = String(formData.get("imagePrompt") ?? "").trim();
  if (!segmentId || !narration || !imagePrompt) {
    return { error: "대사와 이미지 프롬프트를 입력해주세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("shorts_video_segments")
    .update({ narration, image_prompt: imagePrompt })
    .eq("user_id", user.id)
    .eq("id", segmentId);
  if (error) return { error: error.message };

  revalidatePath(`/scripts/${videoId}`);
  return { success: true };
}

async function uploadSegmentImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  videoId: string,
  segmentIndex: number,
  base64: string,
  mimeType: string,
): Promise<string> {
  const ext = mimeType.split("/")[1] ?? "png";
  const path = `${userId}/${videoId}-${segmentIndex}-${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("shorts-images")
    .upload(path, Buffer.from(base64, "base64"), { contentType: mimeType, upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  const { data: publicUrlData } = supabase.storage.from("shorts-images").getPublicUrl(path);
  return publicUrlData.publicUrl;
}

/** 새로 생성한 이미지를 기존 이력에 추가하고, 방금 만든 이미지를 기본 선택 상태로 표시한다. */
async function appendSegmentImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  segmentId: string,
  newImageUrl: string,
) {
  const { data: current } = await supabase
    .from("shorts_video_segments")
    .select("image_urls")
    .eq("id", segmentId)
    .single();

  const nextImageUrls = [...(current?.image_urls ?? []), newImageUrl];

  await supabase
    .from("shorts_video_segments")
    .update({ image_url: newImageUrl, image_urls: nextImageUrls })
    .eq("id", segmentId);
}

export interface GenerateImagesState {
  error?: string;
  success?: boolean;
}

/** 저장된(최신) 장면 내용으로 나노바나나 이미지 6장을 한번에 생성해서 Supabase Storage에 올린다. */
export async function generateSegmentImagesAction(
  _prevState: GenerateImagesState,
  formData: FormData,
): Promise<GenerateImagesState> {
  const user = await requireUser();
  const videoId = String(formData.get("videoId") ?? "");
  const model = String(formData.get("imageModel") ?? "nanobanana-2-2k") as NanoBananaModelType;
  if (!videoId) return { error: "videoId가 없습니다." };

  const supabase = await createClient();
  const { data: video } = await supabase
    .from("shorts_videos")
    .select("id")
    .eq("user_id", user.id)
    .eq("id", videoId)
    .single();
  if (!video) return { error: "영상을 찾을 수 없습니다." };

  const { data: segments } = await supabase
    .from("shorts_video_segments")
    .select("id, segment_index, image_prompt")
    .eq("user_id", user.id)
    .eq("video_id", videoId)
    .order("segment_index", { ascending: true });
  if (!segments || segments.length !== SEGMENT_COUNT) {
    return { error: "장면 정보가 올바르지 않습니다." };
  }

  await supabase.from("shorts_videos").update({ status: "images_generating" }).eq("id", videoId);

  const geminiKey = await resolveApiKey(supabase, user.id, "gemini");

  try {
    for (const segment of segments) {
      const { base64, mimeType } = await generateSegmentImage(segment.image_prompt, geminiKey ?? "", model);
      const imageUrl = await uploadSegmentImage(
        supabase,
        user.id,
        videoId,
        segment.segment_index,
        base64,
        mimeType,
      );
      await appendSegmentImage(supabase, segment.id, imageUrl);
    }
  } catch (err) {
    await supabase.from("shorts_videos").update({ status: "script_ready" }).eq("id", videoId);
    return { error: err instanceof Error ? err.message : "이미지 생성 중 오류가 발생했습니다." };
  }

  await supabase.from("shorts_videos").update({ status: "images_ready" }).eq("id", videoId);
  revalidatePath(`/scripts/${videoId}`);
  return { success: true };
}

export interface RegenerateImageState {
  error?: string;
  success?: boolean;
}

/**
 * 장면 하나의 이미지를 다시 생성한다. 화면에서 대사/이미지 프롬프트를 고친 뒤 저장을 누르지
 * 않고 바로 눌러도, 폼에 실려온 최신 값을 먼저 저장한 다음 그 프롬프트로 생성한다.
 * 마음에 들 때까지 반복 호출 가능.
 */
export async function regenerateSegmentImageAction(
  _prevState: RegenerateImageState,
  formData: FormData,
): Promise<RegenerateImageState> {
  const user = await requireUser();
  const segmentId = String(formData.get("segmentId") ?? "");
  const videoId = String(formData.get("videoId") ?? "");
  const model = String(formData.get("imageModel") ?? "nanobanana-2-2k") as NanoBananaModelType;
  const narration = String(formData.get("narration") ?? "").trim();
  const imagePrompt = String(formData.get("imagePrompt") ?? "").trim();
  if (!segmentId || !videoId) return { error: "segmentId가 없습니다." };

  const supabase = await createClient();

  if (narration && imagePrompt) {
    const { error: saveError } = await supabase
      .from("shorts_video_segments")
      .update({ narration, image_prompt: imagePrompt })
      .eq("user_id", user.id)
      .eq("id", segmentId);
    if (saveError) return { error: saveError.message };
  }

  const { data: segment } = await supabase
    .from("shorts_video_segments")
    .select("id, segment_index, image_prompt")
    .eq("user_id", user.id)
    .eq("id", segmentId)
    .single();
  if (!segment) return { error: "장면을 찾을 수 없습니다." };

  const geminiKey = await resolveApiKey(supabase, user.id, "gemini");

  try {
    const { base64, mimeType } = await generateSegmentImage(segment.image_prompt, geminiKey ?? "", model);
    const imageUrl = await uploadSegmentImage(
      supabase,
      user.id,
      videoId,
      segment.segment_index,
      base64,
      mimeType,
    );
    await appendSegmentImage(supabase, segment.id, imageUrl);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "이미지 생성 중 오류가 발생했습니다." };
  }

  revalidatePath(`/scripts/${videoId}`);
  return { success: true };
}

export interface SelectImageState {
  error?: string;
  success?: boolean;
}

/** 생성 이력 중 하나를 이 장면의 최종 사용 이미지로 선택한다. */
export async function selectSegmentImageAction(
  _prevState: SelectImageState,
  formData: FormData,
): Promise<SelectImageState> {
  const user = await requireUser();
  const segmentId = String(formData.get("segmentId") ?? "");
  const videoId = String(formData.get("videoId") ?? "");
  const imageUrl = String(formData.get("imageUrl") ?? "");
  if (!segmentId || !imageUrl) return { error: "선택할 이미지가 없습니다." };

  const supabase = await createClient();
  const { data: segment } = await supabase
    .from("shorts_video_segments")
    .select("id, image_urls")
    .eq("user_id", user.id)
    .eq("id", segmentId)
    .single();
  if (!segment) return { error: "장면을 찾을 수 없습니다." };
  if (!segment.image_urls.includes(imageUrl)) {
    return { error: "이 장면에서 생성된 이미지가 아닙니다." };
  }

  const { error } = await supabase
    .from("shorts_video_segments")
    .update({ image_url: imageUrl })
    .eq("id", segmentId);
  if (error) return { error: error.message };

  revalidatePath(`/scripts/${videoId}`);
  return { success: true };
}
