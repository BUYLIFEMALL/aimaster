"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { getValidThreadsAccessToken } from "@/lib/actions/threads";
import { listThreadsPosts } from "@/lib/threads/client";
import { normalizeUrl } from "@/lib/normalizeUrl";

export interface SyncMediaState {
  error?: string;
  syncedCount?: number;
}

/**
 * 계정의 게시물/릴스 목록을 가져와 th_posts에 upsert한다. 신규 게시물은
 * is_monitored=true(기본 전체 모니터링)로 등록되고, 이미 있던 게시물은 캡션/썸네일만 갱신된다
 * (기존에 사용자가 꺼둔 is_monitored 값은 건드리지 않음).
 */
export async function syncMediaAction(): Promise<SyncMediaState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: account } = await supabase
    .from("th_accounts")
    .select("access_token, token_expires_at, threads_user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!account) return { error: "쓰레드 계정이 연결되어 있지 않습니다." };

  try {
    const accessToken = await getValidThreadsAccessToken(supabase, user.id, account);

    let syncedCount = 0;
    let pageToken: string | undefined;
    do {
      const { posts, nextPageToken } = await listThreadsPosts(accessToken, account.threads_user_id, pageToken);
      if (posts.length > 0) {
        const { error } = await supabase.from("th_posts").upsert(
          posts.map((p) => ({
            user_id: user.id,
            threads_post_id: p.postId,
            text: p.text,
            permalink: p.permalink,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: "user_id,threads_post_id", ignoreDuplicates: false },
        );
        if (error) return { error: error.message };
        syncedCount += posts.length;
      }
      pageToken = nextPageToken ?? undefined;
    } while (pageToken);

    revalidatePath("/media");
    return { syncedCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : "게시물 동기화 중 오류가 발생했습니다.";
    if (message === "THREADS_RECONNECT_REQUIRED") {
      return { error: "쓰레드 계정 연결이 만료되었습니다. 설정 페이지에서 다시 연결해주세요." };
    }
    return { error: message };
  }
}

export async function toggleMediaMonitorAction(mediaId: string, isMonitored: boolean) {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  await supabase
    .from("th_posts")
    .update({ is_monitored: isMonitored })
    .eq("id", mediaId)
    .eq("user_id", user.id);
  revalidatePath("/media");
}

/** 목록에서 숨긴다(삭제는 아님 — 재동기화 때 다시 나타나지 않도록 플래그만 켠다).
 * 숨기면서 모니터링도 함께 꺼서, 나중에 다시 보이게 해도 자동으로 켜져있지 않게 한다. */
export async function hideMediaAction(mediaId: string) {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  await supabase
    .from("th_posts")
    .update({ is_hidden: true, is_monitored: false })
    .eq("id", mediaId)
    .eq("user_id", user.id);
  revalidatePath("/media");
}

/** 체크박스로 선택한 여러 게시물의 모니터링을 한 번에 켜거나 끈다. */
export async function bulkSetMonitorAction(mediaIds: string[], isMonitored: boolean) {
  const user = await requireProgramAccess();
  if (mediaIds.length === 0) return;
  const supabase = await createClient();
  await supabase
    .from("th_posts")
    .update({ is_monitored: isMonitored })
    .eq("user_id", user.id)
    .in("id", mediaIds);
  revalidatePath("/media");
}

/** 체크박스로 선택한 여러 게시물을 한 번에 숨긴다. */
export async function bulkHideAction(mediaIds: string[]) {
  const user = await requireProgramAccess();
  if (mediaIds.length === 0) return;
  const supabase = await createClient();
  await supabase
    .from("th_posts")
    .update({ is_hidden: true, is_monitored: false })
    .eq("user_id", user.id)
    .in("id", mediaIds);
  revalidatePath("/media");
}

export async function unhideMediaAction(mediaId: string) {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  await supabase
    .from("th_posts")
    .update({ is_hidden: false })
    .eq("id", mediaId)
    .eq("user_id", user.id);
  revalidatePath("/media");
}

export interface SetMediaLinkState {
  error?: string;
}

export async function setMediaLinkAction(formData: FormData): Promise<SetMediaLinkState> {
  const user = await requireProgramAccess();
  const mediaId = String(formData.get("mediaId") ?? "");
  const link = normalizeUrl(String(formData.get("link") ?? ""));
  if (!mediaId) return { error: "mediaId가 없습니다." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("th_posts")
    .update({ custom_link: link })
    .eq("id", mediaId)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/media");
  return {};
}
