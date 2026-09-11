"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProgramAccess } from "@/lib/access";
import { draftFormSchema } from "@/lib/validation";
import { publishCafePost } from "@/lib/posts/publish-core";

export interface PostActionState {
  error?: string;
  success?: boolean;
}

async function getNaverAccountOrError(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("ncafe_accounts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("먼저 네이버 계정을 연결해주세요.");
  return data;
}

async function getTargetOrError(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  targetId: string,
) {
  const { data, error } = await supabase
    .from("ncafe_targets")
    .select("*")
    .eq("id", targetId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("등록된 카페 정보를 찾을 수 없습니다.");
  return data;
}

function parseDraftForm(formData: FormData) {
  return draftFormSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    targetId: formData.get("targetId") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
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
  const { title, content, targetId, imageUrl } = parsed.data;

  const { error } = await supabase.from("ncafe_posts").insert({
    user_id: user.id,
    target_id: targetId || null,
    title,
    content,
    image_url: imageUrl || null,
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
  const { title, content, targetId, imageUrl } = parsed.data;

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
    .update({ title, content, target_id: targetId || null, image_url: imageUrl || null })
    .eq("id", postId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/drafts");
  return { success: true };
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
    const account = await getNaverAccountOrError(supabase, user.id);
    const target = await getTargetOrError(supabase, user.id, post.target_id);
    await publishCafePost({
      supabase,
      postId: post.id,
      userId: user.id,
      title: post.title,
      content: post.content,
      imageUrl: post.image_url,
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
