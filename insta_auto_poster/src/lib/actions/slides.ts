"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { generatePostImage, type NanoBananaModelType } from "@/lib/ai/generator";

// shots/src/lib/actions/scripts.ts의 "장면당 이미지 생성+수정" 패턴을 그대로 이식했다.
// insta_post_slides.image_url(활성 이미지) + image_urls(생성 이력 배열) 구조.
// (insta_auto_poster/README.md "카드뉴스 아키텍처 결정" 참고)

export interface SlideActionState {
  error?: string;
}

async function uploadSlideImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  base64: string,
  mimeType: string,
): Promise<string> {
  const ext = mimeType.split("/")[1] ?? "png";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("insta-post-images")
    .upload(path, Buffer.from(base64, "base64"), { contentType: mimeType, upsert: false });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("insta-post-images").getPublicUrl(path);
  return data.publicUrl;
}

/** 새 이미지 URL을 이력 배열에 추가하고, 활성 이미지도 그 새 이미지로 교체한다. */
async function appendSlideImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  slideId: string,
  userId: string,
  newImageUrl: string,
  imagePrompt: string,
) {
  const { data: slide } = await supabase
    .from("insta_post_slides")
    .select("image_urls")
    .eq("id", slideId)
    .eq("user_id", userId)
    .single();

  const nextUrls = [...(slide?.image_urls ?? []), newImageUrl];

  const { error } = await supabase
    .from("insta_post_slides")
    .update({ image_url: newImageUrl, image_urls: nextUrls, image_prompt: imagePrompt })
    .eq("id", slideId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

/** 슬라이드 하나의 이미지 프롬프트를 저장한다 (재생성 없이 텍스트만 수정할 때). */
export async function saveSlidePromptAction(formData: FormData) {
  const user = await requireProgramAccess();
  const slideId = String(formData.get("slideId") ?? "");
  const imagePrompt = String(formData.get("imagePrompt") ?? "").trim();
  const postId = String(formData.get("postId") ?? "");
  const supabase = await createClient();

  await supabase
    .from("insta_post_slides")
    .update({ image_prompt: imagePrompt })
    .eq("id", slideId)
    .eq("user_id", user.id);

  if (postId) revalidatePath(`/posts/${postId}/edit`);
}

/** 슬라이드 하나의 이미지를 (재)생성해서 이력에 추가하고 활성 이미지로 설정한다. */
export async function regenerateSlideImageAction(
  _prevState: SlideActionState,
  formData: FormData,
): Promise<SlideActionState> {
  const user = await requireProgramAccess();
  const slideId = String(formData.get("slideId") ?? "");
  const postId = String(formData.get("postId") ?? "");
  const imagePrompt = String(formData.get("imagePrompt") ?? "").trim();
  const model = (String(formData.get("model") ?? "") || undefined) as NanoBananaModelType | undefined;
  const apiKeyOverride = String(formData.get("apiKey") ?? "").trim();

  if (!imagePrompt) {
    return { error: "이미지 프롬프트를 입력해주세요." };
  }

  try {
    const supabase = await createClient();
    const apiKey = apiKeyOverride || (await resolveApiKey(supabase, user.id, "gemini"));
    if (!apiKey) {
      return { error: "Gemini API 키가 없습니다. 설정 페이지에서 본인 키를 등록해주세요." };
    }

    const result = await generatePostImage({ prompt: imagePrompt, model }, apiKey);
    const imageUrl = await uploadSlideImage(supabase, user.id, result.base64, result.mimeType);
    await appendSlideImage(supabase, slideId, user.id, imageUrl, imagePrompt);

    if (postId) revalidatePath(`/posts/${postId}/edit`);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "이미지 생성에 실패했습니다." };
  }
}

/** 이력 갤러리에서 후보 이미지를 클릭했을 때, 그 이미지를 활성 이미지로 전환한다. */
export async function selectSlideImageAction(
  _prevState: SlideActionState,
  formData: FormData,
): Promise<SlideActionState> {
  const user = await requireProgramAccess();
  const slideId = String(formData.get("slideId") ?? "");
  const postId = String(formData.get("postId") ?? "");
  const imageUrl = String(formData.get("imageUrl") ?? "");

  const supabase = await createClient();
  const { data: slide } = await supabase
    .from("insta_post_slides")
    .select("image_urls")
    .eq("id", slideId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!slide || !(slide.image_urls ?? []).includes(imageUrl)) {
    return { error: "선택할 수 없는 이미지입니다." };
  }

  await supabase
    .from("insta_post_slides")
    .update({ image_url: imageUrl })
    .eq("id", slideId)
    .eq("user_id", user.id);

  if (postId) revalidatePath(`/posts/${postId}/edit`);
  return {};
}
