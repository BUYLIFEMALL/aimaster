import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { publishThreadsPost } from "@/lib/threads/client";

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
    // imageUrl에 쉼표(,)로 연결된 여러 개의 URL이 존재하거나 imageUrls 배열이 주어진 경우 캐러셀 목록으로 파싱
    let parsedImageUrls: string[] = [];
    if (imageUrls && imageUrls.length > 0) {
      parsedImageUrls = imageUrls;
    } else if (imageUrl && imageUrl.includes(",")) {
      parsedImageUrls = imageUrl.split(",").map((url) => url.trim()).filter(Boolean);
    }

    const { threadsPostId, permalink } = await publishThreadsPost({
      accessToken,
      threadsUserId,
      text: content,
      imageUrl: parsedImageUrls.length > 0 ? null : imageUrl,
      videoUrl,
      imageUrls: parsedImageUrls.length > 0 ? parsedImageUrls : null,
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
