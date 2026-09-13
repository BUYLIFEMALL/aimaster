"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { getValidInstagramAccessToken } from "@/lib/actions/instagram";
import { listInstagramMedia } from "@/lib/instagram/client";
import { normalizeUrl } from "@/lib/normalizeUrl";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 인스타그램이 내려주는 media_url/thumbnail_url은 서명이 걸린 임시 CDN 링크라 시간이 지나면
 * 403을 반환한다(2026-09-13, /media 썸네일이 전부 깨져 보이는 문제의 원인). 동기화 시점에
 * 서버에서 즉시 내려받아 우리 Storage(ig-media-thumbnails, public)에 영구 저장하고, 그 공개
 * URL을 대신 반환한다 — 실패하면(네트워크 오류 등) 원본 URL을 그대로 반환해 최소한의 폴백을 둔다.
 */
async function reuploadThumbnail(
  supabase: SupabaseClient,
  userId: string,
  mediaId: string,
  sourceUrl: string | null,
): Promise<string | null> {
  if (!sourceUrl) return null;
  try {
    // 타임아웃 없이 fetch만 걸면 일부 요청이 응답 없이 계속 매달릴 때(네트워크 이슈 등)
    // Promise.all 전체가 무한정 대기하게 되어 동기화 자체가 끝나지 않는다 — 반드시
    // AbortSignal로 상한을 둔다(naver-cafe-poster의 fetchWithTimeout.ts와 동일한 이유).
    const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) return sourceUrl;
    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.includes("png") ? "png" : "jpg";
    const buffer = Buffer.from(await response.arrayBuffer());
    const path = `${userId}/${mediaId}.${ext}`;
    const { error } = await supabase.storage
      .from("ig-media-thumbnails")
      .upload(path, buffer, { contentType, upsert: true });
    if (error) return sourceUrl;
    const { data } = supabase.storage.from("ig-media-thumbnails").getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return sourceUrl;
  }
}

export interface SyncMediaState {
  error?: string;
  syncedCount?: number;
}

/**
 * 계정의 게시물/릴스 목록을 가져와 ig_media에 upsert한다. 신규 게시물은
 * is_monitored=true(기본 전체 모니터링)로 등록되고, 이미 있던 게시물은 캡션/썸네일만 갱신된다
 * (기존에 사용자가 꺼둔 is_monitored 값은 건드리지 않음).
 */
export async function syncMediaAction(): Promise<SyncMediaState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: account } = await supabase
    .from("ig_accounts")
    .select("access_token, token_expires_at, ig_user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!account) return { error: "인스타그램 계정이 연결되어 있지 않습니다." };

  try {
    const accessToken = await getValidInstagramAccessToken(supabase, user.id, account);

    // 이미 우리 Storage(ig-media-thumbnails)로 재호스팅된 썸네일은 동기화할 때마다 매번
    // 다시 내려받지 않는다 — 그렇지 않으면 게시물이 많은 계정은 "동기화" 버튼을 누를 때마다
    // 수백 장을 전부 재다운로드하게 되어 매번 몇 분씩 걸리게 된다(2026-09-13 확인).
    const { data: existingRows } = await supabase
      .from("ig_media")
      .select("ig_media_id, thumbnail_url")
      .eq("user_id", user.id);
    const existingThumbnails = new Map((existingRows ?? []).map((r) => [r.ig_media_id, r.thumbnail_url]));

    let syncedCount = 0;
    let pageToken: string | undefined;
    do {
      const { media, nextPageToken } = await listInstagramMedia(accessToken, account.ig_user_id, pageToken);
      if (media.length > 0) {
        const rows = await Promise.all(
          media.map(async (m) => {
            const existingThumbnail = existingThumbnails.get(m.mediaId);
            const alreadyMigrated = existingThumbnail && !existingThumbnail.includes("cdninstagram.com");
            return {
              user_id: user.id,
              ig_media_id: m.mediaId,
              caption: m.caption,
              permalink: m.permalink,
              media_type: m.mediaType,
              thumbnail_url: alreadyMigrated
                ? existingThumbnail
                : await reuploadThumbnail(supabase, user.id, m.mediaId, m.thumbnailUrl),
              updated_at: new Date().toISOString(),
            };
          }),
        );
        const { error } = await supabase.from("ig_media").upsert(rows, {
          onConflict: "user_id,ig_media_id",
          ignoreDuplicates: false,
        });
        if (error) return { error: error.message };
        syncedCount += media.length;
      }
      pageToken = nextPageToken ?? undefined;
    } while (pageToken);

    revalidatePath("/media");
    return { syncedCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : "게시물 동기화 중 오류가 발생했습니다.";
    if (message === "INSTAGRAM_RECONNECT_REQUIRED") {
      return { error: "인스타그램 계정 연결이 만료되었습니다. 설정 페이지에서 다시 연결해주세요." };
    }
    return { error: message };
  }
}

export async function toggleMediaMonitorAction(mediaId: string, isMonitored: boolean) {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  await supabase
    .from("ig_media")
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
    .from("ig_media")
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
    .from("ig_media")
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
    .from("ig_media")
    .update({ is_hidden: true, is_monitored: false })
    .eq("user_id", user.id)
    .in("id", mediaIds);
  revalidatePath("/media");
}

export async function unhideMediaAction(mediaId: string) {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  await supabase
    .from("ig_media")
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
    .from("ig_media")
    .update({ custom_link: link })
    .eq("id", mediaId)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/media");
  return {};
}
