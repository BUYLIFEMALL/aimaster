"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProgramAccess } from "@/lib/access";
import { postFormSchema } from "@/lib/validation";
import { publishPost } from "@/lib/posts/publish-core";
import { dispatchScheduledPostsForUser } from "@/lib/posts/dispatch";
import { extractStoragePathFromUrl } from "@/lib/mediaRetention";

export interface PostActionState {
  error?: string;
}

async function getThreadsAccountOrError(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("tap_accounts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("먼저 Threads 계정을 연결해주세요.");
  }
  return data;
}

function parsePostForm(formData: FormData) {
  return postFormSchema.safeParse({
    content: formData.get("content"),
    imageUrl: formData.get("imageUrl") ?? "",
    videoUrl: formData.get("videoUrl") ?? "",
    publishMode: formData.get("publishMode"),
    scheduledAt: formData.get("scheduledAt") ?? "",
    productId: formData.get("productId") ?? "",
  });
}

export async function createPostAction(
  _prevState: PostActionState,
  formData: FormData,
): Promise<PostActionState> {
  const parsed = parsePostForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }

  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { content, imageUrl, videoUrl, publishMode, scheduledAt, productId } = parsed.data;

  const status = publishMode === "now" ? "draft" : publishMode === "schedule" ? "scheduled" : "draft";

  const { data: inserted, error } = await supabase
    .from("tap_posts")
    .insert({
      user_id: user.id,
      product_id: productId || null,
      content,
      image_url: imageUrl || null,
      video_url: videoUrl || null,
      status,
      scheduled_at: publishMode === "schedule" ? scheduledAt : null,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { error: error?.message ?? "게시글 저장에 실패했습니다." };
  }

  if (publishMode === "now") {
    try {
      const account = await getThreadsAccountOrError(supabase, user.id);
      await publishPost({
        supabase,
        postId: inserted.id,
        userId: user.id,
        content,
        imageUrl: imageUrl || null,
        videoUrl: videoUrl || null,
        threadsUserId: account.threads_user_id,
        accessToken: account.access_token,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "게시에 실패했습니다.";
      await supabase.from("tap_posts").update({ status: "failed", error_message: message }).eq("id", inserted.id);
    }
  }

  revalidatePath("/posts");
  redirect(`/posts/${inserted.id}`);
}

export async function updatePostAction(
  postId: string,
  _prevState: PostActionState,
  formData: FormData,
): Promise<PostActionState> {
  const parsed = parsePostForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }

  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { content, imageUrl, videoUrl, publishMode, scheduledAt } = parsed.data;

  const { data: existing } = await supabase
    .from("tap_posts")
    .select("status")
    .eq("id", postId)
    .eq("user_id", user.id)
    .single();

  if (!existing || existing.status === "published" || existing.status === "publishing") {
    return { error: "게시 완료되었거나 게시 중인 글은 수정할 수 없습니다." };
  }

  const status = publishMode === "schedule" ? "scheduled" : "draft";

  const { error } = await supabase
    .from("tap_posts")
    .update({
      content,
      image_url: imageUrl || null,
      video_url: videoUrl || null,
      status,
      scheduled_at: publishMode === "schedule" ? scheduledAt : null,
    })
    .eq("id", postId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  if (publishMode === "now") {
    try {
      const account = await getThreadsAccountOrError(supabase, user.id);
      await publishPost({
        supabase,
        postId,
        userId: user.id,
        content,
        imageUrl: imageUrl || null,
        videoUrl: videoUrl || null,
        threadsUserId: account.threads_user_id,
        accessToken: account.access_token,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "게시에 실패했습니다.";
      await supabase.from("tap_posts").update({ status: "failed", error_message: message }).eq("id", postId);
    }
  }

  revalidatePath("/posts");
  revalidatePath(`/posts/${postId}`);
  redirect(`/posts/${postId}`);
}


export async function deletePostAction(formData: FormData) {
  const postId = String(formData.get("postId"));
  const user = await requireProgramAccess();
  const supabase = await createClient();

  // 1) 삭제 전 연결된 미디어 파일 조회하여 Storage 파일도 함께 정리
  const { data: post } = await supabase
    .from("tap_posts")
    .select("image_url, video_url")
    .eq("id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (post) {
    const urls: string[] = [];
    if (post.image_url) urls.push(...post.image_url.split(",").map((u) => u.trim()));
    if (post.video_url) urls.push(...post.video_url.split(",").map((u) => u.trim()));

    const pathsToDelete = urls
      .map((u) => extractStoragePathFromUrl(u))
      .filter((p): p is string => Boolean(p && p.startsWith(`${user.id}/`)));

    if (pathsToDelete.length > 0) {
      await supabase.storage.from("post-images").remove(pathsToDelete);
    }
  }

  await supabase.from("tap_posts").delete().eq("id", postId).eq("user_id", user.id);

  revalidatePath("/posts");
  redirect("/posts");
}

/**
 * 사용자가 불필요한 미디어 파일을 수동으로 스토리지에서 삭제하는 서버 액션
 */
export async function deleteMediaFileAction(fileUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireProgramAccess();
    const path = extractStoragePathFromUrl(fileUrl);
    if (!path) return { success: false, error: "유효하지 않은 파일 주소입니다." };

    // 보안 검증: 본인 폴더 경로(userId/)만 삭제 가능
    if (!path.startsWith(`${user.id}/`)) {
      return { success: false, error: "본인이 업로드한 파일만 삭제할 수 있습니다." };
    }

    const supabase = await createClient();
    const { error } = await supabase.storage.from("post-images").remove([path]);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "삭제 중 오류가 발생했습니다." };
  }
}

export async function publishNowAction(formData: FormData) {
  const postId = String(formData.get("postId"));
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("tap_posts")
    .select("*")
    .eq("id", postId)
    .eq("user_id", user.id)
    .single();

  if (!post) {
    redirect("/posts");
  }

  try {
    const account = await getThreadsAccountOrError(supabase, user.id);
    await publishPost({
      supabase,
      postId: post.id,
      userId: user.id,
      content: post.content,
      imageUrl: post.image_url,
      videoUrl: post.video_url,
      threadsUserId: account.threads_user_id,
      accessToken: account.access_token,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "게시에 실패했습니다.";
    await supabase.from("tap_posts").update({ status: "failed", error_message: message }).eq("id", postId);
  }

  revalidatePath("/posts");
  revalidatePath(`/posts/${postId}`);
  redirect(`/posts/${postId}`);
}

export async function dispatchScheduledPostsAction() {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  await dispatchScheduledPostsForUser(supabase, user.id);

  revalidatePath("/posts");
  revalidatePath("/dashboard");
  redirect("/posts");
}
