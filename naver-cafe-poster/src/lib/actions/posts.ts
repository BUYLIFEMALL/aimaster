"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProgramAccess } from "@/lib/access";
import { draftFormSchema } from "@/lib/validation";
import { publishCafePost } from "@/lib/posts/publish-core";
import { getNaverAccountOrError, getTargetOrError, resolveNaverAppCredentials } from "@/lib/naver/account";

export interface PostActionState {
  error?: string;
  success?: boolean;
}

function parseDraftForm(formData: FormData) {
  return draftFormSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    targetId: formData.get("targetId") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
    videoUrl: formData.get("videoUrl") ?? "",
  });
}

/** "AI 글쓰기"에서 초안을 저장한다 — 게시하지 않는다(생성 → 수정 → 검수 → 배포는 별도 단계). */
export async function saveDraftAction(
  _prevState: PostActionState,
  formData: FormData,
): Promise<PostActionState> {
  const parsed = parseDraftForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }

  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { title, content, targetId, imageUrl, videoUrl } = parsed.data;

  const { error } = await supabase.from("ncafe_posts").insert({
    user_id: user.id,
    target_id: targetId || null,
    title,
    content,
    image_url: imageUrl || null,
    video_url: videoUrl || null,
    status: "draft",
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/drafts");
  return { success: true };
}

/** 기존 초안(draft/failed)의 제목/본문/카페/이미지를 수정한다. 이미 게시된 글은 수정할 수 없다. */
export async function updateDraftAction(
  _prevState: PostActionState,
  formData: FormData,
): Promise<PostActionState> {
  const postId = String(formData.get("postId") ?? "");
  const parsed = parseDraftForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }

  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { title, content, targetId, imageUrl, videoUrl } = parsed.data;

  const { data: existing } = await supabase
    .from("ncafe_posts")
    .select("status")
    .eq("id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing || existing.status === "published" || existing.status === "publishing") {
    return { error: "게시 완료되었거나 게시 중인 글은 수정할 수 없습니다." };
  }

  const { error } = await supabase
    .from("ncafe_posts")
    .update({
      title,
      content,
      target_id: targetId || null,
      image_url: imageUrl || null,
      video_url: videoUrl || null,
    })
    .eq("id", postId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/drafts");
  return { success: true };
}

/**
 * 초안(draft/failed)을 수정한 내용 그대로 저장하고, 바로 이어서 실제 카페에 게시한다 —
 * "저장" 따로, "검수 완료·게시" 따로 두 번 누르지 않고 한 번에 끝내고 싶을 때 쓴다
 * (사용자 요청, 2026-09-16). updateDraftAction과 같은 검증을 거친 뒤 deployDraftAction의
 * 게시 로직을 그대로 이어서 실행하고, 결과 확인이 쉽도록 항상 게시글 관리로 이동시킨다.
 */
export async function saveAndDeployDraftAction(
  _prevState: PostActionState,
  formData: FormData,
): Promise<PostActionState> {
  const postId = String(formData.get("postId") ?? "");
  const parsed = parseDraftForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }

  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { title, content, targetId, imageUrl, videoUrl } = parsed.data;

  const { data: existing } = await supabase
    .from("ncafe_posts")
    .select("status")
    .eq("id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing || existing.status === "published" || existing.status === "publishing") {
    return { error: "게시 완료되었거나 게시 중인 글은 이 방식으로 게시할 수 없습니다." };
  }
  if (!targetId) {
    return { error: "등록할 카페를 선택해주세요." };
  }

  const { error: updateError } = await supabase
    .from("ncafe_posts")
    .update({
      title,
      content,
      target_id: targetId,
      image_url: imageUrl || null,
      video_url: videoUrl || null,
    })
    .eq("id", postId)
    .eq("user_id", user.id);

  if (updateError) {
    return { error: updateError.message };
  }

  try {
    const credentials = await resolveNaverAppCredentials(supabase, user.id);
    const account = await getNaverAccountOrError(supabase, user.id, credentials);
    const target = await getTargetOrError(supabase, user.id, targetId);
    await publishCafePost({
      supabase,
      postId,
      userId: user.id,
      title,
      content,
      imageUrl: imageUrl || null,
      videoUrl: videoUrl || null,
      accessToken: account.access_token,
      clubId: target.club_id,
      menuId: target.menu_id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "게시에 실패했습니다.";
    await supabase.from("ncafe_posts").update({ status: "failed", error_message: message }).eq("id", postId);
  }

  revalidatePath("/drafts");
  revalidatePath("/posts");
  revalidatePath(`/posts/${postId}`);
  redirect("/posts");
}

/** 검수가 끝난 초안을 실제 카페에 배포한다. */
export async function deployDraftAction(formData: FormData) {
  const postId = String(formData.get("postId"));
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("ncafe_posts")
    .select("*")
    .eq("id", postId)
    .eq("user_id", user.id)
    .single();

  if (!post) {
    redirect("/drafts");
  }
  if (!post.target_id) {
    return;
  }

  try {
    const credentials = await resolveNaverAppCredentials(supabase, user.id);
    const account = await getNaverAccountOrError(supabase, user.id, credentials);
    const target = await getTargetOrError(supabase, user.id, post.target_id);
    await publishCafePost({
      supabase,
      postId: post.id,
      userId: user.id,
      title: post.title,
      content: post.content,
      imageUrl: post.image_url,
      videoUrl: post.video_url,
      accessToken: account.access_token,
      clubId: target.club_id,
      menuId: target.menu_id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "게시에 실패했습니다.";
    await supabase.from("ncafe_posts").update({ status: "failed", error_message: message }).eq("id", postId);
  }

  revalidatePath("/drafts");
  revalidatePath("/posts");
  revalidatePath(`/posts/${postId}`);
  // 배포는 /drafts(AI 글쓰기), /posts(게시글 관리), /posts/[id](상세) 세 곳 어디서든 누를 수
  // 있는데, 원래는 redirect가 없어 "AI 글쓰기" 화면에서 누르면 그대로 그 화면에 남아있었다 —
  // 사용자가 "게시글 관리 화면으로 넘어가야 하는데 그대로 있다"고 지적(2026-09-13)해서,
  // 결과(성공/실패)를 바로 확인할 수 있는 게시글 관리 목록으로 항상 이동시킨다.
  redirect("/posts");
}

/**
 * 이미 게시(완료/실패)된 글도 제목/본문/이미지/영상/카페를 수정하고, 그 자리에서 바로
 * 다시 게시한다. 지금까지는 draft/failed만 updateDraftAction으로 고칠 수 있었고 published는
 * 아예 손댈 방법이 없었다 — "/posts에 편집 기능을 추가해서 수정한 내용을 다시 등록할 수
 * 있게 해달라"는 요청(2026-09-13)으로 새로 추가했다.
 *
 * 네이버 카페 오픈API에는 글쓰기(POST) 엔드포인트만 있고 수정 엔드포인트가 없다(AGENTS.md
 * "네이버 카페 오픈API의 구조적 한계" 참고) — 그래서 이미 게시된 글의 "다시 등록"은 기존
 * 글을 고치는 게 아니라 항상 새 글을 하나 더 쓰는 것과 같다. 기존에 카페에 올라간 글은
 * 그대로 남고, 이 액션은 우리 쪽 레코드 최신 내용으로 새 글을 게시해 그 결과(articleUrl 등)로
 * 덮어쓴다 — 화면(PostEditForm)에서 이 사실을 미리 안내한다.
 */
export async function updateAndRepublishPostAction(
  _prevState: PostActionState,
  formData: FormData,
): Promise<PostActionState> {
  const postId = String(formData.get("postId") ?? "");
  const parsed = parseDraftForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }

  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { title, content, targetId, imageUrl, videoUrl } = parsed.data;

  const { data: existing } = await supabase
    .from("ncafe_posts")
    .select("status")
    .eq("id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    return { error: "게시글을 찾을 수 없습니다." };
  }
  if (existing.status === "publishing") {
    return { error: "게시가 진행 중입니다. 완료된 뒤 다시 시도해주세요." };
  }
  if (!targetId) {
    return { error: "등록할 카페를 선택해주세요." };
  }

  const { error: updateError } = await supabase
    .from("ncafe_posts")
    .update({
      title,
      content,
      target_id: targetId,
      image_url: imageUrl || null,
      video_url: videoUrl || null,
    })
    .eq("id", postId)
    .eq("user_id", user.id);

  if (updateError) {
    return { error: updateError.message };
  }

  try {
    const credentials = await resolveNaverAppCredentials(supabase, user.id);
    const account = await getNaverAccountOrError(supabase, user.id, credentials);
    const target = await getTargetOrError(supabase, user.id, targetId);
    await publishCafePost({
      supabase,
      postId,
      userId: user.id,
      title,
      content,
      imageUrl: imageUrl || null,
      videoUrl: videoUrl || null,
      accessToken: account.access_token,
      clubId: target.club_id,
      menuId: target.menu_id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "게시에 실패했습니다.";
    await supabase.from("ncafe_posts").update({ status: "failed", error_message: message }).eq("id", postId);
  }

  revalidatePath("/posts");
  revalidatePath(`/posts/${postId}`);
  redirect(`/posts/${postId}`);
}

export async function deletePostAction(formData: FormData) {
  const postId = String(formData.get("postId"));
  const redirectTo = String(formData.get("redirectTo") ?? "/posts");
  const user = await requireProgramAccess();
  const supabase = await createClient();

  await supabase.from("ncafe_posts").delete().eq("id", postId).eq("user_id", user.id);

  revalidatePath("/posts");
  revalidatePath("/drafts");
  redirect(redirectTo);
}
