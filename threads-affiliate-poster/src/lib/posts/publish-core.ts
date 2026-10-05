import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { publishThreadsPost } from "@/lib/threads/client";

import { isVideoUrl } from "@/lib/mediaRetention";

interface PublishPostParams {
  supabase: SupabaseClient<Database>;
  postId: string;
  userId: string;
  content: string;
  imageUrl: string | null;
  videoUrl: string | null;
  imageUrls?: string[] | null;
  threadsUserId: string;
  accessToken: string;
}

interface PublishPostOutcome {
  success: boolean;
  errorMessage?: string;
}

// posts/accounts 테이블 RLS를 우회해야 하는 예약 게시 배치와, 사용자 세션으로
// 실행되는 즉시 게시 양쪽에서 재사용하는 게시 처리 로직입니다.
export async function publishPost(params: PublishPostParams): Promise<PublishPostOutcome> {
  const { supabase, postId, userId, content, imageUrl, videoUrl, imageUrls, threadsUserId, accessToken } = params;

  await supabase
    .from("tap_posts")
    .update({ status: "publishing", error_message: null })
    .eq("id", postId)
    .eq("user_id", userId);

  try {
    // 모든 이미지 및 비디오 URL 수집 및 미디어 아이템 구성 (혼합 캐러셀 지원)
    const rawUrls: string[] = [];
    if (imageUrls && imageUrls.length > 0) {
      rawUrls.push(...imageUrls);
    } else if (imageUrl) {
      rawUrls.push(...imageUrl.split(",").map((url) => url.trim()).filter(Boolean));
    }
    if (videoUrl) {
      const vUrls = videoUrl.split(",").map((url) => url.trim()).filter(Boolean);
      for (const v of vUrls) {
        if (!rawUrls.includes(v)) rawUrls.push(v);
      }
    }

    const mediaItems: Array<{ url: string; type: "IMAGE" | "VIDEO" }> = rawUrls.map((url) => ({
      url,
      type: isVideoUrl(url) ? "VIDEO" : "IMAGE",
    }));

    const { threadsPostId, permalink } = await publishThreadsPost({
      accessToken,
      threadsUserId,
      text: content,
      mediaItems: mediaItems.length > 0 ? mediaItems : null,
      imageUrl: mediaItems.length === 1 && mediaItems[0].type === "IMAGE" ? mediaItems[0].url : null,
      videoUrl: mediaItems.length === 1 && mediaItems[0].type === "VIDEO" ? mediaItems[0].url : null,
    });

    await supabase
      .from("tap_posts")
      .update({
        status: "published",
        threads_post_id: threadsPostId,
        threads_permalink: permalink,
        error_message: null,
      })
      .eq("id", postId)
      .eq("user_id", userId);

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";

    await supabase
      .from("tap_posts")
      .update({
        status: "failed",
        error_message: errorMessage,
      })
      .eq("id", postId)
      .eq("user_id", userId);

    return { success: false, errorMessage };
  }
}
