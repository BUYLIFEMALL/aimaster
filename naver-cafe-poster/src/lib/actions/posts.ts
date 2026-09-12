"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProgramAccess } from "@/lib/access";
import { draftFormSchema } from "@/lib/validation";
import { publishCafePost } from "@/lib/posts/publish-core";
import { refreshNaverToken } from "@/lib/naver/client";

export interface PostActionState {
  error?: string;
  success?: boolean;
}

/**
 * 네이버 access token은 발급 후 약 1시간이면 만료된다 — 게시 직전에 만료(또는 임박) 여부를
 * 확인해서 필요하면 refresh_token으로 갱신하고 DB에도 반영한다. 이 확인 없이 저장된
 * access_token을 그대로 쓰면, 연결한 지 1시간이 지난 뒤 게시할 때 401 "Authentication failed"로
 * 실패한다(2026-09-12, 실계정 게시 시도에서 재현·확인한 실제 원인).
 */
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

  const expiresAt = data.token_expires_at ? new Date(data.token_expires_at).getTime() : 0;
  const isExpiringSoon = expiresAt - Date.now() < 5 * 60 * 1000; // 5분 여유를 두고 미리 갱신

  if (!isExpiringSoon) {
    return data;
  }

  if (!data.refresh_token) {
    throw new Error("네이버 로그인이 만료되었습니다. 설정 페이지에서 네이버 계정을 다시 연결해주세요.");
  }

  // 네이버 로그인 서버 호출이 간헐적으로 "Gateway Timeout" 같은 원시 네트워크 오류로 실패하는
  // 현상을 실계정 게시 시도에서 재현했다(2026-09-12) — 카페 글쓰기 API 재시도(publish-core.ts)와
  // 동일하게 한 번 더 시도해본다.
  let refreshed: Awaited<ReturnType<typeof refreshNaverToken>> | undefined;
  let refreshError: unknown;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      refreshed = await refreshNaverToken(data.refresh_token);
      refreshError = undefined;
      break;
    } catch (err) {
      refreshError = err;
    }
  }
  if (!refreshed) {
    const rawMessage = refreshError instanceof Error ? refreshError.message : "알 수 없는 오류가 발생했습니다.";
    throw new Error(
      rawMessage.startsWith("네이버 토큰 갱신에 실패했습니다")
        ? rawMessage
        : `네이버 로그인 서버 응답이 지연되어 토큰 갱신에 실패했습니다 (${rawMessage}). 잠시 후 다시 시도해주세요.`,
    );
  }
  const expiresInSeconds = Number(refreshed.expires_in);
  const tokenExpiresAt = Number.isFinite(expiresInSeconds)
    ? new Date(Date.now() + expiresInSeconds * 1000).toISOString()
    : null;

  const { error: updateError } = await supabase
    .from("ncafe_accounts")
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token ?? data.refresh_token,
      token_expires_at: tokenExpiresAt,
    })
    .eq("user_id", userId);

  if (updateError) throw new Error(updateError.message);

  return {
    ...data,
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token ?? data.refresh_token,
    token_expires_at: tokenExpiresAt,
  };
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
