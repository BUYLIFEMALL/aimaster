"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProgramAccess } from "@/lib/access";
import { postFormSchema } from "@/lib/validation";
import { publishCafePost } from "@/lib/posts/publish-core";

export interface PostActionState {
  error?: string;
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

function parsePostForm(formData: FormData) {
  return postFormSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    targetId: formData.get("targetId"),
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
  const { title, content, targetId } = parsed.data;

  const { data: inserted, error } = await supabase
    .from("ncafe_posts")
    .insert({
      user_id: user.id,
      target_id: targetId,
      title,
      content,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { error: error?.message ?? "게시글 저장에 실패했습니다." };
  }

  try {
    const account = await getNaverAccountOrError(supabase, user.id);
    const target = await getTargetOrError(supabase, user.id, targetId);
    await publishCafePost({
      supabase,
      postId: inserted.id,
      userId: user.id,
      title,
      content,
      accessToken: account.access_token,
      clubId: target.club_id,
      menuId: target.menu_id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "게시에 실패했습니다.";
    await supabase.from("ncafe_posts").update({ status: "failed", error_message: message }).eq("id", inserted.id);
  }

  revalidatePath("/posts");
  redirect(`/posts/${inserted.id}`);
}

export async function retryPublishAction(formData: FormData) {
  const postId = String(formData.get("postId"));
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("ncafe_posts")
    .select("*")
    .eq("id", postId)
    .eq("user_id", user.id)
    .single();

  if (!post || !post.target_id) {
    redirect("/posts");
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
  const user = await requireProgramAccess();
  const supabase = await createClient();

  await supabase.from("ncafe_posts").delete().eq("id", postId).eq("user_id", user.id);

  revalidatePath("/posts");
  redirect("/posts");
}
