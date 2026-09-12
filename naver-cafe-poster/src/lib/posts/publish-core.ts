import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { createCafeArticle } from "@/lib/naver/client";

interface PublishCafePostParams {
  supabase: SupabaseClient<Database>;
  postId: string;
  userId: string;
  title: string;
  content: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  accessToken: string;
  clubId: string;
  menuId: string;
}

interface PublishPostOutcome {
  success: boolean;
  errorMessage?: string;
}

export async function publishCafePost(params: PublishCafePostParams): Promise<PublishPostOutcome> {
  const { supabase, postId, userId, title, content, imageUrl, videoUrl, accessToken, clubId, menuId } = params;

  await supabase
    .from("ncafe_posts")
    .update({ status: "publishing", error_message: null })
    .eq("id", postId)
    .eq("user_id", userId);

  // 네이버 카페 글쓰기 오픈API가 본문 안에서 이미지/영상 URL을 실제 미디어로 렌더링해주는지
  // 아직 확인 못 했다(공식 문서 접근 불가) — 우선 본문 맨 위에 URL 한 줄로 덧붙이는
  // 최선의 시도로 넣고, 실계정 첫 배포 후 실제로 렌더링되는지 확인해서 필요하면
  // API 파라미터(예: contentType=HTML, <img>/<video> 태그)를 다시 조정할 것.
  // 이미지/영상은 UI에서 서로 배타적으로 관리되므로 동시에 둘 다 값이 있을 일은 없다.
  const mediaUrl = imageUrl || videoUrl;
  const bodyWithMedia = mediaUrl ? `${mediaUrl}\n\n${content}` : content;

  try {
    const result = await createCafeArticle({ accessToken, clubId, menuId, subject: title, content: bodyWithMedia });

    await supabase
      .from("ncafe_posts")
      .update({
        status: "published",
        raw_response: result.rawResponse as never,
        error_message: null,
      })
      .eq("id", postId)
      .eq("user_id", userId);

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";

    await supabase
      .from("ncafe_posts")
      .update({
        status: "failed",
        error_message: errorMessage,
      })
      .eq("id", postId)
      .eq("user_id", userId);

    return { success: false, errorMessage };
  }
}
