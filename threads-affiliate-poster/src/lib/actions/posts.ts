"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getThreadsAccountForUser } from "@/lib/threads/memberAccount";
import { requireProgramAccess } from "@/lib/access";
import { postFormSchema } from "@/lib/validation";
import { publishPost } from "@/lib/posts/publish-core";
import { dispatchScheduledPostsForUser } from "@/lib/posts/dispatch";
import { extractStoragePathFromUrl } from "@/lib/mediaRetention";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureMemberSchedulerRunning, memberCronjobKey, memberSchedulerMode, platformSchedulerEnabled } from "@/lib/posts/memberScheduler";

export interface PostActionState {
  error?: string;
}

// v1.66: 공용 연결 계정(다른 Threads 프로그램에서 연결한 것 포함) → 없으면 이 프로그램 표
async function getThreadsAccountOrError(
  _supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const data = await getThreadsAccountForUser(userId);
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

/**
 * 예약 전 확인(v1.63): 회원이 고른 실행 방식이 준비됐는가. 「내 cron-job.org」면 본인 키를 돌려준다(예약 뒤 작업을 켜는 데 씀).
 * 지침: 루트 docs/SCHEDULER_POLICY.md
 */
async function checkScheduleReady(userId: string): Promise<{ error?: string; cronjobKey: string | null }> {
  const service = createAdminClient() as unknown as SupabaseClient;
  const mode = await memberSchedulerMode(service, userId);
  if (mode === "cronjob") {
    const key = await memberCronjobKey(service, userId);
    if (!key) return { cronjobKey: null, error: "「내 cron-job.org」 방식은 API 키가 필요합니다. 설정 → ⏰ 예약 발행에서 키를 등록하거나 「Vercel 예약 호출」을 선택해 주세요." };
    return { cronjobKey: key };
  }
  if (!platformSchedulerEnabled()) return { cronjobKey: null, error: "이 사이트는 Vercel 예약 호출이 꺼져 있습니다. 설정 → ⏰ 예약 발행에서 「내 cron-job.org」를 선택하고 키를 등록해 주세요." };
  return { cronjobKey: null };
}

/** 예약 저장 뒤: 「내 cron-job.org」 회원이면 회원 작업을 켠다. 실패하면 예약을 초안으로 되돌리고 오류를 돌려준다. */
async function startMemberScheduler(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, postId: string, cronjobKey: string | null): Promise<string | null> {
  if (!cronjobKey) return null;
  try {
    await ensureMemberSchedulerRunning(createAdminClient() as unknown as SupabaseClient, userId, cronjobKey);
    return null;
  } catch (err) {
    await supabase.from("tap_posts").update({ status: "draft", scheduled_at: null }).eq("id", postId).eq("user_id", userId).eq("status", "scheduled");
    return `예약 실행 작업을 켜지 못해 예약을 취소하고 초안으로 저장했습니다. ${err instanceof Error ? err.message : ""}`.trim();
  }
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
  const schedule = publishMode === "schedule" ? await checkScheduleReady(user.id) : null;
  if (schedule?.error) return { error: schedule.error };

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

  if (schedule) {
    const scheduleError = await startMemberScheduler(supabase, user.id, inserted.id, schedule.cronjobKey);
    if (scheduleError) return { error: scheduleError };
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
  const schedule = publishMode === "schedule" ? await checkScheduleReady(user.id) : null;
  if (schedule?.error) return { error: schedule.error };

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

  if (schedule) {
    const scheduleError = await startMemberScheduler(supabase, user.id, postId, schedule.cronjobKey);
    if (scheduleError) return { error: scheduleError };
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
