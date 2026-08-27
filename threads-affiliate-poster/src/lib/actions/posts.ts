"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProgramAccess } from "@/lib/access";
import { postFormSchema } from "@/lib/validation";
import { publishPost } from "@/lib/posts/publish-core";
import { dispatchScheduledPostsForUser } from "@/lib/posts/dispatch";

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
    videoFileName: formData.get("videoFileName") ?? "",
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
  const { content, imageUrl, videoFileName, publishMode, scheduledAt, productId } = parsed.data;

  const status = publishMode === "now" ? "draft" : publishMode === "schedule" ? "scheduled" : "draft";

  const { data: inserted, error } = await supabase
    .from("tap_posts")
    .insert({
      user_id: user.id,
      product_id: productId || null,
      content,
      image_url: imageUrl || null,
      video_filename: videoFileName || null,
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
  const { content, imageUrl, videoFileName, publishMode, scheduledAt } = parsed.data;

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
      video_filename: videoFileName || null,
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

  await supabase.from("tap_posts").delete().eq("id", postId).eq("user_id", user.id);

  revalidatePath("/posts");
  redirect("/posts");
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
