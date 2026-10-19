"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProgramAccess } from "@/lib/access";
import { postFormSchema } from "@/lib/validation";
import { publishPost } from "@/lib/posts/publish-core";
import { dispatchScheduledPostsForUser } from "@/lib/posts/dispatch";
import { isPublishStuck } from "@/lib/posts/publishStatus";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureMemberSchedulerRunning, memberCronjobKey, memberSchedulerMode, platformSchedulerEnabled } from "@/lib/posts/memberScheduler";
import type { InstaPostType } from "@/types/database.types";

export interface PostActionState {
  error?: string;
}

interface SlideInput {
  imagePrompt: string;
  imageUrl: string;
  sourceParagraph?: string;
}

async function getInstagramAccountOrError(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("insta_accounts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("먼저 인스타그램 계정을 연결해주세요.");
  }
  return data;
}

function parseHashtags(raw: FormDataEntryValue | null): string[] {
  return String(raw ?? "")
    .split(/[,\s#]+/)
    .map((h) => h.trim())
    .filter(Boolean);
}

function parseSlides(raw: FormDataEntryValue | null): SlideInput[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is SlideInput => typeof s?.imageUrl === "string" && s.imageUrl.trim().length > 0,
    );
  } catch {
    return [];
  }
}

function parsePostForm(formData: FormData) {
  return postFormSchema.safeParse({
    postType: formData.get("postType"),
    caption: formData.get("caption"),
    hashtags: formData.get("hashtags") ?? "",
    slidesJson: formData.get("slidesJson") ?? "",
    publishMode: formData.get("publishMode"),
    scheduledAt: formData.get("scheduledAt") ?? "",
  });
}

async function insertSlides(
  supabase: Awaited<ReturnType<typeof createClient>>,
  postId: string,
  userId: string,
  slides: SlideInput[],
) {
  const { error } = await supabase.from("insta_post_slides").insert(
    slides.map((s, i) => ({
      post_id: postId,
      user_id: userId,
      slide_order: i + 1,
      source_paragraph: s.sourceParagraph ?? null,
      image_prompt: s.imagePrompt,
      image_url: s.imageUrl,
      image_urls: [s.imageUrl],
    })),
  );
  if (error) throw new Error(error.message);
}

/**
 * 예약 전 확인(v1.25): 회원이 고른 실행 방식이 준비됐는가. 「내 cron-job.org」면 본인 키를 돌려준다(예약 뒤 작업을 켜는 데 씀).
 * 지침: 루트 docs/SCHEDULER_POLICY.md
 */
async function checkScheduleReady(userId: string): Promise<{ error?: string; cronjobKey: string | null }> {
  const service = createAdminClient() as unknown as SupabaseClient;
  const mode = await memberSchedulerMode(service, userId);
  if (mode === "cronjob") {
    const key = await memberCronjobKey(service, userId);
    if (!key) return { cronjobKey: null, error: "「내 cron-job.org」 방식은 API 키가 필요합니다. 설정 → ⏰ 예약 발행에서 키를 등록하거나 Vercel 방식을 선택해 주세요." };
    return { cronjobKey: key };
  }
  if (!platformSchedulerEnabled()) return { cronjobKey: null, error: "이 사이트는 Vercel 예약 호출이 꺼져 있습니다. 설정 → ⏰ 예약 발행에서 「내 cron-job.org」를 선택하고 키를 등록해 주세요." };
  return { cronjobKey: null };
}

/** 예약 뒤(v1.25): 「내 cron-job.org」 회원이면 작업을 켠다. 실패하면 예약을 초안으로 되돌리고 안내를 돌려준다. */
async function startMemberScheduler(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, postId: string, cronjobKey: string | null): Promise<string | null> {
  if (!cronjobKey) return null;
  try {
    await ensureMemberSchedulerRunning(createAdminClient() as unknown as SupabaseClient, userId, cronjobKey);
    return null;
  } catch (err) {
    await supabase.from("insta_posts").update({ status: "draft", scheduled_at: null }).eq("id", postId).eq("user_id", userId).eq("status", "scheduled");
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

  const slides = parseSlides(formData.get("slidesJson"));
  if (slides.length === 0) {
    return { error: "이미지를 먼저 생성해주세요. 인스타그램 게시물은 이미지가 필수입니다." };
  }

  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { postType, caption, publishMode, scheduledAt } = parsed.data;
  const hashtags = parseHashtags(formData.get("hashtags"));

  const status = publishMode === "now" ? "draft" : publishMode === "schedule" ? "scheduled" : "draft";
  const schedule = publishMode === "schedule" ? await checkScheduleReady(user.id) : null;
  if (schedule?.error) return { error: schedule.error };

  const { data: inserted, error } = await supabase
    .from("insta_posts")
    .insert({
      user_id: user.id,
      post_type: postType as InstaPostType,
      caption,
      hashtags,
      cover_image_url: slides[0].imageUrl,
      status,
      scheduled_at: publishMode === "schedule" ? scheduledAt : null,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { error: error?.message ?? "게시글 저장에 실패했습니다." };
  }

  try {
    await insertSlides(supabase, inserted.id, user.id, slides);
  } catch (err) {
    const message = err instanceof Error ? err.message : "슬라이드 저장에 실패했습니다.";
    return { error: message };
  }

  // 슬라이드까지 저장한 뒤에 예약 실행 작업을 켠다(이미지 없이 발행이 시작되지 않게)
  if (schedule) {
    const scheduleError = await startMemberScheduler(supabase, user.id, inserted.id, schedule.cronjobKey);
    if (scheduleError) return { error: scheduleError };
  }

  if (publishMode === "now") {
    try {
      const account = await getInstagramAccountOrError(supabase, user.id);
      await publishPost({
        supabase,
        postId: inserted.id,
        userId: user.id,
        caption,
        hashtags,
        igUserId: account.ig_user_id,
        accessToken: account.access_token,
        authMethod: account.auth_method,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "게시에 실패했습니다.";
      await supabase.from("insta_posts").update({ status: "failed", error_message: message }).eq("id", inserted.id);
    }
  }

  revalidatePath("/posts");
  redirect(`/posts/${inserted.id}`);
}

/**
 * 글 수정. 슬라이드(이미지)는 이 액션이 아니라 각 슬라이드의 재생성/선택 액션
 * (`src/lib/actions/slides.ts`)으로 독립적으로 즉시 반영되므로 여기서는 건드리지 않는다.
 */
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
  const { caption, publishMode, scheduledAt } = parsed.data;
  const hashtags = parseHashtags(formData.get("hashtags"));

  const { data: existing } = await supabase
    .from("insta_posts")
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
    .from("insta_posts")
    .update({
      caption,
      hashtags,
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
      const account = await getInstagramAccountOrError(supabase, user.id);
      await publishPost({
        supabase,
        postId,
        userId: user.id,
        caption,
        hashtags,
        igUserId: account.ig_user_id,
        accessToken: account.access_token,
        authMethod: account.auth_method,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "게시에 실패했습니다.";
      await supabase.from("insta_posts").update({ status: "failed", error_message: message }).eq("id", postId);
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

  await supabase.from("insta_posts").delete().eq("id", postId).eq("user_id", user.id);

  revalidatePath("/posts");
  redirect("/posts");
}

export async function publishNowAction(formData: FormData) {
  const postId = String(formData.get("postId"));
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("insta_posts")
    .select("*")
    .eq("id", postId)
    .eq("user_id", user.id)
    .single();

  if (!post) {
    redirect("/posts");
  }

  // 이미 게시 완료됐거나(중복 클릭), 아직 처리 중일 가능성이 있는(updated_at이 최근인)
  // "publishing" 건은 다시 publishPost()를 호출하지 않는다. 버튼이 disabled/hidden 처리돼
  // 있어도 폼 자체를 다시 제출(새로고침 중 재전송 등)하면 요청이 서버까지 도달할 수 있어,
  // 실제 게시를 트리거하는 마지막 방어선은 이 서버 쪽 상태 확인이다.
  const alreadyHandled =
    post.status === "published" || (post.status === "publishing" && !isPublishStuck(post.status, post.updated_at));

  if (!alreadyHandled) {
    try {
      const account = await getInstagramAccountOrError(supabase, user.id);
      await publishPost({
        supabase,
        postId: post.id,
        userId: user.id,
        caption: post.caption,
        hashtags: post.hashtags ?? [],
        igUserId: account.ig_user_id,
        accessToken: account.access_token,
        authMethod: account.auth_method,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "게시에 실패했습니다.";
      await supabase.from("insta_posts").update({ status: "failed", error_message: message }).eq("id", postId);
    }
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
